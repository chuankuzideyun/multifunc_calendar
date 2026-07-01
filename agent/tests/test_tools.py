import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add parent directory to path so concierge_agent can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set dummy env variables for safe module loading/testing
os.environ["ENCRYPTION_KEY"] = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
os.environ["DATABASE_URL"] = "postgresql://localhost/dummy"
os.environ["GOOGLE_CLIENT_ID"] = "dummy_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "dummy_client_secret"
os.environ["OPENWEATHERMAP_API_KEY"] = "dummy_weather_key"

from concierge_agent.tools.gmail_tools import fetch_gmail_events
from concierge_agent.tools.calendar_tools import list_calendar_events, create_calendar_event
from concierge_agent.tools.weather_tools import get_weekend_weather

class TestTools(unittest.TestCase):

    @patch('concierge_agent.tools.gmail_tools.current_user_id')
    @patch('concierge_agent.tools.gmail_tools.get_user_google_credentials')
    @patch('concierge_agent.tools.gmail_tools.get_google_service')
    def test_fetch_gmail_events_success(self, mock_get_service, mock_get_creds, mock_user_id):
        mock_user_id.get.return_value = "user-123"
        mock_get_creds.return_value = {"refresh_token": "dummy_token"}
        
        mock_gmail = MagicMock()
        mock_get_service.return_value = mock_gmail
        
        # Mock messages.list()
        mock_list_req = MagicMock()
        mock_list_req.execute.return_value = {
            "messages": [{"id": "msg123"}]
        }
        mock_gmail.users().messages().list.return_value = mock_list_req
        
        # Mock messages.get()
        mock_get_req = MagicMock()
        mock_get_req.execute.return_value = {
            "id": "msg123",
            "payload": {
                "headers": [
                    {"name": "Subject", "value": "Project Review Meeting"},
                    {"name": "Date", "value": "Wed, 1 Jul 2026 12:00:00 +0200"}
                ],
                "parts": [
                    {
                        "mimeType": "text/plain",
                        "body": {
                            "data": "SGksIHBsZWFzZSBqb2luIHRoZSBwcm9qZWN0IHJldmlldyBtZWV0aW5nIHRvbW9ycm93IGF0IDM6MDAgUE0u"
                        }
                    }
                ]
            }
        }
        mock_gmail.users().messages().get.return_value = mock_get_req
        
        res = fetch_gmail_events()
        self.assertEqual(res["status"], "success")
        self.assertEqual(len(res["events"]), 1)
        self.assertEqual(res["events"][0]["email_id"], "msg123")
        self.assertEqual(res["events"][0]["suggested_title"], "Project Review Meeting")

    @patch('concierge_agent.tools.gmail_tools.get_user_google_credentials')
    def test_fetch_gmail_events_error(self, mock_get_creds):
        # Force a database error
        mock_get_creds.side_effect = Exception("DB Connection Failed")
        
        res = fetch_gmail_events()
        self.assertEqual(res["status"], "error")
        self.assertIn("DB Connection Failed", res["message"])

    @patch('concierge_agent.tools.calendar_tools.current_user_id')
    @patch('concierge_agent.tools.calendar_tools.get_user_google_credentials')
    @patch('concierge_agent.tools.calendar_tools.get_google_service')
    def test_list_calendar_events_success(self, mock_get_service, mock_get_creds, mock_user_id):
        mock_user_id.get.return_value = "user-123"
        mock_get_creds.return_value = {"refresh_token": "dummy_token"}
        
        mock_calendar = MagicMock()
        mock_get_service.return_value = mock_calendar
        
        mock_list_req = MagicMock()
        mock_list_req.execute.return_value = {
            "items": [{"id": "event1", "summary": "Team Sync"}]
        }
        mock_calendar.events().list.return_value = mock_list_req
        
        res = list_calendar_events("2026-07-01T00:00:00Z", "2026-07-02T00:00:00Z")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["events"][0]["summary"], "Team Sync")

    @patch('concierge_agent.tools.calendar_tools.get_user_google_credentials')
    def test_list_calendar_events_error(self, mock_get_creds):
        mock_get_creds.side_effect = Exception("OAuth Token Refresh Failed")
        res = list_calendar_events("2026-07-01T00:00:00Z", "2026-07-02T00:00:00Z")
        self.assertEqual(res["status"], "error")
        self.assertIn("OAuth Token Refresh Failed", res["message"])

    @patch('concierge_agent.tools.calendar_tools.current_user_id')
    @patch('concierge_agent.tools.calendar_tools.get_user_google_credentials')
    @patch('concierge_agent.tools.calendar_tools.get_google_service')
    def test_create_calendar_event_success(self, mock_get_service, mock_get_creds, mock_user_id):
        mock_user_id.get.return_value = "user-123"
        mock_get_creds.return_value = {"refresh_token": "dummy_token"}
        
        mock_calendar = MagicMock()
        mock_get_service.return_value = mock_calendar
        
        mock_insert_req = MagicMock()
        mock_insert_req.execute.return_value = {
            "id": "new_event_123",
            "summary": "Lunch with client"
        }
        mock_calendar.events().insert.return_value = mock_insert_req
        
        res = create_calendar_event(
            title="Lunch with client",
            start="2026-07-02T12:00:00Z",
            end="2026-07-02T13:00:00Z",
            description="Discussing contract",
            location="Office"
        )
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["event"]["summary"], "Lunch with client")

    @patch('concierge_agent.tools.calendar_tools.get_user_google_credentials')
    def test_create_calendar_event_error(self, mock_get_creds):
        mock_get_creds.side_effect = Exception("Google Calendar insert error")
        res = create_calendar_event("Lunch", "2026-07-02T12:00:00Z", "2026-07-02T13:00:00Z")
        self.assertEqual(res["status"], "error")
        self.assertIn("Google Calendar insert error", res["message"])

    @patch('concierge_agent.tools.weather_tools.requests.get')
    def test_get_weekend_weather_success(self, mock_get):
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "city": {"timezone": 0},
            "list": [
                {
                    # Use a timestamp that is on a weekend
                    "dt": 1783238400,
                    "main": {"temp": 22.0},
                    "weather": [{"main": "Clear", "description": "clear sky"}],
                    "pop": 0.1
                },
                {
                    "dt": 1783324800,
                    "main": {"temp": 18.0},
                    "weather": [{"main": "Clouds", "description": "few clouds"}],
                    "pop": 0.0
                }
            ]
        }
        mock_get.return_value = mock_res
        
        res = get_weekend_weather("London")
        self.assertEqual(res["status"], "success")
        self.assertIn("saturday", res)
        self.assertIn("sunday", res)
        self.assertIn("recommendation", res)

    @patch('concierge_agent.tools.weather_tools.requests.get')
    def test_get_weekend_weather_error(self, mock_get):
        mock_res = MagicMock()
        mock_res.status_code = 401
        mock_res.text = "Unauthorized Key"
        mock_get.return_value = mock_res
        
        res = get_weekend_weather("London")
        self.assertEqual(res["status"], "error")
        self.assertIn("OpenWeatherMap API returned status 401", res["message"])

if __name__ == "__main__":
    unittest.main()

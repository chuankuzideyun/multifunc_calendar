import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import os
import sys

# Add parent directory to path so agent can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set dummy env variables for safe module loading/testing
os.environ["ENCRYPTION_KEY"] = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
os.environ["DATABASE_URL"] = "postgresql://localhost/dummy"
os.environ["GOOGLE_CLIENT_ID"] = "dummy_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "dummy_client_secret"
os.environ["OPENWEATHERMAP_API_KEY"] = "dummy_weather_key"

from fastapi.testclient import TestClient
from server import app
from google.genai.errors import ClientError
from google.adk.models.google_llm import _ResourceExhaustedError

class TestServerRateLimit(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("server.runner.run_async")
    def test_chat_rate_limit(self, mock_run_async):
        # Setup _ResourceExhaustedError
        ce = ClientError(code=429, response_json={"error": {"message": "Resource has been exhausted"}})
        err = _ResourceExhaustedError(ce)
        
        # runner.run_async is an async generator.
        # When we iterate, it should raise _ResourceExhaustedError.
        async def mock_generator(*args, **kwargs):
            raise err
            yield  # Make it a generator

        mock_run_async.side_effect = mock_generator

        response = self.client.post(
            "/chat",
            json={
                "message": "Hello",
                "user_id": "user-123",
                "session_id": "session-123"
            }
        )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(
            response.json(),
            {
                "error": "rate_limited",
                "message": "AI 服务繁忙，请稍后重试",
                "retry_after": 40
            }
        )

    @patch("server.runner.run_async")
    def test_chat_stream_rate_limit(self, mock_run_async):
        # Setup _ResourceExhaustedError
        ce = ClientError(code=429, response_json={"error": {"message": "Resource has been exhausted"}})
        err = _ResourceExhaustedError(ce)
        
        async def mock_generator(*args, **kwargs):
            raise err
            yield

        mock_run_async.side_effect = mock_generator

        response = self.client.post(
            "/chat/stream",
            json={
                "message": "Hello",
                "user_id": "user-123",
                "session_id": "session-123"
            }
        )

        # For stream response, the headers are returned with 200 first, 
        # and then the generator yields the error event.
        self.assertEqual(response.status_code, 200)
        
        # Read the stream content
        body = response.text
        self.assertIn("rate_limited", body)
        self.assertIn("AI 服务繁忙，请稍后重试", body)

if __name__ == "__main__":
    unittest.main()

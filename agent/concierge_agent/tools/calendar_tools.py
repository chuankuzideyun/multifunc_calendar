from ..context import current_user_id
from ..utils import get_user_google_credentials, get_google_service

def list_calendar_events(start_date: str, end_date: str) -> dict:
    """
    Retrieve the user's upcoming calendar events for a given date range.
    
    Args:
        start_date: Start time of range in ISO 8601 format (e.g., '2026-07-01T00:00:00Z').
        end_date: End time of range in ISO 8601 format (e.g., '2026-07-08T00:00:00Z').
        
    Returns:
        dict: A dictionary containing:
            - status (str): "success" or "error"
            - events (list[dict]): List of calendar events in the range.
    """
    try:
        user_id = current_user_id.get()
        creds_info = get_user_google_credentials(user_id)
        calendar_service = get_google_service("calendar", "v3", creds_info["refresh_token"])
        
        events_result = calendar_service.events().list(
            calendarId='primary',
            timeMin=start_date,
            timeMax=end_date,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        return {
            "status": "success",
            "events": events
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

def create_calendar_event(
    title: str,
    start: str,
    end: str,
    description: str = "",
    location: str = ""
) -> dict:
    """
    Create a new event in the user's Google Calendar.
    
    Args:
        title: The title of the event (e.g., 'Dentist appointment', 'Lunch with friends').
        start: The start time of the event in ISO 8601 format.
        end: The end time of the event in ISO 8601 format.
        description: Description or details of the event. Optional.
        location: The location or venue. Optional.
        
    Returns:
        dict: A dictionary containing:
            - status (str): "success" or "error"
            - event (dict): The created event details.
    """
    try:
        user_id = current_user_id.get()
        creds_info = get_user_google_credentials(user_id)
        calendar_service = get_google_service("calendar", "v3", creds_info["refresh_token"])
        
        event_body = {
            "summary": title,
            "description": description,
            "location": location,
            "start": {
                "dateTime": start,
            },
            "end": {
                "dateTime": end,
            },
            "extendedProperties": {
                "private": {
                    "source": "concierge-agent"
                }
            }
        }
        
        created_event = calendar_service.events().insert(
            calendarId='primary',
            body=event_body
        ).execute()
        
        return {
            "status": "success",
            "event": created_event
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

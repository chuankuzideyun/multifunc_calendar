from .gmail_tools import fetch_gmail_events
from .calendar_tools import create_calendar_event, list_calendar_events
from .weather_tools import get_weekend_weather

ALL_TOOLS = [
    fetch_gmail_events,
    create_calendar_event,
    list_calendar_events,
    get_weekend_weather,
]

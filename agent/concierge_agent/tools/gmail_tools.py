import re
import base64
from ..context import current_user_id
from ..utils import get_user_google_credentials, get_google_service

def clean_html(text: str) -> str:
    """
    Strips script tags, style tags, and other HTML tags to produce clean body text.
    """
    text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def get_email_body(payload) -> str:
    """
    Recursively extracts the body text from nested parts of a Gmail payload.
    """
    body = ""
    if "parts" in payload:
        for part in payload["parts"]:
            body += get_email_body(part)
    else:
        mime_type = payload.get("mimeType", "")
        if mime_type in ["text/plain", "text/html"]:
            data = payload.get("body", {}).get("data", "")
            if data:
                try:
                    decoded = base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="ignore")
                    body += decoded
                except Exception:
                    pass
    return body

def fetch_gmail_events(days_back: int = 7) -> dict:
    """
    Scan the user's Gmail inbox for emails containing schedule information
    such as meeting invitations, booking confirmations, or appointment reminders
    from the past N days.
    
    Args:
        days_back: Number of days to look back in Gmail. Default is 7.
        
    Returns:
        dict: A dictionary containing:
            - status (str): "success" or "error"
            - events (list[dict]): A list of extracted schedule items. Each item has keys:
              'email_id', 'subject', 'extracted_snippet', 'suggested_title', and 'suggested_time'.
    """
    try:
        user_id = current_user_id.get()
        creds_info = get_user_google_credentials(user_id)
        gmail_service = get_google_service("gmail", "v1", creds_info["refresh_token"])
        
        # Construct search query
        query = f"subject:(meeting OR booking OR reservation OR invite OR confirm OR schedule OR appointment) newer_than:{days_back}d"
        
        results = gmail_service.users().messages().list(userId="me", q=query, maxResults=15).execute()
        messages = results.get("messages", [])
        
        events = []
        for msg in messages:
            msg_id = msg["id"]
            detail = gmail_service.users().messages().get(userId="me", id=msg_id, format="full").execute()
            
            payload = detail.get("payload", {})
            headers = payload.get("headers", [])
            
            subject = "(No Subject)"
            email_date = None
            for h in headers:
                name_lower = h.get("name", "").lower()
                if name_lower == "subject":
                    subject = h.get("value", "")
                elif name_lower == "date":
                    email_date = h.get("value", "")
            
            raw_body = get_email_body(payload)
            cleaned_body = clean_html(raw_body)
            extracted_snippet = cleaned_body[:500]
            
            # Simple clean heuristics for suggested title
            suggested_title = subject
            suggested_title = re.sub(r'^(Re|Fwd|Forward|Confirm):\s*', '', suggested_title, flags=re.IGNORECASE).strip()
            
            # Parse suggested time
            suggested_time = None
            if email_date:
                try:
                    from email.utils import parsedate_to_datetime
                    dt = parsedate_to_datetime(email_date)
                    suggested_time = dt.isoformat()
                except Exception:
                    pass
            
            events.append({
                "email_id": msg_id,
                "subject": subject,
                "extracted_snippet": extracted_snippet,
                "suggested_title": suggested_title,
                "suggested_time": suggested_time
            })
            
        return {
            "status": "success",
            "events": events
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

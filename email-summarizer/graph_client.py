"""
Microsoft Graph API client for fetching Outlook emails.
"""

from datetime import datetime, timedelta, timezone

import requests

from config import DEFAULT_DAYS_BACK, DEFAULT_EMAIL_COUNT, GRAPH_BASE


def fetch_recent_emails(access_token, count=DEFAULT_EMAIL_COUNT, days_back=DEFAULT_DAYS_BACK):
    """
    Fetch recent emails from Outlook inbox.

    Args:
        access_token: Valid MS Graph access token
        count: Max number of emails to fetch
        days_back: Only fetch emails from the last N days

    Returns:
        List of email dicts with parsed fields
    """
    headers = {"Authorization": f"Bearer {access_token}"}

    since = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    params = {
        "$top": count,
        "$orderby": "receivedDateTime desc",
        "$filter": f"receivedDateTime ge {since}",
        "$select": "subject,from,receivedDateTime,bodyPreview,isRead,importance,hasAttachments,categories",
    }

    response = requests.get(
        f"{GRAPH_BASE}/me/messages",
        headers=headers,
        params=params,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    emails = []

    for msg in data.get("value", []):
        from_info = msg.get("from", {}).get("emailAddress", {})
        emails.append({
            "subject": msg.get("subject", "(no subject)"),
            "from_name": from_info.get("name", "Unknown"),
            "from_email": from_info.get("address", ""),
            "received": msg.get("receivedDateTime", ""),
            "preview": msg.get("bodyPreview", ""),
            "is_read": msg.get("isRead", False),
            "importance": msg.get("importance", "normal"),
            "has_attachments": msg.get("hasAttachments", False),
            "categories": msg.get("categories", []),
        })

    return emails

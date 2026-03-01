"""
Email summarization and grouping logic.
Categorizes emails by sender/topic and produces readable summaries.
"""

from collections import defaultdict
from datetime import datetime

from dateutil import parser as dateparser


def _parse_date(date_str):
    """Parse ISO date string into readable format."""
    try:
        dt = dateparser.isoparse(date_str)
        return dt.strftime("%b %d, %I:%M %p")
    except (ValueError, TypeError):
        return date_str


def _classify_email(email):
    """
    Classify an email into a business category based on sender/subject.
    Returns a category string.
    """
    subject = (email["subject"] or "").lower()
    from_email = (email["from_email"] or "").lower()
    preview = (email["preview"] or "").lower()

    # Subcontractor / trade related
    trade_keywords = [
        "quote", "bid", "rfq", "estimate", "pricing",
        "invoice", "payment", "sub", "trade",
    ]
    if any(kw in subject or kw in preview for kw in trade_keywords):
        return "Quotes & Bids"

    # Project / construction
    project_keywords = [
        "project", "site", "inspection", "permit", "schedule",
        "buildertrend", "construction", "foundation", "framing",
    ]
    if any(kw in subject or kw in preview for kw in project_keywords):
        return "Projects & Site"

    # Client communication
    client_keywords = ["client", "homeowner", "owner", "customer", "meeting"]
    if any(kw in subject or kw in preview for kw in client_keywords):
        return "Client Communication"

    # Marketing / leads
    marketing_keywords = [
        "hubspot", "lead", "marketing", "social", "campaign",
        "instagram", "linkedin", "facebook",
    ]
    if any(kw in subject or kw in preview for kw in marketing_keywords):
        return "Marketing & Leads"

    # Finance
    finance_keywords = ["hst", "tax", "accounting", "bank", "payroll"]
    if any(kw in subject or kw in preview for kw in finance_keywords):
        return "Finance"

    # Newsletters / automated
    auto_keywords = ["unsubscribe", "newsletter", "digest", "notification"]
    if any(kw in subject or kw in preview for kw in auto_keywords):
        return "Newsletters & Automated"

    return "General"


def summarize_emails(emails):
    """
    Take a list of email dicts and produce a structured summary.

    Returns:
        dict with:
          - total: int
          - unread: int
          - high_priority: list of emails marked important
          - categories: dict of category -> list of email summaries
          - action_items: list of emails that likely need a response
    """
    unread = [e for e in emails if not e["is_read"]]
    high_priority = [e for e in emails if e["importance"] == "high"]

    # Group by category
    categories = defaultdict(list)
    for email in emails:
        cat = _classify_email(email)
        categories[cat].append({
            "subject": email["subject"],
            "from": email["from_name"],
            "from_email": email["from_email"],
            "date": _parse_date(email["received"]),
            "preview": email["preview"][:200] if email["preview"] else "",
            "unread": not email["is_read"],
            "has_attachments": email["has_attachments"],
        })

    # Identify likely action items (unread + from real people + not newsletters)
    action_items = []
    for email in emails:
        if not email["is_read"] and _classify_email(email) != "Newsletters & Automated":
            action_items.append({
                "subject": email["subject"],
                "from": f"{email['from_name']} <{email['from_email']}>",
                "date": _parse_date(email["received"]),
                "preview": email["preview"][:150] if email["preview"] else "",
            })

    return {
        "total": len(emails),
        "unread": len(unread),
        "high_priority": [{
            "subject": e["subject"],
            "from": f"{e['from_name']} <{e['from_email']}>",
            "date": _parse_date(e["received"]),
        } for e in high_priority],
        "categories": dict(categories),
        "action_items": action_items,
    }

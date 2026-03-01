"""
Output formatting for email summaries.
Produces clean, readable output for console and file.
"""

from datetime import datetime


def format_summary_text(summary):
    """
    Format a summary dict into readable plain text.
    Designed to look good in a terminal and in a text file.
    """
    lines = []
    now = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    lines.append("=" * 64)
    lines.append("  HENLEY CONTRACTING — EMAIL SUMMARY")
    lines.append(f"  Generated: {now}")
    lines.append("=" * 64)
    lines.append("")

    # Quick stats
    lines.append(f"  Total emails: {summary['total']}")
    lines.append(f"  Unread:       {summary['unread']}")
    lines.append(f"  High priority: {len(summary['high_priority'])}")
    lines.append("")

    # Action items (most important section)
    if summary["action_items"]:
        lines.append("-" * 64)
        lines.append("  ACTION NEEDED")
        lines.append("-" * 64)
        for i, item in enumerate(summary["action_items"], 1):
            lines.append(f"  {i}. {item['subject']}")
            lines.append(f"     From: {item['from']}")
            lines.append(f"     Date: {item['date']}")
            if item["preview"]:
                lines.append(f"     Preview: {item['preview']}")
            lines.append("")

    # High priority
    if summary["high_priority"]:
        lines.append("-" * 64)
        lines.append("  HIGH PRIORITY")
        lines.append("-" * 64)
        for item in summary["high_priority"]:
            lines.append(f"  ! {item['subject']}")
            lines.append(f"    From: {item['from']}  |  {item['date']}")
        lines.append("")

    # By category
    lines.append("-" * 64)
    lines.append("  BY CATEGORY")
    lines.append("-" * 64)

    # Sort categories: Quotes & Bids first, Newsletters last
    priority_order = [
        "Quotes & Bids",
        "Projects & Site",
        "Client Communication",
        "Finance",
        "Marketing & Leads",
        "General",
        "Newsletters & Automated",
    ]

    sorted_cats = sorted(
        summary["categories"].items(),
        key=lambda x: priority_order.index(x[0]) if x[0] in priority_order else 99,
    )

    for cat, emails in sorted_cats:
        unread_count = sum(1 for e in emails if e["unread"])
        unread_tag = f" ({unread_count} unread)" if unread_count else ""
        lines.append("")
        lines.append(f"  [{cat}] — {len(emails)} emails{unread_tag}")
        lines.append("  " + "~" * 40)

        for email in emails:
            status = "*" if email["unread"] else " "
            attach = " [attachments]" if email["has_attachments"] else ""
            lines.append(f"  {status} {email['subject']}{attach}")
            lines.append(f"    {email['from']} ({email['from_email']})  |  {email['date']}")
            if email["preview"]:
                # Truncate preview for readability
                preview = email["preview"][:120]
                if len(email["preview"]) > 120:
                    preview += "..."
                lines.append(f"    \"{preview}\"")
            lines.append("")

    lines.append("=" * 64)
    lines.append("  End of summary")
    lines.append("=" * 64)

    return "\n".join(lines)


def format_summary_markdown(summary):
    """
    Format summary as Markdown (good for saving to OneDrive / sharing).
    """
    lines = []
    now = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    lines.append("# Henley Contracting — Email Summary")
    lines.append(f"*Generated: {now}*")
    lines.append("")
    lines.append(f"**{summary['total']}** emails | **{summary['unread']}** unread | **{len(summary['high_priority'])}** high priority")
    lines.append("")

    # Action items
    if summary["action_items"]:
        lines.append("## Action Needed")
        for i, item in enumerate(summary["action_items"], 1):
            lines.append(f"{i}. **{item['subject']}**")
            lines.append(f"   - From: {item['from']}")
            lines.append(f"   - Date: {item['date']}")
            if item["preview"]:
                lines.append(f"   - _{item['preview']}_")
            lines.append("")

    # High priority
    if summary["high_priority"]:
        lines.append("## High Priority")
        for item in summary["high_priority"]:
            lines.append(f"- **{item['subject']}** — {item['from']} ({item['date']})")
        lines.append("")

    # By category
    lines.append("## By Category")

    priority_order = [
        "Quotes & Bids",
        "Projects & Site",
        "Client Communication",
        "Finance",
        "Marketing & Leads",
        "General",
        "Newsletters & Automated",
    ]

    sorted_cats = sorted(
        summary["categories"].items(),
        key=lambda x: priority_order.index(x[0]) if x[0] in priority_order else 99,
    )

    for cat, emails in sorted_cats:
        unread_count = sum(1 for e in emails if e["unread"])
        unread_tag = f" ({unread_count} unread)" if unread_count else ""
        lines.append(f"\n### {cat} — {len(emails)} emails{unread_tag}")

        for email in emails:
            status = "**[NEW]** " if email["unread"] else ""
            attach = " (has attachments)" if email["has_attachments"] else ""
            lines.append(f"- {status}{email['subject']}{attach}")
            lines.append(f"  - {email['from']} ({email['from_email']}) | {email['date']}")
            if email["preview"]:
                preview = email["preview"][:150]
                if len(email["preview"]) > 150:
                    preview += "..."
                lines.append(f"  - _{preview}_")

    lines.append("")
    lines.append("---")
    lines.append(f"*Generated by Henley Email Summarizer*")

    return "\n".join(lines)

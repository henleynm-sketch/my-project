#!/usr/bin/env python3
"""
Henley Contracting — Email Summarizer

Fetches recent emails from Outlook (via Microsoft Graph API),
categorizes them by business context, and produces a clean summary.

Usage:
    python main.py                     # Summarize last 3 days, 25 emails
    python main.py --days 7            # Last 7 days
    python main.py --count 50          # Up to 50 emails
    python main.py --format markdown   # Output as Markdown
    python main.py --save              # Save summary to output/ directory
    python main.py --days 1 --save     # Quick daily summary, saved to file
"""

import argparse
import os
import sys
from datetime import datetime

from auth import get_access_token
from config import DEFAULT_DAYS_BACK, DEFAULT_EMAIL_COUNT, OUTPUT_DIR
from formatter import format_summary_markdown, format_summary_text
from graph_client import fetch_recent_emails
from summarizer import summarize_emails


def main():
    parser = argparse.ArgumentParser(
        description="Summarize recent Outlook emails for Henley Contracting"
    )
    parser.add_argument(
        "--days", type=int, default=DEFAULT_DAYS_BACK,
        help=f"Number of days back to fetch (default: {DEFAULT_DAYS_BACK})"
    )
    parser.add_argument(
        "--count", type=int, default=DEFAULT_EMAIL_COUNT,
        help=f"Max emails to fetch (default: {DEFAULT_EMAIL_COUNT})"
    )
    parser.add_argument(
        "--format", choices=["text", "markdown"], default="text",
        help="Output format (default: text)"
    )
    parser.add_argument(
        "--save", action="store_true",
        help="Save summary to output/ directory"
    )
    args = parser.parse_args()

    # Authenticate
    print("Connecting to Outlook...")
    token = get_access_token()

    # Fetch emails
    print(f"Fetching emails from the last {args.days} day(s)...")
    emails = fetch_recent_emails(token, count=args.count, days_back=args.days)

    if not emails:
        print("No emails found for the specified period.")
        return

    print(f"Found {len(emails)} emails. Generating summary...\n")

    # Summarize
    summary = summarize_emails(emails)

    # Format output
    if args.format == "markdown":
        output = format_summary_markdown(summary)
    else:
        output = format_summary_text(summary)

    # Print to console
    print(output)

    # Optionally save to file
    if args.save:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        ext = "md" if args.format == "markdown" else "txt"
        filename = f"email-summary-{timestamp}.{ext}"
        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, "w") as f:
            f.write(output)

        print(f"\nSummary saved to: {filepath}")


if __name__ == "__main__":
    main()

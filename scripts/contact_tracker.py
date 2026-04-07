#!/usr/bin/env python3
"""
LinkedIn Networking Contact Tracker — Henley Contracting

A simple CLI tool to track your LinkedIn outreach, follow-ups,
and referral partnerships in Oshawa, Whitby, and Kawartha Lakes.

Usage:
    python contact_tracker.py add       — Add a new contact
    python contact_tracker.py list      — List all contacts
    python contact_tracker.py followups — Show contacts due for follow-up
    python contact_tracker.py update    — Update a contact's status
    python contact_tracker.py stats     — Show outreach statistics
    python contact_tracker.py export    — Export contacts to CSV
"""

import csv
import json
import os
import sys
from datetime import datetime, timedelta

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "contacts.json")

CATEGORIES = [
    "Realtor",
    "Mortgage Broker",
    "Interior Designer",
    "Architect",
    "Trades / Subcontractor",
    "Local Business Owner",
    "Municipal / Government",
    "Past Client",
    "Potential Client",
    "Other Professional",
]

AREAS = ["Oshawa", "Whitby", "Kawartha Lakes", "Other Durham Region"]

STATUSES = [
    "Request Sent",
    "Connected",
    "Follow-Up Sent",
    "In Conversation",
    "Referral Partner",
    "Client",
    "Inactive",
]


def load_contacts():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return []


def save_contacts(contacts):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(contacts, f, indent=2)


def prompt_choice(prompt, options):
    print(f"\n{prompt}")
    for i, option in enumerate(options, 1):
        print(f"  {i}. {option}")
    while True:
        try:
            choice = int(input("Choose a number: "))
            if 1 <= choice <= len(options):
                return options[choice - 1]
        except (ValueError, EOFError):
            pass
        print("Invalid choice. Try again.")


def add_contact():
    print("\n--- Add New Contact ---")
    name = input("Full name: ").strip()
    if not name:
        print("Name is required.")
        return

    company = input("Company/Business (optional): ").strip()
    title = input("Job title (optional): ").strip()
    category = prompt_choice("Category:", CATEGORIES)
    area = prompt_choice("Area:", AREAS)
    linkedin_url = input("LinkedIn profile URL (optional): ").strip()
    notes = input("Notes (optional): ").strip()

    contact = {
        "name": name,
        "company": company,
        "title": title,
        "category": category,
        "area": area,
        "linkedin_url": linkedin_url,
        "status": "Request Sent",
        "notes": notes,
        "date_added": datetime.now().isoformat(),
        "last_contact": datetime.now().isoformat(),
        "follow_up_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
        "interactions": [
            {
                "date": datetime.now().isoformat(),
                "action": "Connection request sent",
            }
        ],
    }

    contacts = load_contacts()
    contacts.append(contact)
    save_contacts(contacts)
    print(f"\nAdded {name} ({category} in {area}). Follow-up scheduled for {contact['follow_up_date']}.")


def list_contacts():
    contacts = load_contacts()
    if not contacts:
        print("\nNo contacts yet. Use 'add' to add your first contact.")
        return

    print(f"\n--- All Contacts ({len(contacts)}) ---\n")
    print(f"{'#':<4} {'Name':<25} {'Category':<22} {'Area':<18} {'Status':<18}")
    print("-" * 90)
    for i, c in enumerate(contacts, 1):
        print(f"{i:<4} {c['name']:<25} {c['category']:<22} {c['area']:<18} {c['status']:<18}")


def show_followups():
    contacts = load_contacts()
    today = datetime.now().strftime("%Y-%m-%d")

    due = [c for c in contacts if c.get("follow_up_date", "") <= today and c["status"] != "Inactive"]

    if not due:
        print("\nNo follow-ups due today. You're all caught up!")
        return

    print(f"\n--- Follow-Ups Due ({len(due)}) ---\n")
    print(f"{'Name':<25} {'Category':<22} {'Area':<18} {'Due Date':<12} {'Status':<18}")
    print("-" * 95)
    for c in sorted(due, key=lambda x: x.get("follow_up_date", "")):
        print(f"{c['name']:<25} {c['category']:<22} {c['area']:<18} {c.get('follow_up_date', 'N/A'):<12} {c['status']:<18}")


def update_contact():
    contacts = load_contacts()
    if not contacts:
        print("\nNo contacts to update.")
        return

    list_contacts()
    try:
        idx = int(input("\nEnter contact # to update: ")) - 1
        if idx < 0 or idx >= len(contacts):
            print("Invalid selection.")
            return
    except (ValueError, EOFError):
        print("Invalid input.")
        return

    contact = contacts[idx]
    print(f"\nUpdating: {contact['name']} (currently: {contact['status']})")

    new_status = prompt_choice("New status:", STATUSES)
    note = input("Add a note about this interaction (optional): ").strip()

    contact["status"] = new_status
    contact["last_contact"] = datetime.now().isoformat()
    contact["interactions"].append({
        "date": datetime.now().isoformat(),
        "action": f"Status changed to {new_status}" + (f" — {note}" if note else ""),
    })

    # Set next follow-up based on status
    follow_up_days = {
        "Request Sent": 7,
        "Connected": 2,
        "Follow-Up Sent": 7,
        "In Conversation": 3,
        "Referral Partner": 30,
        "Client": 14,
        "Inactive": None,
    }
    days = follow_up_days.get(new_status)
    if days:
        contact["follow_up_date"] = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        print(f"Next follow-up set for {contact['follow_up_date']}.")
    else:
        contact["follow_up_date"] = ""

    save_contacts(contacts)
    print(f"Updated {contact['name']} to '{new_status}'.")


def show_stats():
    contacts = load_contacts()
    if not contacts:
        print("\nNo contacts yet.")
        return

    print(f"\n--- Outreach Statistics ---\n")
    print(f"Total contacts: {len(contacts)}\n")

    print("By Status:")
    status_counts = {}
    for c in contacts:
        status_counts[c["status"]] = status_counts.get(c["status"], 0) + 1
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"  {status:<22} {count}")

    print("\nBy Area:")
    area_counts = {}
    for c in contacts:
        area_counts[c["area"]] = area_counts.get(c["area"], 0) + 1
    for area, count in sorted(area_counts.items(), key=lambda x: -x[1]):
        print(f"  {area:<22} {count}")

    print("\nBy Category:")
    cat_counts = {}
    for c in contacts:
        cat_counts[c["category"]] = cat_counts.get(c["category"], 0) + 1
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:<22} {count}")


def export_contacts():
    contacts = load_contacts()
    if not contacts:
        print("\nNo contacts to export.")
        return

    export_path = os.path.join(os.path.dirname(DATA_FILE), "contacts_export.csv")
    os.makedirs(os.path.dirname(export_path), exist_ok=True)

    fields = ["name", "company", "title", "category", "area", "status", "linkedin_url", "notes", "date_added", "last_contact", "follow_up_date"]
    with open(export_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(contacts)

    print(f"\nExported {len(contacts)} contacts to {export_path}")


COMMANDS = {
    "add": add_contact,
    "list": list_contacts,
    "followups": show_followups,
    "update": update_contact,
    "stats": show_stats,
    "export": export_contacts,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print("LinkedIn Networking Tracker — Henley Contracting")
        print(f"\nUsage: python {sys.argv[0]} <command>\n")
        print("Commands:")
        for cmd in COMMANDS:
            print(f"  {cmd}")
        sys.exit(1)

    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()

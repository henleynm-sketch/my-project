#!/usr/bin/env python3
"""
LinkedIn Message Generator — Henley Contracting

Generates personalized connection request and follow-up messages
for LinkedIn outreach in Oshawa, Whitby, and Kawartha Lakes.

Usage:
    python message_generator.py
"""

AREAS = ["Oshawa", "Whitby", "Kawartha Lakes"]

CATEGORIES = {
    "1": "Realtor",
    "2": "Mortgage Broker",
    "3": "Interior Designer / Architect",
    "4": "Trades / Subcontractor",
    "5": "Local Business Owner",
    "6": "Past Client",
    "7": "Potential Client",
    "8": "General Professional",
}

CONNECTION_TEMPLATES = {
    "Realtor": (
        "Hi {name}, I'm Henley with Henley Contracting — we do custom home "
        "builds and renovations in {area}. I'd love to connect and explore "
        "how we might help each other's clients. Always great to know the best "
        "local realtors!"
    ),
    "Mortgage Broker": (
        "Hi {name}, I'm Henley with Henley Contracting. We build and renovate "
        "homes across Durham Region and Kawartha Lakes. Our clients often need "
        "great mortgage advice — would love to connect!"
    ),
    "Interior Designer / Architect": (
        "Hey {name}, I run Henley Contracting — custom builds and renovations "
        "in the {area} area. We're always looking to collaborate with talented "
        "designers. Let's connect!"
    ),
    "Trades / Subcontractor": (
        "Hey {name}, I run Henley Contracting here in {area}. Saw you do "
        "{trade}. Always looking to connect with reliable local trades. Would "
        "be great to have you in my network!"
    ),
    "Local Business Owner": (
        "Hi {name}, fellow {area} business owner here — I run Henley "
        "Contracting (home builds & renos). Love supporting other local "
        "businesses. Let's connect!"
    ),
    "Past Client": (
        "Hi {name}, thanks for choosing Henley Contracting for your "
        "{project}. I'm connecting here so we can stay in touch. Hope you're "
        "enjoying the finished result!"
    ),
    "Potential Client": (
        "Hi {name}, thanks for your interest in your {project}. I'm "
        "connecting here so we can stay in touch. Looking forward to helping "
        "bring your vision to life!"
    ),
    "General Professional": (
        "Hi {name}, I'm a local contractor in {area} specializing in home "
        "builds and renovations. Always great to grow the local network. "
        "Let's connect!"
    ),
}

FOLLOWUP_TEMPLATES = {
    "Realtor": (
        "Thanks for connecting, {name}! I know a great renovation or pre-sale "
        "refresh can make a huge difference for your listings. We've helped "
        "homeowners in {area} add serious value before selling.\n\n"
        "Would you be open to a quick coffee or call sometime? I'd love to "
        "learn more about your business and see if there's a way we can send "
        "clients each other's way."
    ),
    "Mortgage Broker": (
        "Appreciate the connection, {name}! Many of our clients are first-time "
        "builders or doing major renos and need solid mortgage advice. I'd love "
        "to have someone reliable to recommend.\n\n"
        "Would you be open to a quick chat about how we might refer clients to "
        "each other?"
    ),
    "Trades / Subcontractor": (
        "Thanks for connecting, {name}! We're always looking for reliable "
        "{trade} pros for our projects in the {area} area.\n\n"
        "If you're ever looking for extra work or want to collaborate on "
        "projects, let's chat. What's your availability looking like?"
    ),
    "default": (
        "Thanks for connecting, {name}! I run Henley Contracting — we "
        "specialize in custom home builds, additions, and full renovations "
        "across Oshawa, Whitby, and Kawartha Lakes.\n\n"
        "If you ever come across anyone looking to build or renovate, I'd be "
        "happy to chat with them. And if there's ever anything I can do for "
        "you, don't hesitate to reach out!"
    ),
}


def pick_option(prompt, options):
    print(f"\n{prompt}")
    for key, val in options.items():
        print(f"  {key}. {val}")
    while True:
        choice = input("Choose: ").strip()
        if choice in options:
            return options[choice]
        print("Invalid choice.")


def pick_area():
    print("\nArea:")
    for i, area in enumerate(AREAS, 1):
        print(f"  {i}. {area}")
    while True:
        choice = input("Choose: ").strip()
        try:
            return AREAS[int(choice) - 1]
        except (ValueError, IndexError):
            print("Invalid choice.")


def generate_connection_request():
    print("\n=== Connection Request Generator ===")
    name = input("\nTheir first name: ").strip()
    category = pick_option("Their category:", CATEGORIES)
    area = pick_area()

    extra = {}
    if category == "Trades / Subcontractor":
        extra["trade"] = input("What trade do they do? (e.g., electrical, plumbing): ").strip()
    elif category == "Past Client":
        extra["project"] = input("What project did you do? (e.g., kitchen renovation): ").strip()
    elif category == "Potential Client":
        extra["project"] = input("What project are they interested in? (e.g., home addition): ").strip()

    template = CONNECTION_TEMPLATES[category]
    message = template.format(name=name, area=area, **extra)

    print(f"\n{'='*60}")
    print("CONNECTION REQUEST MESSAGE")
    print(f"{'='*60}")
    print(message)
    print(f"{'='*60}")
    print(f"Characters: {len(message)}/300", "OK" if len(message) <= 300 else "TOO LONG — shorten it!")
    print()


def generate_followup():
    print("\n=== Follow-Up Message Generator ===")
    name = input("\nTheir first name: ").strip()
    category = pick_option("Their category:", CATEGORIES)
    area = pick_area()

    extra = {}
    if category == "Trades / Subcontractor":
        extra["trade"] = input("What trade do they do?: ").strip()

    template = FOLLOWUP_TEMPLATES.get(category, FOLLOWUP_TEMPLATES["default"])
    message = template.format(name=name, area=area, **extra)

    print(f"\n{'='*60}")
    print("FOLLOW-UP MESSAGE")
    print(f"{'='*60}")
    print(message)
    print(f"{'='*60}\n")


def main():
    print("LinkedIn Message Generator — Henley Contracting")
    print("=" * 50)

    while True:
        print("\nWhat would you like to generate?")
        print("  1. Connection request message")
        print("  2. Follow-up message")
        print("  3. Quit")

        choice = input("\nChoose: ").strip()
        if choice == "1":
            generate_connection_request()
        elif choice == "2":
            generate_followup()
        elif choice == "3":
            print("Happy networking!")
            break
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    main()

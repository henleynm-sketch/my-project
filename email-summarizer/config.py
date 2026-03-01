"""
Configuration for Henley Contracting Email Summarizer.

To set up:
1. Register an app in Azure AD (portal.azure.com > App registrations)
2. Set redirect URI to http://localhost:8400
3. Add Microsoft Graph permissions: Mail.Read, Mail.ReadBasic, User.Read
4. Copy your Application (client) ID and Tenant ID below
5. Set environment variables or update the values directly
"""

import os

# Azure AD App Registration
CLIENT_ID = os.environ.get("HENLEY_MS_CLIENT_ID", "")
TENANT_ID = os.environ.get("HENLEY_MS_TENANT_ID", "")
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

# Microsoft Graph API
GRAPH_BASE = "https://graph.microsoft.com/v1.0"
SCOPES = ["Mail.Read", "Mail.ReadBasic", "User.Read"]

# Email fetch settings
DEFAULT_EMAIL_COUNT = 25
DEFAULT_DAYS_BACK = 3

# User
USER_EMAIL = "nick@henleycontracting.com"

# Output
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

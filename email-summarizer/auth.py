"""
Authentication module for Microsoft Graph API.
Uses MSAL device code flow — works great from CLI or mobile.
"""

import json
import os
import sys

import msal

from config import AUTHORITY, CLIENT_ID, SCOPES

TOKEN_CACHE_FILE = os.path.join(os.path.dirname(__file__), ".token_cache.json")


def _build_app():
    """Build MSAL public client application with persistent token cache."""
    cache = msal.SerializableTokenCache()
    if os.path.exists(TOKEN_CACHE_FILE):
        with open(TOKEN_CACHE_FILE, "r") as f:
            cache.deserialize(f.read())

    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache,
    )
    return app, cache


def _save_cache(cache):
    """Persist token cache to disk."""
    if cache.has_state_changed:
        with open(TOKEN_CACHE_FILE, "w") as f:
            f.write(cache.serialize())


def get_access_token():
    """
    Get a valid access token for Microsoft Graph.
    Uses cached token if available, otherwise initiates device code flow.
    """
    app, cache = _build_app()

    # Try silent token acquisition first (cached/refresh token)
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            _save_cache(cache)
            return result["access_token"]

    # Fall back to device code flow
    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        print("ERROR: Could not initiate device flow.", file=sys.stderr)
        print(json.dumps(flow, indent=2), file=sys.stderr)
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  SIGN IN TO YOUR MICROSOFT ACCOUNT")
    print("=" * 60)
    print(f"\n  1. Open:  {flow['verification_uri']}")
    print(f"  2. Enter: {flow['user_code']}")
    print(f"\n  (Code expires in {flow.get('expires_in', 900) // 60} minutes)")
    print("=" * 60 + "\n")

    result = app.acquire_token_by_device_flow(flow)

    if "access_token" not in result:
        print("ERROR: Authentication failed.", file=sys.stderr)
        print(json.dumps(result, indent=2), file=sys.stderr)
        sys.exit(1)

    _save_cache(cache)
    print("Authenticated successfully.\n")
    return result["access_token"]

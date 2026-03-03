#!/usr/bin/env python3
"""
Buildertrend Daily Log Photos → Google Drive Sync
==================================================
Pulls today's Daily Log photos from Buildertrend and uploads them
into an organized Google Drive folder structure.

Run daily via cron or Windows Task Scheduler.
See README.md for setup instructions.
"""

import os
import sys
import re
import io
import time
import logging
from datetime import date, datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

BT_CLIENT_ID = os.getenv("BT_CLIENT_ID", "")
BT_CLIENT_SECRET = os.getenv("BT_CLIENT_SECRET", "")
BT_API_BASE_URL = os.getenv("BT_API_BASE_URL", "https://api.buildertrend.net").rstrip("/")

GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
GOOGLE_DRIVE_ROOT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "")

LOG_FILE = os.getenv("LOG_FILE", "sync.log")

# Google Drive folder path template (relative to root folder)
# {project_name} and {date_folder} are filled in at runtime.
DRIVE_PATH_TEMPLATE = "Marketing/Active Projects/{project_name}/Raw Site Photos/{date_folder}"

# Retry / rate-limit settings
MAX_RETRIES = 4
RETRY_BACKOFF_BASE = 2  # seconds — exponential: 2, 4, 8, 16

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------


def setup_logging() -> logging.Logger:
    """Configure a logger that writes to both console and a log file."""
    logger = logging.getLogger("bt_drive_sync")
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # File handler
    fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    return logger


log = setup_logging()

# ---------------------------------------------------------------------------
# Buildertrend API helpers
# ---------------------------------------------------------------------------


def _request_with_retry(method: str, url: str, **kwargs) -> requests.Response:
    """Make an HTTP request with exponential-backoff retries for transient errors."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.request(method, url, timeout=30, **kwargs)

            # Retry on rate-limit (429) or server errors (5xx)
            if resp.status_code == 429 or resp.status_code >= 500:
                wait = RETRY_BACKOFF_BASE ** attempt
                log.warning(
                    "HTTP %s from %s (attempt %d/%d) — retrying in %ds",
                    resp.status_code, url, attempt, MAX_RETRIES, wait,
                )
                time.sleep(wait)
                continue

            return resp

        except requests.RequestException as exc:
            wait = RETRY_BACKOFF_BASE ** attempt
            log.warning(
                "Request error for %s (attempt %d/%d): %s — retrying in %ds",
                url, attempt, MAX_RETRIES, exc, wait,
            )
            time.sleep(wait)

    # Final attempt — let it raise naturally if it fails
    return requests.request(method, url, timeout=30, **kwargs)


def bt_get_access_token() -> str:
    """Authenticate with Buildertrend using OAuth2 client credentials."""
    token_url = f"{BT_API_BASE_URL}/oauth/token"

    log.info("Requesting Buildertrend access token from %s", token_url)

    resp = _request_with_retry(
        "POST",
        token_url,
        data={
            "grant_type": "client_credentials",
            "client_id": BT_CLIENT_ID,
            "client_secret": BT_CLIENT_SECRET,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if resp.status_code != 200:
        log.error("Failed to get BT access token: %s %s", resp.status_code, resp.text)
        raise SystemExit("Cannot authenticate with Buildertrend — aborting.")

    token = resp.json().get("access_token")
    if not token:
        log.error("Token response missing 'access_token': %s", resp.text)
        raise SystemExit("Buildertrend token response is malformed — aborting.")

    log.info("Buildertrend access token acquired.")
    return token


def bt_fetch_daily_logs(token: str, target_date: date) -> list[dict]:
    """Fetch daily logs for a given date, trying both v2 and v1 endpoints."""
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    date_str = target_date.isoformat()  # YYYY-MM-DD

    # Try v2 first, then fall back to v1
    endpoints = [
        f"{BT_API_BASE_URL}/v2/dailylogs",
        f"{BT_API_BASE_URL}/v1/dailylogs",
    ]

    for endpoint in endpoints:
        log.info("Trying daily logs endpoint: %s (date=%s)", endpoint, date_str)

        resp = _request_with_retry(
            "GET",
            endpoint,
            headers=headers,
            params={"date": date_str, "startDate": date_str, "endDate": date_str},
        )

        if resp.status_code == 200:
            data = resp.json()
            # The response might be a list directly or nested under a key
            logs = data if isinstance(data, list) else data.get("data", data.get("dailyLogs", []))
            if isinstance(logs, list):
                log.info("Found %d daily log(s) from %s", len(logs), endpoint)
                return logs

        log.debug("Endpoint %s returned %s — trying next.", endpoint, resp.status_code)

    log.warning("No daily logs endpoint returned usable data for %s.", date_str)
    return []


def bt_extract_photos(daily_log: dict) -> list[dict]:
    """Extract photo attachment info from a daily log entry.

    Returns a list of dicts with keys: 'url', 'filename', 'id'.
    Handles multiple common response shapes from Buildertrend.
    """
    photos: list[dict] = []

    # Possible keys where photo data might live
    attachment_keys = ["photos", "attachments", "images", "files", "photoAttachments"]

    for key in attachment_keys:
        items = daily_log.get(key, [])
        if not isinstance(items, list):
            continue
        for item in items:
            url = (
                item.get("url")
                or item.get("fileUrl")
                or item.get("downloadUrl")
                or item.get("imageUrl")
                or item.get("uri")
            )
            if url:
                photos.append({
                    "url": url,
                    "filename": item.get("fileName", item.get("name", "")),
                    "id": str(item.get("id", item.get("fileId", ""))),
                })

    return photos


def bt_download_photo(url: str, token: str) -> bytes:
    """Download a photo by URL, using the BT bearer token if needed."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = _request_with_retry("GET", url, headers=headers)
    resp.raise_for_status()
    return resp.content


# ---------------------------------------------------------------------------
# Google Drive helpers
# ---------------------------------------------------------------------------


def drive_service():
    """Build and return an authenticated Google Drive API service."""
    scopes = ["https://www.googleapis.com/auth/drive"]
    creds = service_account.Credentials.from_service_account_file(
        GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes,
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def drive_find_or_create_folder(service, name: str, parent_id: str) -> str:
    """Find a subfolder by name under parent_id, or create it if missing."""
    query = (
        f"mimeType='application/vnd.google-apps.folder' "
        f"and name='{name}' "
        f"and '{parent_id}' in parents "
        f"and trashed=false"
    )
    results = service.files().list(
        q=query, spaces="drive", fields="files(id, name)", pageSize=1,
    ).execute()

    files = results.get("files", [])
    if files:
        return files[0]["id"]

    # Create the folder
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    log.info("Created Drive folder: %s (under %s)", name, parent_id)
    return folder["id"]


def drive_ensure_path(service, path: str, root_folder_id: str) -> str:
    """Walk (and create) each folder in a '/'-separated path, returning the final folder ID."""
    current_id = root_folder_id
    for part in path.split("/"):
        part = part.strip()
        if not part:
            continue
        current_id = drive_find_or_create_folder(service, part, current_id)
    return current_id


def drive_file_exists(service, filename: str, folder_id: str) -> bool:
    """Check whether a file with the given name already exists in a Drive folder."""
    query = (
        f"name='{filename}' "
        f"and '{folder_id}' in parents "
        f"and trashed=false"
    )
    results = service.files().list(
        q=query, spaces="drive", fields="files(id)", pageSize=1,
    ).execute()
    return len(results.get("files", [])) > 0


def drive_upload_file(service, filename: str, content: bytes, folder_id: str, mime_type: str = "image/jpeg"):
    """Upload a file to a specific Google Drive folder."""
    metadata = {"name": filename, "parents": [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=True)
    service.files().create(body=metadata, media_body=media, fields="id").execute()
    log.info("Uploaded to Drive: %s", filename)


# ---------------------------------------------------------------------------
# Filename helpers
# ---------------------------------------------------------------------------

def sanitize_name(name: str) -> str:
    """Remove or replace characters that are unsafe for filenames and Drive folder names."""
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def build_photo_filename(project_name: str, target_date: date, index: int) -> str:
    """Build a standardized filename: ProjectName_YYYYMMDD_LogPhoto_01.jpg"""
    safe_name = sanitize_name(project_name).replace(" ", "")
    date_str = target_date.strftime("%Y%m%d")
    return f"{safe_name}_{date_str}_LogPhoto_{index:02d}.jpg"


# ---------------------------------------------------------------------------
# Main sync logic
# ---------------------------------------------------------------------------


def validate_config():
    """Ensure all required env vars are set before doing real work."""
    missing = []
    if not BT_CLIENT_ID:
        missing.append("BT_CLIENT_ID")
    if not BT_CLIENT_SECRET:
        missing.append("BT_CLIENT_SECRET")
    if not GOOGLE_SERVICE_ACCOUNT_FILE:
        missing.append("GOOGLE_SERVICE_ACCOUNT_FILE")
    if not GOOGLE_DRIVE_ROOT_FOLDER_ID:
        missing.append("GOOGLE_DRIVE_ROOT_FOLDER_ID")

    if missing:
        log.error("Missing required environment variables: %s", ", ".join(missing))
        log.error("Copy .env.example to .env and fill in the values. See README.md.")
        raise SystemExit(1)

    if not Path(GOOGLE_SERVICE_ACCOUNT_FILE).is_file():
        log.error("Service account file not found: %s", GOOGLE_SERVICE_ACCOUNT_FILE)
        raise SystemExit(1)


def sync_daily_logs(target_date: date | None = None):
    """Main entry point: pull today's BT logs and upload photos to Drive."""
    if target_date is None:
        target_date = date.today()

    log.info("=" * 60)
    log.info("Buildertrend → Google Drive sync started for %s", target_date.isoformat())
    log.info("=" * 60)

    validate_config()

    # --- Buildertrend --------------------------------------------------
    token = bt_get_access_token()
    daily_logs = bt_fetch_daily_logs(token, target_date)

    if not daily_logs:
        log.info("No daily logs found for %s. Nothing to do.", target_date)
        return

    # --- Google Drive ---------------------------------------------------
    svc = drive_service()
    date_folder_name = target_date.strftime("%Y-%m-%d")

    total_downloaded = 0
    total_skipped = 0
    total_errors = 0

    for dl in daily_logs:
        # Try common keys for the project name
        project_name = (
            dl.get("projectName")
            or dl.get("project", {}).get("name", "")
            or dl.get("projectTitle")
            or f"Project_{dl.get('projectId', 'Unknown')}"
        )
        project_name = sanitize_name(project_name)

        photos = bt_extract_photos(dl)
        if not photos:
            log.info("Daily log for '%s' has no photos — skipping.", project_name)
            continue

        log.info("Processing %d photo(s) for project '%s'", len(photos), project_name)

        # Build the Drive path and ensure all folders exist
        drive_path = DRIVE_PATH_TEMPLATE.format(
            project_name=project_name,
            date_folder=date_folder_name,
        )
        try:
            folder_id = drive_ensure_path(svc, drive_path, GOOGLE_DRIVE_ROOT_FOLDER_ID)
        except Exception as exc:
            log.error("Failed to create Drive folder path '%s': %s", drive_path, exc)
            total_errors += len(photos)
            continue

        for idx, photo in enumerate(photos, start=1):
            filename = build_photo_filename(project_name, target_date, idx)

            # Skip duplicates
            try:
                if drive_file_exists(svc, filename, folder_id):
                    log.info("Already exists in Drive — skipping: %s", filename)
                    total_skipped += 1
                    continue
            except Exception as exc:
                log.warning("Could not check for duplicate '%s': %s", filename, exc)

            # Download from Buildertrend
            try:
                content = bt_download_photo(photo["url"], token)
            except Exception as exc:
                log.error("Failed to download photo '%s': %s", photo["url"], exc)
                total_errors += 1
                continue

            # Upload to Google Drive
            try:
                drive_upload_file(svc, filename, content, folder_id)
                total_downloaded += 1
            except Exception as exc:
                log.error("Failed to upload '%s' to Drive: %s", filename, exc)
                total_errors += 1

    # --- Summary -------------------------------------------------------
    log.info("-" * 60)
    log.info(
        "Sync complete: %d uploaded, %d skipped (duplicate), %d errors",
        total_downloaded, total_skipped, total_errors,
    )
    log.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Optional: pass a date as YYYY-MM-DD to backfill a specific day
    if len(sys.argv) > 1:
        try:
            run_date = date.fromisoformat(sys.argv[1])
        except ValueError:
            print(f"Invalid date format: {sys.argv[1]}  (expected YYYY-MM-DD)")
            raise SystemExit(1)
    else:
        run_date = date.today()

    try:
        sync_daily_logs(run_date)
    except SystemExit:
        raise
    except Exception as exc:
        log.exception("Unhandled error during sync: %s", exc)
        raise SystemExit(1)

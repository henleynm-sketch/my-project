#!/usr/bin/env python3
"""
Buildertrend Daily Log Photos → Google Drive Sync (Browser Automation)
=====================================================================
Logs into the Buildertrend web portal via Playwright, navigates to
Daily Logs, downloads photos, and uploads them to Google Drive.

No API credentials needed — just your normal BT username and password.

Run daily via cron or Windows Task Scheduler.
See README.md for setup instructions.
"""

import os
import sys
import re
import io
import asyncio
import logging
import tempfile
from datetime import date
from pathlib import Path
from urllib.parse import urlparse, urljoin

from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from playwright.async_api import async_playwright, Page, BrowserContext

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

BT_USERNAME = os.getenv("BT_USERNAME", "")
BT_PASSWORD = os.getenv("BT_PASSWORD", "")
BT_LOGIN_URL = os.getenv("BT_LOGIN_URL", "https://buildertrend.net")

GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
GOOGLE_DRIVE_ROOT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "")

LOG_FILE = os.getenv("LOG_FILE", "sync.log")

# Set to "true" to watch the browser (useful for first run / debugging)
HEADLESS = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")

# Google Drive folder path template
DRIVE_PATH_TEMPLATE = (
    "Marketing/Active Projects/{project_name}/Raw Site Photos/{date_folder}"
)

# Image extensions to capture from the daily logs page
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp", ".tiff"}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("bt_drive_sync")
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    return logger


log = setup_logging()


# ---------------------------------------------------------------------------
# Buildertrend — browser automation
# ---------------------------------------------------------------------------


def _is_photo_url(url: str) -> bool:
    """Return True if the URL looks like a daily-log photo (not an icon/avatar)."""
    lower = url.lower()
    # Skip tiny UI assets
    skip_patterns = [
        "icon", "avatar", "logo", "favicon", "sprite",
        "placeholder", "thumbnail_small", "profile",
        "/static/", "/assets/css/", ".svg",
    ]
    if any(p in lower for p in skip_patterns):
        return False

    parsed = urlparse(url)
    ext = Path(parsed.path).suffix.lower()
    # Accept if it has an image extension
    if ext in IMAGE_EXTENSIONS:
        return True
    # Also accept URLs that look like BT file/attachment endpoints
    if any(k in lower for k in ["attachment", "photo", "dailylog", "upload", "file"]):
        return True

    return False


async def bt_login(page: Page) -> None:
    """Log into Buildertrend web portal."""
    log.info("Navigating to Buildertrend login: %s", BT_LOGIN_URL)
    await page.goto(BT_LOGIN_URL, wait_until="networkidle", timeout=30000)

    # --- Username field ---
    username_selectors = [
        'input[name="username"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[id*="user" i]',
        'input[id*="email" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]',
        'input[aria-label*="email" i]',
        'input[aria-label*="username" i]',
    ]

    username_field = None
    for sel in username_selectors:
        try:
            username_field = await page.wait_for_selector(sel, timeout=2000)
            if username_field:
                log.debug("Found username field: %s", sel)
                break
        except Exception:
            continue

    if not username_field:
        await page.screenshot(path="debug_login_page.png")
        log.error("Screenshot saved to debug_login_page.png — inspect to find the right selectors.")
        raise SystemExit("Could not find username field on login page.")

    await username_field.fill(BT_USERNAME)

    # --- Password field ---
    password_field = await page.wait_for_selector(
        'input[type="password"]', timeout=5000
    )
    if not password_field:
        raise SystemExit("Could not find password field.")
    await password_field.fill(BT_PASSWORD)

    # --- Submit ---
    submit_selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Log In")',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
    ]
    for sel in submit_selectors:
        try:
            btn = await page.wait_for_selector(sel, timeout=2000)
            if btn:
                await btn.click()
                break
        except Exception:
            continue

    # Wait for the page to settle after login
    await page.wait_for_load_state("networkidle", timeout=30000)
    await page.wait_for_timeout(3000)

    # Verify login succeeded
    url_lower = page.url.lower()
    if "login" in url_lower or "signin" in url_lower:
        # Might still be on the login page — check for error messages
        await page.screenshot(path="debug_login_failed.png")
        log.error("Still on login page after submit. Screenshot: debug_login_failed.png")
        raise SystemExit("Login failed — check BT_USERNAME and BT_PASSWORD.")

    log.info("Logged into Buildertrend. Current URL: %s", page.url)


async def bt_navigate_to_daily_logs(page: Page, target_date: date) -> bool:
    """Try to navigate to the daily logs page. Returns True on success."""
    iso = target_date.isoformat()
    us_date = target_date.strftime("%m/%d/%Y")

    # Buildertrend URL patterns vary by account; try several
    candidate_urls = [
        f"{BT_LOGIN_URL}/dailyLogs?date={iso}",
        f"{BT_LOGIN_URL}/app/dailylogs?date={iso}",
        f"{BT_LOGIN_URL}/Daily/DailyLogs?date={iso}",
        f"{BT_LOGIN_URL}/dailylogs?startDate={iso}&endDate={iso}",
        f"{BT_LOGIN_URL}/dailylogs",
        f"{BT_LOGIN_URL}/app/dailylogs",
    ]

    for url in candidate_urls:
        log.debug("Trying: %s", url)
        try:
            resp = await page.goto(url, wait_until="networkidle", timeout=15000)
            if resp and resp.ok:
                title = await page.title()
                content = await page.text_content("body") or ""
                if "daily" in (title + content).lower():
                    log.info("Daily logs page loaded via URL: %s", page.url)
                    return True
        except Exception:
            continue

    # Fallback: try to find a nav link
    log.info("Direct URLs failed — searching navigation for 'Daily Log' link...")
    nav_selectors = [
        'a:has-text("Daily Log")',
        'a:has-text("Daily Logs")',
        'a[href*="daily" i]',
        'span:has-text("Daily Log")',
    ]
    for sel in nav_selectors:
        try:
            link = await page.wait_for_selector(sel, timeout=3000)
            if link:
                await link.click()
                await page.wait_for_load_state("networkidle", timeout=15000)
                log.info("Clicked nav link to daily logs. URL: %s", page.url)
                return True
        except Exception:
            continue

    await page.screenshot(path="debug_no_dailylogs.png")
    log.error("Could not find daily logs page. Screenshot: debug_no_dailylogs.png")
    return False


async def bt_collect_photos(
    page: Page, context: BrowserContext, target_date: date
) -> list[dict]:
    """
    Collect photo data from the daily logs page.

    Uses two strategies:
      1) Intercept network responses for image files while scrolling.
      2) Scrape <img> and <a> elements from the rendered page.

    Returns a list of dicts:
        [{"project_name": str, "photos": [{"url": str}]}]
    """
    captured_urls: set[str] = set()

    # --- Strategy 1: network-level interception ---
    def on_response(response):
        url = response.url
        ct = response.headers.get("content-type", "")
        if ct.startswith("image/") and _is_photo_url(url):
            captured_urls.add(url)

    page.on("response", on_response)

    # Scroll to trigger lazy-loaded images
    for _ in range(10):
        await page.evaluate("window.scrollBy(0, 600)")
        await page.wait_for_timeout(500)

    # Scroll back up
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(1000)

    page.remove_listener("response", on_response)

    # --- Strategy 2: DOM scraping ---
    img_elements = await page.query_selector_all("img")
    for img in img_elements:
        src = await img.get_attribute("src")
        if src and _is_photo_url(src):
            captured_urls.add(urljoin(page.url, src))

    link_elements = await page.query_selector_all("a[href]")
    for a in link_elements:
        href = await a.get_attribute("href")
        if href and _is_photo_url(href):
            captured_urls.add(urljoin(page.url, href))

    log.info("Captured %d candidate photo URL(s) from daily logs page.", len(captured_urls))

    # --- Try to extract project name(s) ---
    project_name = "UnknownProject"
    for sel in ["h1", "h2", ".project-name", '[class*="project"]']:
        try:
            el = await page.query_selector(sel)
            if el:
                text = (await el.inner_text()).strip()
                if text and 3 < len(text) < 100 and "daily" not in text.lower():
                    project_name = text
                    break
        except Exception:
            continue

    if not captured_urls:
        return []

    photos = [{"url": u} for u in sorted(captured_urls)]
    return [{"project_name": project_name, "photos": photos}]


async def bt_download_photo(
    page: Page, url: str, download_dir: str, index: int
) -> str | None:
    """Download a photo using the browser's authenticated session."""
    try:
        resp = await page.request.get(url, timeout=30000)
        if not resp.ok:
            log.error("HTTP %s downloading %s", resp.status, url)
            return None

        body = await resp.body()
        if len(body) < 1024:
            log.warning("Skipping tiny file (%d bytes) — likely not a photo: %s", len(body), url)
            return None

        # Determine extension from content-type or URL
        ct = resp.headers.get("content-type", "")
        ext = ".jpg"
        if "png" in ct:
            ext = ".png"
        elif "webp" in ct:
            ext = ".webp"
        else:
            url_ext = Path(urlparse(url).path).suffix.lower()
            if url_ext in IMAGE_EXTENSIONS:
                ext = url_ext

        filepath = os.path.join(download_dir, f"photo_{index:03d}{ext}")
        with open(filepath, "wb") as f:
            f.write(body)

        log.debug("Downloaded %s → %s (%d bytes)", url, filepath, len(body))
        return filepath

    except Exception as exc:
        log.error("Error downloading %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Google Drive helpers (unchanged)
# ---------------------------------------------------------------------------


def drive_service():
    """Build and return an authenticated Google Drive API service."""
    scopes = ["https://www.googleapis.com/auth/drive"]
    creds = service_account.Credentials.from_service_account_file(
        GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes,
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def drive_find_or_create_folder(service, name: str, parent_id: str) -> str:
    """Find a subfolder by name under parent_id, or create it."""
    query = (
        f"mimeType='application/vnd.google-apps.folder' "
        f"and name='{name}' "
        f"and '{parent_id}' in parents "
        f"and trashed=false"
    )
    results = (
        service.files()
        .list(q=query, spaces="drive", fields="files(id, name)", pageSize=1)
        .execute()
    )
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    log.info("Created Drive folder: %s (under %s)", name, parent_id)
    return folder["id"]


def drive_ensure_path(service, path: str, root_folder_id: str) -> str:
    """Walk/create each folder in a '/'-separated path, return final folder ID."""
    current_id = root_folder_id
    for part in path.split("/"):
        part = part.strip()
        if not part:
            continue
        current_id = drive_find_or_create_folder(service, part, current_id)
    return current_id


def drive_file_exists(service, filename: str, folder_id: str) -> bool:
    """Check if a file with the given name already exists in a folder."""
    query = (
        f"name='{filename}' "
        f"and '{folder_id}' in parents "
        f"and trashed=false"
    )
    results = (
        service.files()
        .list(q=query, spaces="drive", fields="files(id)", pageSize=1)
        .execute()
    )
    return len(results.get("files", [])) > 0


def drive_upload_file(
    service, filename: str, filepath: str, folder_id: str
) -> None:
    """Upload a local file to Google Drive."""
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
    }
    ext = Path(filepath).suffix.lower()
    mime = mime_map.get(ext, "image/jpeg")

    with open(filepath, "rb") as f:
        media = MediaIoBaseUpload(f, mimetype=mime, resumable=True)
        metadata = {"name": filename, "parents": [folder_id]}
        service.files().create(
            body=metadata, media_body=media, fields="id"
        ).execute()

    log.info("Uploaded to Drive: %s", filename)


# ---------------------------------------------------------------------------
# Filename helpers
# ---------------------------------------------------------------------------


def sanitize_name(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def build_photo_filename(project_name: str, target_date: date, index: int) -> str:
    safe = sanitize_name(project_name).replace(" ", "")
    ds = target_date.strftime("%Y%m%d")
    return f"{safe}_{ds}_LogPhoto_{index:02d}.jpg"


# ---------------------------------------------------------------------------
# Config validation
# ---------------------------------------------------------------------------


def validate_config() -> None:
    missing = []
    if not BT_USERNAME:
        missing.append("BT_USERNAME")
    if not BT_PASSWORD:
        missing.append("BT_PASSWORD")
    if not GOOGLE_SERVICE_ACCOUNT_FILE:
        missing.append("GOOGLE_SERVICE_ACCOUNT_FILE")
    if not GOOGLE_DRIVE_ROOT_FOLDER_ID:
        missing.append("GOOGLE_DRIVE_ROOT_FOLDER_ID")

    if missing:
        log.error("Missing required env vars: %s", ", ".join(missing))
        log.error("Copy .env.example → .env and fill in the values.")
        raise SystemExit(1)

    if not Path(GOOGLE_SERVICE_ACCOUNT_FILE).is_file():
        log.error("Service account file not found: %s", GOOGLE_SERVICE_ACCOUNT_FILE)
        raise SystemExit(1)


# ---------------------------------------------------------------------------
# Main sync
# ---------------------------------------------------------------------------


async def sync_daily_logs(target_date: date | None = None) -> None:
    if target_date is None:
        target_date = date.today()

    log.info("=" * 60)
    log.info("Buildertrend → Google Drive sync started for %s", target_date.isoformat())
    log.info("=" * 60)

    validate_config()

    # --- Browser session ------------------------------------------------
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=HEADLESS)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            await bt_login(page)
            if not await bt_navigate_to_daily_logs(page, target_date):
                log.error("Aborting — could not reach daily logs.")
                return

            log_entries = await bt_collect_photos(page, context, target_date)
        finally:
            # Keep browser open for downloads below (page.request uses session)
            pass

        if not log_entries:
            log.info("No photos found for %s. Nothing to upload.", target_date)
            await browser.close()
            return

        # --- Download & upload -----------------------------------------
        svc = drive_service()
        date_folder_name = target_date.strftime("%Y-%m-%d")
        total_uploaded = 0
        total_skipped = 0
        total_errors = 0

        with tempfile.TemporaryDirectory(prefix="bt_photos_") as tmp_dir:
            for entry in log_entries:
                project_name = sanitize_name(entry["project_name"])
                photos = entry["photos"]
                log.info(
                    "Processing %d photo(s) for '%s'", len(photos), project_name
                )

                drive_path = DRIVE_PATH_TEMPLATE.format(
                    project_name=project_name,
                    date_folder=date_folder_name,
                )
                try:
                    folder_id = drive_ensure_path(
                        svc, drive_path, GOOGLE_DRIVE_ROOT_FOLDER_ID
                    )
                except Exception as exc:
                    log.error("Drive folder error for '%s': %s", drive_path, exc)
                    total_errors += len(photos)
                    continue

                for idx, photo in enumerate(photos, start=1):
                    filename = build_photo_filename(
                        project_name, target_date, idx
                    )

                    # Skip duplicates
                    try:
                        if drive_file_exists(svc, filename, folder_id):
                            log.info("Already in Drive — skip: %s", filename)
                            total_skipped += 1
                            continue
                    except Exception as exc:
                        log.warning("Duplicate check failed for '%s': %s", filename, exc)

                    # Download via browser session
                    local_path = await bt_download_photo(
                        page, photo["url"], tmp_dir, idx
                    )
                    if not local_path:
                        total_errors += 1
                        continue

                    # Upload to Drive
                    try:
                        drive_upload_file(svc, filename, local_path, folder_id)
                        total_uploaded += 1
                    except Exception as exc:
                        log.error("Upload failed for '%s': %s", filename, exc)
                        total_errors += 1

        await browser.close()

    # --- Summary -------------------------------------------------------
    log.info("-" * 60)
    log.info(
        "Sync complete: %d uploaded, %d skipped (dup), %d errors",
        total_uploaded,
        total_skipped,
        total_errors,
    )
    log.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Sync Buildertrend daily-log photos to Google Drive."
    )
    parser.add_argument(
        "date",
        nargs="?",
        default=None,
        help="Target date as YYYY-MM-DD (defaults to today).",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run browser in headed (visible) mode for debugging.",
    )
    args = parser.parse_args()

    if args.headed:
        os.environ["HEADLESS"] = "false"
        HEADLESS = False

    run_date = date.today()
    if args.date:
        try:
            run_date = date.fromisoformat(args.date)
        except ValueError:
            print(f"Invalid date: {args.date}  (expected YYYY-MM-DD)")
            raise SystemExit(1)

    try:
        asyncio.run(sync_daily_logs(run_date))
    except SystemExit:
        raise
    except Exception as exc:
        log.exception("Unhandled error: %s", exc)
        raise SystemExit(1)

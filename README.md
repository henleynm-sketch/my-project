# Buildertrend Daily Log Photos → Google Drive Sync

Automatically pulls Daily Log photos from Buildertrend each day and uploads
them into an organized Google Drive folder structure:

```
/Marketing/Active Projects/[Project Name]/Raw Site Photos/[YYYY-MM-DD]/
```

Each photo is renamed to a consistent format:

```
ProjectName_YYYYMMDD_LogPhoto_01.jpg
```

## How It Works

This script uses **browser automation** (Playwright) to log into Buildertrend
with your normal username and password — no API credentials needed. It:

1. Opens a headless Chrome browser and logs into `buildertrend.net`.
2. Navigates to the Daily Logs page for the target date.
3. Captures all photo URLs (via network interception + page scraping).
4. Downloads each photo using the authenticated browser session.
5. Uploads photos to Google Drive in the organized folder structure.
6. Skips duplicates — safe to run multiple times.

---

## Prerequisites

- **Python 3.10+** ([python.org](https://www.python.org/downloads/))
- A **Buildertrend** account (your normal login — no API access needed)
- A **Google Cloud** project with the Drive API enabled

---

## 1. Set Up Google Drive Access

### 1a. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Click the project dropdown → **New Project**.
3. Name it `bt-drive-sync` and click **Create**.

### 1b. Enable the Google Drive API

1. Go to **APIs & Services → Library**.
2. Search for **Google Drive API** and click **Enable**.

### 1c. Create a Service Account

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → Service Account**.
3. Name: `bt-drive-sync`. Click **Create and Continue**.
4. Skip the optional role steps — click **Done**.
5. Click the new service account email on the Credentials page.
6. Go to **Keys** tab → **Add Key → Create new key → JSON**.
7. A `.json` file will download — save it somewhere secure.

### 1d. Share Your Google Drive Folder

1. Open the service account JSON and copy the `client_email` value
   (e.g., `bt-drive-sync@your-project.iam.gserviceaccount.com`).
2. In Google Drive, navigate to the root folder where
   `Marketing/Active Projects/...` should live.
3. Right-click → **Share** → paste the service account email →
   give **Editor** access → click **Send**.
4. Copy the **folder ID** from the URL bar (the long string after `/folders/`).

---

## 2. Configure the `.env` File

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable                      | What to put                                       |
| ----------------------------- | ------------------------------------------------- |
| `BT_USERNAME`                 | Your Buildertrend login email                     |
| `BT_PASSWORD`                 | Your Buildertrend password                        |
| `BT_LOGIN_URL`                | (Optional) Defaults to `https://buildertrend.net` |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | Full path to the `.json` key file from step 1c    |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | The folder ID from step 1d                        |
| `HEADLESS`                    | `true` for invisible browser, `false` to watch it |

> **Never commit `.env` or the service account JSON.** Both are in `.gitignore`.

---

## 3. Install Dependencies

```bash
# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install Python packages
pip install -r requirements.txt

# Install Playwright's browser binary (one-time)
playwright install chromium
```

---

## 4. First Run — Use Headed Mode

For your first run, use `--headed` so you can watch the browser and confirm
it logs in and navigates correctly:

```bash
python bt_drive_sync.py --headed
```

If the script can't find the right fields or pages, it saves debug screenshots
(`debug_login_page.png`, `debug_no_dailylogs.png`, etc.) so you can see
exactly what the browser saw.

Once you've confirmed it works, switch to headless:

```bash
python bt_drive_sync.py
```

### Backfill a specific date

```bash
python bt_drive_sync.py 2025-11-15
```

---

## 5. Schedule It to Run Daily

### Linux / macOS — cron

```bash
crontab -e
```

Add a line to run at 9 PM daily (adjust paths):

```
0 21 * * * cd /home/youruser/bt-drive-sync && /home/youruser/bt-drive-sync/venv/bin/python bt_drive_sync.py >> cron.log 2>&1
```

### Windows — Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**.
2. Name: `Buildertrend Photo Sync`.
3. Trigger: **Daily**, set the time (e.g., 9:00 PM).
4. Action: **Start a program**.
   - Program: `C:\path\to\venv\Scripts\python.exe`
   - Arguments: `bt_drive_sync.py`
   - Start in: `C:\path\to\project-folder`
5. Finish. Right-click → **Run** to test.

---

## Folder Structure in Google Drive

```
[Your Root Folder]/
  Marketing/
    Active Projects/
      Smithfield Renovation/
        Raw Site Photos/
          2025-11-15/
            SmithfieldRenovation_20251115_LogPhoto_01.jpg
            SmithfieldRenovation_20251115_LogPhoto_02.jpg
          2025-11-16/
            SmithfieldRenovation_20251116_LogPhoto_01.jpg
      Downtown Office Build/
        Raw Site Photos/
          2025-11-15/
            DowntownOfficeBuild_20251115_LogPhoto_01.jpg
```

---

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `Could not find username field` | Run with `--headed` to see the login page. The script saves `debug_login_page.png`. BT may have changed their login form — you may need to update the CSS selectors in `bt_login()`. |
| `Login failed` | Check `BT_USERNAME` and `BT_PASSWORD` in `.env`. Try logging in manually in a browser to confirm they work. Check `debug_login_failed.png`. |
| `Could not find daily logs page` | Run `--headed` and check `debug_no_dailylogs.png`. BT's URL structure may differ for your account — you can add your URL to the `candidate_urls` list in `bt_navigate_to_daily_logs()`. |
| `No photos found` | Make sure daily logs with photos exist for the target date. Check the debug screenshots. |
| `Service account file not found` | Verify the `GOOGLE_SERVICE_ACCOUNT_FILE` path in `.env`. |
| `403 on Google Drive` | Share the Drive folder with the service account email (step 1d). |
| `playwright install` fails | Run `playwright install --with-deps chromium` to also install system dependencies. |

---

## Adjusting for Your Buildertrend Setup

Buildertrend's web interface can vary. If the script doesn't find the right
pages or photos automatically, you may need to tweak a few things:

1. **Login selectors** — Open `bt_drive_sync.py` and look at `bt_login()`.
   The script tries multiple CSS selectors for the username/password fields.
   Run `--headed`, see what the login page looks like, and adjust.

2. **Daily log URLs** — In `bt_navigate_to_daily_logs()`, there's a list of
   `candidate_urls`. Add the URL you see when you manually browse to Daily Logs.

3. **Photo detection** — `bt_collect_photos()` captures images via network
   interception and DOM scraping. The `_is_photo_url()` filter skips icons
   and avatars. Adjust if needed.

The script saves **debug screenshots** at every failure point to make this easy.

---

## License

This project is provided as-is for internal use.

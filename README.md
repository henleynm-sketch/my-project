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

---

## Prerequisites

- **Python 3.10+** installed ([python.org](https://www.python.org/downloads/))
- A **Buildertrend** account with API access
- A **Google Cloud** project with the Drive API enabled

---

## 1. Get Buildertrend API Credentials

Buildertrend uses OAuth2 (client credentials). You need a **Client ID** and
**Client Secret**.

1. Contact your Buildertrend account representative or visit the Buildertrend
   developer / integrations portal.
2. Request API access for your account. Specify that you need read access to
   **Daily Logs** (including photo attachments).
3. Once approved you will receive:
   - `client_id`
   - `client_secret`
4. Keep these values safe — you will paste them into your `.env` file in step 3.

---

## 2. Set Up a Google Cloud Service Account for Drive Access

### 2a. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Click the project dropdown at the top → **New Project**.
3. Name it something like `bt-drive-sync` and click **Create**.

### 2b. Enable the Google Drive API

1. In the Cloud Console, go to **APIs & Services → Library**.
2. Search for **Google Drive API** and click **Enable**.

### 2c. Create a Service Account

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → Service Account**.
3. Name: `bt-drive-sync` (or anything you like). Click **Create and Continue**.
4. Skip the optional role/access steps for now — click **Done**.
5. On the Credentials page, click the new service account email.
6. Go to the **Keys** tab → **Add Key → Create new key → JSON**.
7. A `.json` file will download — this is your service account key file.
   Save it somewhere secure (e.g., next to this project).

### 2d. Share Your Google Drive Folder with the Service Account

1. Open the service account JSON file and copy the `client_email` value
   (looks like `bt-drive-sync@your-project.iam.gserviceaccount.com`).
2. In Google Drive, navigate to the **root folder** where the
   `Marketing/Active Projects/...` structure should live.
3. Right-click → **Share** → paste the service account email → give it
   **Editor** access → click **Send** (uncheck "Notify people" if prompted).
4. Copy the **folder ID** from the URL bar — it is the long string after
   `/folders/` in the URL. You will need this for your `.env` file.

---

## 3. Configure the `.env` File

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor and fill in every value:

   | Variable                       | What to put                                      |
   | ------------------------------ | ------------------------------------------------ |
   | `BT_CLIENT_ID`                 | Your Buildertrend client ID                      |
   | `BT_CLIENT_SECRET`             | Your Buildertrend client secret                  |
   | `GOOGLE_SERVICE_ACCOUNT_FILE`  | Full path to the `.json` key file from step 2c   |
   | `GOOGLE_DRIVE_ROOT_FOLDER_ID`  | The folder ID from step 2d                       |
   | `LOG_FILE`                     | (Optional) Path for the log file, defaults to `sync.log` |

> **Important:** Never commit the `.env` file or the service account JSON to
> version control. Both are listed in `.gitignore`.

---

## 4. Install Dependencies

```bash
# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install packages
pip install -r requirements.txt
```

---

## 5. Run the Script

### Run manually (pulls today's logs)

```bash
python bt_drive_sync.py
```

### Backfill a specific date

```bash
python bt_drive_sync.py 2025-11-15
```

---

## 6. Schedule It to Run Daily

### Linux / macOS — cron

1. Open your crontab:

   ```bash
   crontab -e
   ```

2. Add a line to run at 9 PM every day (adjust the time and paths):

   ```
   0 21 * * * /home/youruser/bt-drive-sync/venv/bin/python /home/youruser/bt-drive-sync/bt_drive_sync.py >> /home/youruser/bt-drive-sync/cron.log 2>&1
   ```

### Windows — Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**.
2. Name: `Buildertrend Photo Sync`.
3. Trigger: **Daily**, set the time (e.g., 9:00 PM).
4. Action: **Start a program**.
   - Program: `C:\path\to\venv\Scripts\python.exe`
   - Arguments: `C:\path\to\bt_drive_sync.py`
   - Start in: `C:\path\to\project-folder`
5. Finish. Right-click the task → **Run** to test it.

---

## How It Works

1. **Authenticates** with Buildertrend via OAuth2 client credentials.
2. **Fetches** all Daily Logs for today's date (tries `/v2/dailylogs` then `/v1/dailylogs`).
3. For each log with photos:
   - Extracts the project name.
   - Downloads each photo attachment.
   - Renames it: `ProjectName_YYYYMMDD_LogPhoto_01.jpg`.
   - Creates the Google Drive folder path if it does not exist.
   - Skips the upload if a file with the same name already exists (no duplicates).
   - Uploads the photo.
4. Writes a summary to `sync.log` (and to the console).

---

## Folder Structure Created in Google Drive

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
| `Missing required environment variables` | Check that `.env` exists and all values are filled in. |
| `Service account file not found` | Verify the `GOOGLE_SERVICE_ACCOUNT_FILE` path is correct and the file exists. |
| `Cannot authenticate with Buildertrend` | Double-check `BT_CLIENT_ID` and `BT_CLIENT_SECRET`. Contact your BT rep if they have expired. |
| `No daily logs found` | Confirm that daily logs were actually created in Buildertrend on the target date. |
| `403 on Google Drive` | Make sure you shared the Drive folder with the service account email (step 2d). |
| Photos appear in Drive but are 0 bytes | The download URL from Buildertrend may have expired. Re-run the script. |

---

## License

This project is provided as-is for internal use.

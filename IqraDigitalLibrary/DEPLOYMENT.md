# Deployment Guide — Iqra Muslim School Digital Library

This guide takes you from zero to a live Web App. Two paths are provided:
**A) Manual copy/paste** (no tooling) and **B) `clasp` CLI** (recommended for
developers). Either way, you finish by deploying the Web App and sharing the URL.

---

## Prerequisites

- A Google account (ideally on your school's Google Workspace domain).
- Permission to create Google Sheets and Apps Script projects.
- For Path B only: [Node.js](https://nodejs.org) and the
  [`clasp`](https://github.com/google/clasp) CLI (`npm install -g @google/clasp`).

---

## Step 1 — Create the spreadsheet

1. Go to <https://sheets.google.com> and create a **blank spreadsheet**.
2. Rename it, e.g. *Iqra Digital Library DB*.
3. Keep this tab open — the Apps Script project will be **bound** to it.

---

## Step 2 — Open the Apps Script editor

From the spreadsheet menu: **Extensions → Apps Script**. This creates a
container-bound script (so `SpreadsheetApp.getActiveSpreadsheet()` just works).

---

## Step 3 — Add the project files

### Path A — Manual copy/paste

1. In the editor, delete the default `Code.gs` contents.
2. For **each `.gs` file** in this folder, create a matching script file
   (**＋ → Script**) and paste the contents:
   `Code.gs`, `Config.gs`, `Setup.gs`, `Database.gs`, `Auth.gs`,
   `DriveService.gs`, `MediaService.gs`, `Dashboard.gs`, `Categories.gs`,
   `Engagement.gs`, `ImportExport.gs`.
3. For **each `.html` file**, create an HTML file (**＋ → HTML**) with the **same
   name** (without extension) and paste the contents:
   `Index`, `Styles`, `JavaScript`, `DashboardPage`, `RepositoryPage`,
   `UploadPage`, `CategoriesPage`, `ReportsPage`, `SettingsPage`.
4. Open **Project Settings** (gear icon) → tick *"Show appsscript.json manifest
   file in editor"*, then replace the manifest contents with this folder's
   `appsscript.json`.

> The `assets/` folder is **reference only** — do not paste it into the editor.

### Path B — `clasp` CLI (recommended)

```bash
# 1. Log in once
clasp login

# 2. From this folder, copy the example config and add your script ID
cp .clasp.json.example .clasp.json
#   -> edit .clasp.json and set "scriptId" (found in the editor URL)

# 3. Push every .gs / .html / appsscript.json file
clasp push
```

`clasp` ignores the `assets/` folder via the script type filter; if needed add a
`.claspignore` containing `assets/**` and `*.md`.

---

## Step 4 — Initialise the database

1. In the editor's function dropdown, select **`initDatabase`**.
2. Click **Run**. Approve the OAuth consent screen on first run
   (it requests Sheets, Drive, and basic profile scopes — see `appsscript.json`).
3. Check the spreadsheet: the tabs `MediaDatabase`, `Categories`, `Favorites`,
   `Comments`, `Downloads`, and `Users` now exist with headers, and a few sample
   departments are seeded. A root Drive folder *"Iqra Digital Library"* is created.

---

## Step 5 — Configure access & admins

Edit **`Config.gs`**:

- `ADMIN_EMAILS` — set to your real admin address(es).
- `RESTRICT_TO_DOMAIN` — set `true` and `SCHOOL_DOMAIN` to your Workspace domain
  to limit full access to school accounts (outsiders become read-only Viewers).
- `MAX_FILE_SIZE` / `ALLOWED_EXTENSIONS` — tune the upload security policy.

Re-run `initDatabase()` after changing admin emails if you want them seeded into
the `Users` sheet (safe to re-run; existing sheets are preserved).

---

## Step 6 — Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Select type **Web app**.
3. Configure:
   - **Description:** `Iqra Digital Library v1`
   - **Execute as:** *User accessing the web app*
     (so each teacher's own Drive/identity is used — recommended for
     multi-user). Use *Me* instead if you want all files owned by one library
     account.
   - **Who has access:**
     - *Anyone within `<your domain>`* — for a Workspace school (best).
     - *Anyone with a Google account* — broader access.
4. Click **Deploy**, authorise, and copy the **Web App URL**.

> **Updating later:** Deploy → Manage deployments → edit the existing deployment
> and pick a new version, so the URL stays stable.

---

## Step 7 — Verify

Open the Web App URL and confirm:

- The dashboard loads with stat cards and charts (zeros on a fresh DB).
- **Add New Media** → drag a small PDF/image, fill the form, save. The file
  appears in the Drive folder for its type, and a row appears in `MediaDatabase`.
- **All Media** → the item shows as a card; toggle to table view; search/filter;
  open the detail modal (preview, QR code, comments, favorite, download).
- **Reports** → charts render; *Download PDF* and *Export Excel* produce files.
- **Settings** → dark-mode toggle works; CSV export/import works.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Sheet "MediaDatabase" not found` | Run `initDatabase()` (Step 4). |
| Upload fails with *"not allowed"* | Extension not in `ALLOWED_EXTENSIONS`, or file > `MAX_FILE_SIZE`. |
| Thumbnails blank | Drive thumbnails can lag for a minute after upload, or link-sharing is blocked by a Workspace policy. The icon fallback is shown automatically. |
| `Permission denied: requires "Teacher"` | The signed-in user is a Viewer. Add them to the `Users` sheet with role `Teacher`/`Admin`, or check `RESTRICT_TO_DOMAIN`. |
| Standalone (non-bound) script | Set a Script Property `SPREADSHEET_ID` to your sheet's ID (see `Database.gs`). |

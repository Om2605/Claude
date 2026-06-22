# 📚 Iqra Muslim School — Digital Library

A modern, centralized media repository for the school's teaching materials,
built entirely on the Google stack: **Google Apps Script + Google Sheets +
Google Drive**, served as a responsive **Web App**.

It lets teachers upload, organise, search, preview, and share documents,
images, video, audio, PDFs, and external links — with analytics, role-based
access, and a clean blue/white UI that works on phones, tablets, and desktops.

---

## ✨ Features

**Core**
- 🔐 Google-account sign-in with optional school-domain restriction and
  **role-based access** (Admin / Teacher / Viewer).
- ☁️ **Upload to Drive** with drag & drop and a real-time progress bar; files are
  auto-filed into type folders (Documents, Images, Videos, Audio, PDFs, Links).
- 🗂️ Full **CRUD** with **card & table** views, advanced **filtering**
  (title, type, department, grade) and **pagination**.
- 🖼️ Thumbnails/previews, direct **open** and **download**, and **view-count**
  tracking.
- 📊 **Dashboard** + **Reports** with Chart.js (counts by type/department/status,
  monthly upload trend, most-viewed, totals).
- 📱 Fully **responsive** with a collapsible sidebar.

**Advanced**
- 🔗 **QR codes** for instant media sharing.
- ❤️ **Favorites / bookmarks** per user.
- 💬 **Comments & reviews** with star ratings.
- 📄 **PDF report** download and **CSV (Excel) import/export**.
- 🌙 **Dark mode** toggle.

**Security**
- Server-side **permission checks** on every write/delete.
- Upload **extension whitelist** + size limit, validated on the server.
- Confirmation dialogs to prevent accidental deletion.
- **Concurrency-safe** writes via `LockService` for multiple simultaneous teachers.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, **Tailwind CSS** (CDN), JavaScript |
| Backend | Google Apps Script (V8) |
| Database | Google Sheets |
| Storage | Google Drive |
| UI / UX | Font Awesome, SweetAlert2, Chart.js, QRCode.js |
| Transport | `google.script.run` (Promise-wrapped) |

---

## 🗂️ Project Structure

```
IqraDigitalLibrary/
├── appsscript.json          # Manifest: scopes + Web App config
├── .clasp.json.example      # clasp config template (local dev)
│
├── Code.gs                  # doGet(), include(), getBootstrapData()
├── Config.gs                # All settings: columns, roles, folders, limits
├── Setup.gs                 # initDatabase(): creates sheets + seeds data
├── Database.gs              # Sheet data-access layer (read/write/lock/id)
├── Auth.gs                  # Identity, roles, requireRole() guards, Users CRUD
├── DriveService.gs          # uploadFile(), folder & sharing & thumbnails
├── MediaService.gs          # saveMediaData/getMediaList/searchMedia/update/delete
├── Dashboard.gs             # getDashboardData() aggregations
├── Categories.gs            # Department / subject-group CRUD
├── Engagement.gs            # Favorites + comments/reviews
├── ImportExport.gs          # CSV export/import + PDF report
│
├── Index.html               # SPA shell (sidebar + header + content host)
├── Styles.html              # Tailwind theme config + custom component CSS
├── JavaScript.html          # All client logic (router, api, pages, helpers)
├── DashboardPage.html       # ┐
├── RepositoryPage.html      # │
├── UploadPage.html          # ├ page-view <template>s cloned by the router
├── CategoriesPage.html      # │
├── ReportsPage.html         # │
├── SettingsPage.html        # ┘
│
├── assets/                  # Readable reference mirrors (NOT loaded by GAS)
│   ├── styles.css           #   pure CSS copy of Styles.html
│   └── app.js               #   architecture map of JavaScript.html
│
├── SHEET_SCHEMA.md          # Database schema + sample rows (template)
├── DEPLOYMENT.md            # Step-by-step Web App deployment guide
└── README.md                # This file
```

> **Why CSS/JS live in `.html` files:** Apps Script's `HtmlService` only serves
> `.html` and runs `.gs`. CSS and client JS are therefore authored as
> `Styles.html` / `JavaScript.html` and injected via the `include()` helper
> (`<?!= include('Styles') ?>`). The `assets/` copies exist purely for review.

---

## 🏗️ Architecture at a glance

```
Browser (SPA: Index.html + Styles + JavaScript + page templates)
        │  google.script.run  (Promise-wrapped in `api.*`)
        ▼
Apps Script backend (Code.gs entry → service modules, role-guarded)
        ├── Google Sheets  ← Database.gs (tables: MediaDatabase, Categories, …)
        └── Google Drive   ← DriveService.gs (type folders, sharing, thumbnails)
```

- **Single source of config** in `Config.gs` (column order, roles, folders,
  security limits) so nothing is hard-coded elsewhere.
- **Thin client-callable functions** that validate permissions, delegate to a
  service module, and return JSON-safe objects.
- **Hash-based SPA router** mounts page `<template>`s and tears down Chart.js
  instances between views.

---

## 🚀 Quick Start

1. Create a Google Sheet → **Extensions → Apps Script**.
2. Add the `.gs` and `.html` files (copy/paste or `clasp push`).
3. Run **`initDatabase()`** once and approve the permissions.
4. Set `ADMIN_EMAILS` (and optionally domain restriction) in `Config.gs`.
5. **Deploy → New deployment → Web app**, choose access, copy the URL.

Full details — including the `clasp` workflow and troubleshooting — are in
[`DEPLOYMENT.md`](./DEPLOYMENT.md). The database layout is documented in
[`SHEET_SCHEMA.md`](./SHEET_SCHEMA.md).

---

## 🔧 Required Apps Script functions (per spec)

`doGet()` · `include()` · `uploadFile()` · `saveMediaData()` · `getMediaList()`
· `updateMedia()` · `deleteMedia()` · `searchMedia()` · `getDashboardData()`

All are implemented and client-callable; see the file map above for their homes.

---

## 🧭 Extending the system

The code is modular and commented for scalability. Common extensions:

- **New media type** → add to `CONFIG.MEDIA_TYPES` + `CONFIG.TYPE_FOLDERS`
  (and an icon in `typeIcon()` in `JavaScript.html`).
- **New field** → append to `CONFIG.MEDIA_COLUMNS` / `MEDIA_HEADERS`
  (append only — never reorder existing columns).
- **New page** → add a `*Page.html` template, register it in the `PAGES` map and
  the sidebar nav.
- **Email notifications, versioning, tagging** → add a new `*.gs` service module
  and expose thin client-callable wrappers.

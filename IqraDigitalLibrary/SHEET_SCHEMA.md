# Google Sheets Database Schema

The system uses a single Google Spreadsheet as its database. Running
`initDatabase()` once (see `DEPLOYMENT.md`) creates every sheet below with the
correct headers automatically. This document is the manual reference / template
in case you want to build the spreadsheet by hand.

> All sheets use **row 1 as the (frozen) header row**; data begins on row 2.

---

## 1. `MediaDatabase` (primary table)

The 13 required columns, in exact order:

| # | Column | Type | Notes |
|---|--------|------|-------|
| 1 | Media ID | text | Auto-generated, e.g. `MED-1718000000000-481` |
| 2 | Media Title | text | Required |
| 3 | Media Type | text | One of: Document, Image, Video, Audio, PDF, Link |
| 4 | Department / Subject Group | text | Matches a row in `Categories` |
| 5 | Grade Level | text | e.g. `Grade 5`, `All Grades` |
| 6 | Description | text | Optional |
| 7 | Creator Name | text | Defaults to uploader's email |
| 8 | Upload Date | date | Set automatically on create |
| 9 | Google Drive Link | url | `webViewLink` or external URL |
| 10 | Drive File ID | text | Empty for external links |
| 11 | Cover Image / Thumbnail URL | url | Drive thumbnail endpoint |
| 12 | View Count | number | Starts at 0, incremented on view |
| 13 | Publication Status | text | Published / Draft / Archived |

### Sample rows

| Media ID | Media Title | Media Type | Department / Subject Group | Grade Level | Description | Creator Name | Upload Date | Google Drive Link | Drive File ID | Cover Image / Thumbnail URL | View Count | Publication Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MED-1718000000001-101 | Surah Al-Fatihah Recitation | Audio | Quran & Islamic Studies | Grade 1 | Tajweed practice audio | teacher@iqraschool.edu | 2026-06-01 | https://drive.google.com/file/d/AUDIO_ID/view | AUDIO_ID | https://drive.google.com/thumbnail?id=AUDIO_ID&sz=w640 | 24 | Published |
| MED-1718000000002-102 | Arabic Alphabet Flashcards | PDF | Arabic Language | Kindergarten | Printable flashcards | teacher@iqraschool.edu | 2026-06-03 | https://drive.google.com/file/d/PDF_ID/view | PDF_ID | https://drive.google.com/thumbnail?id=PDF_ID&sz=w640 | 58 | Published |
| MED-1718000000003-103 | Intro to Fractions | Video | Mathematics | Grade 4 | Animated explainer | teacher@iqraschool.edu | 2026-06-05 | https://www.youtube.com/watch?v=XXXX | | | 12 | Draft |

---

## 2. `Categories`

| Category ID | Name | Type | Description | Created Date |
|---|---|---|---|---|
| CAT-…-1 | Quran & Islamic Studies | Department | | 2026-06-01 |
| CAT-…-2 | Arabic Language | Department | | 2026-06-01 |
| CAT-…-3 | Mathematics | Department | | 2026-06-01 |

`Type` is usually `Department`; values of type `Department` populate the
department dropdowns in the UI.

---

## 3. `Favorites`

One row per (user, media) bookmark.

| Favorite ID | User Email | Media ID | Created Date |
|---|---|---|---|
| FAV-…-1 | teacher@iqraschool.edu | MED-…-101 | 2026-06-10 |

---

## 4. `Comments`

Comments / reviews with an optional 1–5 star rating.

| Comment ID | Media ID | User Email | User Name | Rating | Comment | Created Date |
|---|---|---|---|---|---|---|
| CMT-…-1 | MED-…-101 | teacher@iqraschool.edu | teacher | 5 | Very clear recitation. | 2026-06-11 |

---

## 5. `Downloads`

Analytics log for downloads and opens (feeds the dashboard totals).

| Download ID | Media ID | User Email | Action | Timestamp |
|---|---|---|---|---|
| DL-…-1 | MED-…-102 | teacher@iqraschool.edu | download | 2026-06-12T09:30:00Z |

---

## 6. `Users`

Optional role provisioning. If a signed-in user is not listed here they receive
the `DEFAULT_ROLE` from `Config.gs` (Teacher). Bootstrap admins in
`CONFIG.ADMIN_EMAILS` are always treated as Admin.

| Email | Display Name | Role | Added Date |
|---|---|---|---|
| admin@iqraschool.edu | Library Admin | Admin | 2026-06-01 |
| teacher@iqraschool.edu | Class Teacher | Teacher | 2026-06-01 |

**Roles:** `Admin` (full control incl. deleting categories/users) ›
`Teacher` (add/edit/delete media, manage categories) › `Viewer` (read-only).

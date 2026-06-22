/*
 * assets/app.js
 * ---------------------------------------------------------------------------
 * READABLE REFERENCE / ARCHITECTURE MAP of the client-side application.
 *
 * NOTE: Google Apps Script cannot serve standalone .js files to an HtmlService
 * page — the live, executed source of truth is JavaScript.html. This file is a
 * documentation companion that explains the module layout so a developer can
 * navigate the code quickly. The full implementation lives in JavaScript.html.
 *
 * If you extend the app, edit JavaScript.html (it ships with the Web App) and
 * keep this map up to date.
 * ---------------------------------------------------------------------------
 *
 * MODULE LAYOUT (JavaScript.html)
 * --------------------------------
 * 1. SERVER BRIDGE
 *    - call(fn, ...args)  -> Promise wrapper around google.script.run
 *    - api.*              -> one method per backend (.gs) function
 *    - Toast / showError  -> SweetAlert2 helpers
 *
 * 2. APP STATE & BOOT
 *    - APP                -> global state (user, options, settings, favorites, charts, repo)
 *    - boot()             -> loads getBootstrapData(), paints chrome, starts router
 *
 * 3. ROUTER
 *    - PAGES map          -> { template, render } per page
 *    - route()            -> hash-based navigation + role gating + chart cleanup
 *
 * 4. DASHBOARD PAGE        -> renderDashboard(): stat cards + Chart.js doughnut/line
 * 5. REPOSITORY PAGE       -> renderRepository(), loadMedia(), paintMedia()
 *                             card/table toggle, filters, pagination, edit/delete
 * 6. UPLOAD PAGE           -> renderUpload(): drag&drop, FileReader -> base64,
 *                             progress bar, uploadFile() + saveMediaData()
 * 7. CATEGORIES PAGE       -> renderCategories(): add/list/delete departments
 * 8. REPORTS PAGE          -> renderReports(): charts + PDF/CSV export
 * 9. SETTINGS PAGE         -> renderSettings(): theme, import/export, security info
 * 10. SHARED HELPERS        -> openDetail() (preview/QR/comments/favorite/download),
 *                             Chart.js builders, theme toggle, sidebar, formatters
 *
 * DATA CONTRACT (server -> client)
 * --------------------------------
 * Media record keys (see Config.gs MEDIA_COLUMNS):
 *   mediaId, title, mediaType, department, gradeLevel, description,
 *   creatorName, uploadDate, driveLink, driveFileId, thumbnailUrl,
 *   viewCount, status
 *
 * Paginated list envelope:
 *   { items: [...], total, page, pageSize, totalPages }
 *
 * Dashboard payload:
 *   { totals:{media,views,downloads,departments},
 *     byType, byDepartment, byStatus: {labels:[],values:[]},
 *     uploadsByMonth: {labels:[],values:[]},
 *     topViewed:[...], recent:[...] }
 */

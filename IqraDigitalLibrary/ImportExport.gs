/**
 * ImportExport.gs
 * ---------------------------------------------------------------------------
 * Data portability and reporting.
 *
 *   - exportMediaCsv()        -> CSV string (Excel-compatible) for download.
 *   - importMediaCsv(csv)     -> bulk-append validated rows from a CSV string.
 *   - generateReportPdf()     -> base64 PDF of a statistics summary.
 *
 * The client receives base64 / text and triggers the browser download, so we
 * never need extra Drive files for transient exports.
 * ---------------------------------------------------------------------------
 */

/**
 * Exports the entire MediaDatabase as CSV text.
 * @return {Object} { fileName, mimeType, content (CSV string) }
 */
function exportMediaCsv() {
  var media = readAllMedia_();
  var rows = [CONFIG.MEDIA_HEADERS];

  media.forEach(function (m) {
    rows.push(CONFIG.MEDIA_COLUMNS.map(function (f) { return m[f]; }));
  });

  var csv = rows.map(function (r) {
    return r.map(csvEscape_).join(',');
  }).join('\r\n');

  return {
    fileName: 'IqraLibrary_Media_' + dateStamp_() + '.csv',
    mimeType: 'text/csv',
    content: csv
  };
}

/**
 * Imports media rows from CSV text. The header row is matched by name against
 * CONFIG.MEDIA_HEADERS; unknown columns are ignored. Each row is validated.
 * @param {string} csv Raw CSV text.
 * @return {Object} { imported, skipped, errors }
 */
function importMediaCsv(csv) {
  requireRole('Teacher');
  if (!csv) throw new Error('No CSV content provided.');

  var matrix = parseCsv_(csv);
  if (matrix.length < 2) throw new Error('CSV has no data rows.');

  var header = matrix[0].map(function (h) { return String(h).trim(); });
  // Map each MEDIA header to its column index in the uploaded file.
  var colIndex = {};
  CONFIG.MEDIA_HEADERS.forEach(function (h, i) {
    var idx = header.indexOf(h);
    if (idx !== -1) colIndex[CONFIG.MEDIA_COLUMNS[i]] = idx;
  });

  var imported = 0, skipped = 0, errors = [];

  for (var r = 1; r < matrix.length; r++) {
    var line = matrix[r];
    if (!line || line.join('').trim() === '') { skipped++; continue; }

    var record = {};
    CONFIG.MEDIA_COLUMNS.forEach(function (field) {
      if (colIndex[field] !== undefined) record[field] = line[colIndex[field]];
    });

    try {
      saveMediaData(record);
      imported++;
    } catch (err) {
      skipped++;
      errors.push('Row ' + (r + 1) + ': ' + err.message);
    }
  }

  return { imported: imported, skipped: skipped, errors: errors };
}

/**
 * Generates a PDF statistics report and returns it base64-encoded.
 * @return {Object} { fileName, mimeType, base64 }
 */
function generateReportPdf() {
  var data = getDashboardData();
  var tz = Session.getScriptTimeZone();
  var when = Utilities.formatDate(new Date(), tz, 'dd MMM yyyy HH:mm');

  // Build a simple, self-contained HTML report, then convert to PDF.
  var html = '' +
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;padding:24px;}' +
    'h1{color:#1d4ed8;margin-bottom:0;}h2{color:#2563eb;border-bottom:2px solid #dbeafe;padding-bottom:4px;}' +
    '.sub{color:#6b7280;margin-top:4px;}' +
    'table{border-collapse:collapse;width:100%;margin:12px 0;}' +
    'th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;font-size:13px;}' +
    'th{background:#eff6ff;color:#1e3a8a;}' +
    '.cards{margin:16px 0;}' +
    '.card{display:inline-block;width:23%;margin-right:1%;background:#eff6ff;border-radius:8px;padding:12px;}' +
    '.num{font-size:26px;font-weight:bold;color:#1d4ed8;}' +
    '</style></head><body>' +
    '<h1>' + CONFIG.SCHOOL_NAME + '</h1>' +
    '<div class="sub">Digital Library — Statistical Report &middot; Generated ' + when + '</div>' +
    '<div class="cards">' +
      statCard_('Total Media', data.totals.media) +
      statCard_('Total Views', data.totals.views) +
      statCard_('Total Downloads', data.totals.downloads) +
      statCard_('Departments', data.totals.departments) +
    '</div>' +
    '<h2>Media by Type</h2>' + seriesTable_('Type', data.byType) +
    '<h2>Media by Department</h2>' + seriesTable_('Department', data.byDepartment) +
    '<h2>Most Viewed</h2>' + topTable_(data.topViewed) +
    '</body></html>';

  var blob = Utilities.newBlob(html, 'text/html', 'report.html').getAs('application/pdf');
  return {
    fileName: 'IqraLibrary_Report_' + dateStamp_() + '.pdf',
    mimeType: 'application/pdf',
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

/* ------------------------------- Helpers -------------------------------- */

/** @private */
function statCard_(label, num) {
  return '<div class="card"><div class="num">' + num + '</div><div>' + label + '</div></div>';
}

/** @private */
function seriesTable_(label, series) {
  var rows = '';
  for (var i = 0; i < series.labels.length; i++) {
    rows += '<tr><td>' + escapeHtml_(series.labels[i]) + '</td><td>' + series.values[i] + '</td></tr>';
  }
  return '<table><tr><th>' + label + '</th><th>Count</th></tr>' + rows + '</table>';
}

/** @private */
function topTable_(items) {
  var rows = '';
  items.forEach(function (m) {
    rows += '<tr><td>' + escapeHtml_(m.title) + '</td><td>' + escapeHtml_(m.mediaType) +
            '</td><td>' + (Number(m.viewCount) || 0) + '</td></tr>';
  });
  return '<table><tr><th>Title</th><th>Type</th><th>Views</th></tr>' + rows + '</table>';
}

/** Escapes a single CSV field. @private */
function csvEscape_(v) {
  var s = (v == null) ? '' : String(v);
  if (/[",\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Minimal RFC-4180 CSV parser that handles quoted fields and embedded commas.
 * @param {string} text CSV text.
 * @return {string[][]}
 * @private
 */
function parseCsv_(text) {
  var rows = [], row = [], field = '', inQuotes = false;
  text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** @private */
function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** @private */
function dateStamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
}

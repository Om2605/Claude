/**
 * Dashboard.gs
 * ---------------------------------------------------------------------------
 * Aggregations for the Dashboard and Statistical Reports pages.
 *
 * getDashboardData() returns everything the front-end charts and stat cards
 * need in a single call: totals, breakdown by type, downloads, top media, and
 * chart-ready series for Chart.js.
 * ---------------------------------------------------------------------------
 */

/**
 * Computes dashboard metrics.
 * @return {Object} Aggregated statistics.
 */
function getDashboardData() {
  var media = readAllMedia_();
  var downloads = readObjects_(CONFIG.SHEETS.DOWNLOADS,
    ['downloadId', 'mediaId', 'userEmail', 'action', 'timestamp']);

  // --- Totals -------------------------------------------------------------
  var totalMedia = media.length;
  var totalViews = media.reduce(function (sum, m) { return sum + (Number(m.viewCount) || 0); }, 0);
  var totalDownloads = downloads.filter(function (d) { return d.action === 'download'; }).length;

  // --- Counts by type -----------------------------------------------------
  var byType = {};
  CONFIG.MEDIA_TYPES.forEach(function (t) { byType[t] = 0; });
  media.forEach(function (m) {
    if (byType[m.mediaType] === undefined) byType[m.mediaType] = 0;
    byType[m.mediaType]++;
  });

  // --- Counts by department ----------------------------------------------
  var byDept = {};
  media.forEach(function (m) {
    var d = m.department || 'Uncategorised';
    byDept[d] = (byDept[d] || 0) + 1;
  });

  // --- Counts by status ---------------------------------------------------
  var byStatus = {};
  CONFIG.STATUS_OPTIONS.forEach(function (s) { byStatus[s] = 0; });
  media.forEach(function (m) {
    if (byStatus[m.status] === undefined) byStatus[m.status] = 0;
    byStatus[m.status]++;
  });

  // --- Uploads over the last 6 months ------------------------------------
  var uploadsByMonth = buildMonthlySeries_(media, 6);

  // --- Top viewed media ---------------------------------------------------
  var topViewed = media.slice().sort(function (a, b) {
    return (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0);
  }).slice(0, 5);

  // --- Recent uploads -----------------------------------------------------
  var recent = media.slice().sort(byUploadDateDesc_).slice(0, 5);

  return {
    totals: {
      media: totalMedia,
      views: totalViews,
      downloads: totalDownloads,
      departments: Object.keys(byDept).length
    },
    byType: toSeries_(byType),
    byDepartment: toSeries_(byDept),
    byStatus: toSeries_(byStatus),
    uploadsByMonth: uploadsByMonth,
    topViewed: topViewed,
    recent: recent
  };
}

/* ------------------------------- Helpers -------------------------------- */

/**
 * Converts a {label: count} map into Chart.js-friendly { labels, values }.
 * @param {Object} map Map of label to count.
 * @return {{labels: string[], values: number[]}}
 * @private
 */
function toSeries_(map) {
  var labels = Object.keys(map);
  return {
    labels: labels,
    values: labels.map(function (k) { return map[k]; })
  };
}

/**
 * Builds a monthly upload count series for the last N months.
 * @param {Object[]} media Media records.
 * @param {number} months How many months back.
 * @return {{labels: string[], values: number[]}}
 * @private
 */
function buildMonthlySeries_(media, months) {
  var now = new Date();
  var buckets = [];
  var index = {};

  for (var i = months - 1; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var key = d.getFullYear() + '-' + (d.getMonth() + 1);
    var label = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM yyyy');
    index[key] = buckets.length;
    buckets.push({ label: label, value: 0 });
  }

  media.forEach(function (m) {
    if (!m.uploadDate) return;
    var d = new Date(m.uploadDate);
    var key = d.getFullYear() + '-' + (d.getMonth() + 1);
    if (index[key] !== undefined) buckets[index[key]].value++;
  });

  return {
    labels: buckets.map(function (b) { return b.label; }),
    values: buckets.map(function (b) { return b.value; })
  };
}

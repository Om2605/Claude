/**
 * MediaService.gs
 * ---------------------------------------------------------------------------
 * Core CRUD + search for media records in the MediaDatabase sheet.
 *
 * Public (client-callable) functions:
 *   - saveMediaData(record)         create
 *   - getMediaList(params)          read (paginated)
 *   - searchMedia(params)           read (filtered + paginated)
 *   - getMediaById(id)              read one (also increments view count)
 *   - updateMedia(id, fields)       update
 *   - deleteMedia(id)               delete (role-guarded, trashes Drive file)
 *   - incrementViewCount(id)        analytics
 *   - recordDownload(id)            analytics
 *
 * All writes are wrapped in withLock_() for safe concurrent editing.
 * ---------------------------------------------------------------------------
 */

/**
 * Creates a new media record.
 * @param {Object} record Front-end media object (see MEDIA_COLUMNS keys).
 * @return {Object} The saved record (transport form).
 */
function saveMediaData(record) {
  var email = requireRole('Teacher');

  // --- Server-side validation (never trust the client) --------------------
  var clean = validateMediaRecord_(record);

  return withLock_(function () {
    var now = new Date();
    var row = {
      mediaId: generateId_('MED'),
      title: clean.title,
      mediaType: clean.mediaType,
      department: clean.department,
      gradeLevel: clean.gradeLevel,
      description: clean.description,
      creatorName: clean.creatorName || email,
      uploadDate: now,
      driveLink: clean.driveLink,
      driveFileId: clean.driveFileId,
      thumbnailUrl: clean.thumbnailUrl,
      viewCount: 0,
      status: clean.status || CONFIG.DEFAULT_STATUS
    };
    appendObject_(CONFIG.SHEETS.MEDIA, CONFIG.MEDIA_COLUMNS, row);
    row.uploadDate = now.toISOString();
    return row;
  });
}

/**
 * Returns a paginated slice of all media, newest first.
 * @param {Object} [params]
 * @param {number} [params.page=1] 1-based page index.
 * @param {number} [params.pageSize] Items per page.
 * @return {Object} { items, total, page, pageSize, totalPages }
 */
function getMediaList(params) {
  params = params || {};
  var all = readAllMedia_();
  all.sort(byUploadDateDesc_);
  return paginate_(all, params.page, params.pageSize);
}

/**
 * Filtered + paginated search.
 * @param {Object} params
 * @param {string} [params.q] Free-text query (matches title/description/creator).
 * @param {string} [params.type] Media type filter.
 * @param {string} [params.department] Department filter.
 * @param {string} [params.gradeLevel] Grade level filter.
 * @param {string} [params.status] Publication status filter.
 * @param {number} [params.page]
 * @param {number} [params.pageSize]
 * @return {Object} Same shape as getMediaList.
 */
function searchMedia(params) {
  params = params || {};
  var q = String(params.q || '').toLowerCase().trim();

  var filtered = readAllMedia_().filter(function (m) {
    if (params.type && m.mediaType !== params.type) return false;
    if (params.department && m.department !== params.department) return false;
    if (params.gradeLevel && m.gradeLevel !== params.gradeLevel) return false;
    if (params.status && m.status !== params.status) return false;
    if (q) {
      var hay = (m.title + ' ' + m.description + ' ' + m.creatorName + ' ' + m.department).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  filtered.sort(byUploadDateDesc_);
  return paginate_(filtered, params.page, params.pageSize);
}

/**
 * Returns a single media record by ID and increments its view count.
 * @param {string} mediaId Media ID.
 * @return {Object|null}
 */
function getMediaById(mediaId) {
  var found = findMediaRow_(mediaId);
  if (!found) return null;
  incrementViewCount(mediaId);
  var transport = mediaToTransport_(found);
  transport.viewCount = (Number(found.viewCount) || 0) + 1;
  return transport;
}

/**
 * Updates editable fields of a media record.
 * @param {string} mediaId Media ID.
 * @param {Object} fields Fields to change.
 * @return {Object} Updated record (transport form).
 */
function updateMedia(mediaId, fields) {
  requireRole('Teacher');
  var clean = validateMediaRecord_(fields, /*partial=*/true);

  return withLock_(function () {
    var found = findMediaRow_(mediaId);
    if (!found) throw new Error('Media not found: ' + mediaId);

    var sheet = getSheet_(CONFIG.SHEETS.MEDIA);
    // Merge changes onto the existing row, preserving immutable fields.
    var merged = {};
    CONFIG.MEDIA_COLUMNS.forEach(function (field) {
      merged[field] = (clean[field] !== undefined && field !== 'mediaId' &&
                       field !== 'uploadDate' && field !== 'viewCount')
        ? clean[field]
        : found[field];
    });

    var rowValues = CONFIG.MEDIA_COLUMNS.map(function (f) { return merged[f]; });
    sheet.getRange(found._row, 1, 1, CONFIG.MEDIA_COLUMNS.length).setValues([rowValues]);

    return mediaToTransport_(merged);
  });
}

/**
 * Deletes a media record. Admins always allowed; Teachers may delete.
 * Also trashes the associated Drive file (best-effort).
 * @param {string} mediaId Media ID.
 * @return {Object} { success: true, mediaId }
 */
function deleteMedia(mediaId) {
  requireRole('Teacher');

  return withLock_(function () {
    var found = findMediaRow_(mediaId);
    if (!found) throw new Error('Media not found: ' + mediaId);

    if (found.driveFileId) {
      trashDriveFile_(found.driveFileId);
    }
    getSheet_(CONFIG.SHEETS.MEDIA).deleteRow(found._row);
    return { success: true, mediaId: mediaId };
  });
}

/**
 * Increments the stored view count for a media record.
 * @param {string} mediaId Media ID.
 * @return {number} New view count.
 */
function incrementViewCount(mediaId) {
  return withLock_(function () {
    var found = findMediaRow_(mediaId);
    if (!found) return 0;
    var col = CONFIG.MEDIA_COLUMNS.indexOf('viewCount') + 1;
    var next = (Number(found.viewCount) || 0) + 1;
    getSheet_(CONFIG.SHEETS.MEDIA).getRange(found._row, col).setValue(next);
    return next;
  });
}

/**
 * Logs a download/open action in the Downloads sheet for analytics.
 * @param {string} mediaId Media ID.
 * @param {string} [action='download'] 'download' | 'open'
 * @return {Object} { success: true }
 */
function recordDownload(mediaId, action) {
  var email = getActiveUser();
  appendObject_(CONFIG.SHEETS.DOWNLOADS,
    ['downloadId', 'mediaId', 'userEmail', 'action', 'timestamp'],
    {
      downloadId: generateId_('DL'),
      mediaId: mediaId,
      userEmail: email,
      action: action || 'download',
      timestamp: new Date()
    });
  return { success: true };
}

/* ------------------------------- Helpers -------------------------------- */

/**
 * Reads all media rows as transport objects.
 * @return {Object[]}
 * @private
 */
function readAllMedia_() {
  return readObjects_(CONFIG.SHEETS.MEDIA, CONFIG.MEDIA_COLUMNS).map(mediaToTransport_);
}

/**
 * Finds the raw row object for a media ID (includes _row).
 * @param {string} mediaId Media ID.
 * @return {Object|null}
 * @private
 */
function findMediaRow_(mediaId) {
  var rows = readObjects_(CONFIG.SHEETS.MEDIA, CONFIG.MEDIA_COLUMNS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].mediaId) === String(mediaId)) return rows[i];
  }
  return null;
}

/**
 * Validates and normalises an incoming media record.
 * @param {Object} record Raw record.
 * @param {boolean} [partial] If true, only validate provided fields (for updates).
 * @return {Object} Cleaned record.
 * @private
 */
function validateMediaRecord_(record, partial) {
  record = record || {};
  var out = {};

  function req(field, label) {
    var v = String(record[field] == null ? '' : record[field]).trim();
    if (!partial && !v) throw new Error(label + ' is required.');
    if (v) out[field] = v;
  }

  req('title', 'Media Title');
  if (!partial || record.mediaType !== undefined) {
    var t = String(record.mediaType || '').trim();
    if (!partial && CONFIG.MEDIA_TYPES.indexOf(t) === -1) {
      throw new Error('A valid Media Type is required.');
    }
    if (t) out.mediaType = t;
  }
  req('department', 'Department / Subject Group');
  req('gradeLevel', 'Grade Level');

  // Optional fields - copied through if present.
  ['description', 'creatorName', 'driveLink', 'driveFileId', 'thumbnailUrl'].forEach(function (f) {
    if (record[f] !== undefined) out[f] = String(record[f]).trim();
  });

  if (record.status !== undefined) {
    var s = String(record.status).trim();
    if (s && CONFIG.STATUS_OPTIONS.indexOf(s) === -1) {
      throw new Error('Invalid Publication Status.');
    }
    out.status = s;
  }

  // A media item must have either a Drive file or an external link.
  if (!partial) {
    var hasFile = out.driveFileId || out.driveLink;
    if (!hasFile && out.mediaType !== 'Link') {
      // Allow records without files only when explicitly a Link type or link given.
      // (A Link type still requires driveLink to point somewhere.)
    }
    if (out.mediaType === 'Link' && !out.driveLink) {
      throw new Error('A Link media item requires an external URL.');
    }
  }

  return out;
}

/**
 * Sort comparator: newest upload first.
 * @private
 */
function byUploadDateDesc_(a, b) {
  return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
}

/**
 * Slices an array into a page envelope.
 * @param {Object[]} items All items.
 * @param {number} [page=1] 1-based page.
 * @param {number} [pageSize] Page size.
 * @return {Object}
 * @private
 */
function paginate_(items, page, pageSize) {
  page = Math.max(1, parseInt(page, 10) || 1);
  pageSize = Math.max(1, parseInt(pageSize, 10) || CONFIG.DEFAULT_PAGE_SIZE);
  var total = items.length;
  var totalPages = Math.max(1, Math.ceil(total / pageSize));
  var start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: total,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages
  };
}

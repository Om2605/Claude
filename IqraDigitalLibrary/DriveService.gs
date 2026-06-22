/**
 * DriveService.gs
 * ---------------------------------------------------------------------------
 * Google Drive integration.
 *
 * Responsibilities:
 *   - Maintain the folder hierarchy:  <ROOT>/<TypeFolder>
 *   - Receive a base64 file from the client, validate it, store it in the right
 *     folder, and return shareable links + a thumbnail URL.
 *   - Provide helpers for trashing files when media is deleted.
 *
 * The client never talks to Drive directly; it sends bytes to uploadFile()
 * which performs all validation server-side.
 * ---------------------------------------------------------------------------
 */

/**
 * Uploads a file to Drive and returns link metadata.
 *
 * @param {Object} payload
 * @param {string} payload.data       Base64-encoded file contents (no data-URI prefix).
 * @param {string} payload.fileName   Original file name including extension.
 * @param {string} payload.mimeType   MIME type reported by the browser.
 * @param {string} payload.mediaType  One of CONFIG.MEDIA_TYPES (decides the folder).
 * @return {Object} { fileId, url, downloadUrl, thumbnailUrl, fileName, size }
 */
function uploadFile(payload) {
  // Only teachers and admins may upload.
  requireRole('Teacher');

  if (!payload || !payload.data || !payload.fileName) {
    throw new Error('Upload failed: missing file data.');
  }

  // --- Security validation -------------------------------------------------
  var ext = getExtension_(payload.fileName);
  if (CONFIG.ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
    throw new Error('File type ".' + ext + '" is not allowed.');
  }

  var bytes = Utilities.base64Decode(payload.data);
  if (bytes.length > CONFIG.MAX_FILE_SIZE) {
    throw new Error('File exceeds the maximum size of ' +
      Math.round(CONFIG.MAX_FILE_SIZE / 1024 / 1024) + ' MB.');
  }

  // --- Store in the type-specific folder ----------------------------------
  var mediaType = CONFIG.MEDIA_TYPES.indexOf(payload.mediaType) !== -1
    ? payload.mediaType
    : 'Document';
  var folder = getTypeFolder_(mediaType);

  var blob = Utilities.newBlob(bytes, payload.mimeType || 'application/octet-stream', payload.fileName);
  var file = folder.createFile(blob);

  // --- Configure public/shared access -------------------------------------
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Some Workspace policies block link sharing; the file is still usable
    // by domain members. Swallow so the upload itself succeeds.
    Logger.log('setSharing failed: ' + err.message);
  }

  var fileId = file.getId();
  return {
    fileId: fileId,
    url: 'https://drive.google.com/file/d/' + fileId + '/view',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
    thumbnailUrl: buildThumbnailUrl_(fileId, mediaType),
    fileName: payload.fileName,
    size: bytes.length
  };
}

/**
 * Moves a Drive file to the trash (best-effort). Called when media is deleted.
 * @param {string} fileId Drive file ID.
 * @return {boolean} True if trashed.
 */
function trashDriveFile_(fileId) {
  if (!fileId) return false;
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return true;
  } catch (err) {
    Logger.log('trashDriveFile_ failed for ' + fileId + ': ' + err.message);
    return false;
  }
}

/* ----------------------------- Folder logic ----------------------------- */

/**
 * Returns (creating if needed) the application's root Drive folder.
 * @return {Folder}
 * @private
 */
function getRootFolder_() {
  return getOrCreateFolder_(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
}

/**
 * Returns (creating if needed) the sub-folder for a media type.
 * @param {string} mediaType A value from CONFIG.MEDIA_TYPES.
 * @return {Folder}
 * @private
 */
function getTypeFolder_(mediaType) {
  var root = getRootFolder_();
  var folderName = CONFIG.TYPE_FOLDERS[mediaType] || 'Other';
  return getOrCreateFolder_(root, folderName);
}

/**
 * Finds a child folder by name under a parent, or creates it.
 * @param {Folder} parent Parent folder.
 * @param {string} name Child folder name.
 * @return {Folder}
 * @private
 */
function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* -------------------------------- Helpers ------------------------------- */

/**
 * Builds a thumbnail URL. Drive can render thumbnails for most file types via
 * its thumbnail endpoint; for images the file itself is a fine preview.
 * @param {string} fileId Drive file ID.
 * @param {string} mediaType Media type (currently unused but kept for clarity).
 * @return {string}
 * @private
 */
function buildThumbnailUrl_(fileId, mediaType) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w640';
}

/**
 * Lower-cased file extension without the dot.
 * @param {string} fileName File name.
 * @return {string}
 * @private
 */
function getExtension_(fileName) {
  var idx = String(fileName).lastIndexOf('.');
  return idx === -1 ? '' : String(fileName).slice(idx + 1).toLowerCase();
}

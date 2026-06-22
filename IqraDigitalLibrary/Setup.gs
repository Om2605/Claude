/**
 * Setup.gs
 * ---------------------------------------------------------------------------
 * One-time initialisation utilities.
 *
 * Run `initDatabase()` once from the Apps Script editor after creating the
 * project. It creates every sheet the app needs with the correct headers,
 * styles the header rows, seeds a couple of example categories, and creates the
 * root Drive folder. Safe to re-run: existing sheets are left intact.
 * ---------------------------------------------------------------------------
 */

/**
 * Creates all required sheets and headers if they do not already exist.
 * Also creates the root Drive folder hierarchy.
 * @return {string} Human-readable summary of what was created.
 */
function initDatabase() {
  var ss = getSpreadsheet_();
  var created = [];

  // MediaDatabase ----------------------------------------------------------
  if (ensureSheet_(ss, CONFIG.SHEETS.MEDIA, CONFIG.MEDIA_HEADERS)) {
    created.push(CONFIG.SHEETS.MEDIA);
  }
  // Categories -------------------------------------------------------------
  if (ensureSheet_(ss, CONFIG.SHEETS.CATEGORIES, CONFIG.CATEGORY_HEADERS)) {
    created.push(CONFIG.SHEETS.CATEGORIES);
    seedCategories_();
  }
  // Favorites --------------------------------------------------------------
  if (ensureSheet_(ss, CONFIG.SHEETS.FAVORITES, CONFIG.FAVORITE_HEADERS)) {
    created.push(CONFIG.SHEETS.FAVORITES);
  }
  // Comments ---------------------------------------------------------------
  if (ensureSheet_(ss, CONFIG.SHEETS.COMMENTS, CONFIG.COMMENT_HEADERS)) {
    created.push(CONFIG.SHEETS.COMMENTS);
  }
  // Downloads --------------------------------------------------------------
  if (ensureSheet_(ss, CONFIG.SHEETS.DOWNLOADS, CONFIG.DOWNLOAD_HEADERS)) {
    created.push(CONFIG.SHEETS.DOWNLOADS);
  }
  // Users ------------------------------------------------------------------
  if (ensureSheet_(ss, CONFIG.SHEETS.USERS, CONFIG.USER_HEADERS)) {
    created.push(CONFIG.SHEETS.USERS);
    seedAdminUsers_();
  }

  // Remove the default "Sheet1" if it is empty and unused.
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) {
    ss.deleteSheet(def);
  }

  // Drive folders ----------------------------------------------------------
  getRootFolder_(); // creates root + type sub-folders on demand

  var summary = created.length
    ? 'Created sheets: ' + created.join(', ')
    : 'All sheets already existed. Nothing to create.';
  Logger.log(summary);
  return summary;
}

/**
 * Ensures a sheet with the given headers exists.
 * @param {Spreadsheet} ss Spreadsheet.
 * @param {string} name Sheet name.
 * @param {string[]} headers Header row values.
 * @return {boolean} True if the sheet was newly created.
 * @private
 */
function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return false;

  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Style the header row: blue background, white bold text, frozen.
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1d4ed8')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  // Reasonable default widths.
  for (var c = 1; c <= headers.length; c++) {
    sheet.setColumnWidth(c, 160);
  }
  return true;
}

/**
 * Seeds a handful of example categories so the UI is not empty on first run.
 * @private
 */
function seedCategories_() {
  var samples = [
    ['Quran & Islamic Studies', 'Department'],
    ['Arabic Language', 'Department'],
    ['Mathematics', 'Department'],
    ['Science', 'Department'],
    ['English Language', 'Department'],
    ['Social Studies', 'Department']
  ];
  samples.forEach(function (s) {
    addCategory({ name: s[0], type: s[1], description: '' });
  });
}

/**
 * Seeds the bootstrap admin emails into the Users sheet.
 * @private
 */
function seedAdminUsers_() {
  CONFIG.ADMIN_EMAILS.forEach(function (email) {
    if (email) upsertUser(email, '', 'Admin');
  });
}

/**
 * Convenience: wipe all data rows from MediaDatabase (keeps headers).
 * Intended for testing only. Not exposed to the Web App UI.
 */
function resetMediaData() {
  var sheet = getSheet_(CONFIG.SHEETS.MEDIA);
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  return 'MediaDatabase cleared.';
}

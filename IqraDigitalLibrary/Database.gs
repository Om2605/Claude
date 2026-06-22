/**
 * Database.gs
 * ---------------------------------------------------------------------------
 * Thin data-access layer over Google Sheets.
 *
 * Every other module reads and writes the spreadsheet through the helpers here
 * so that row<->object mapping, ID generation and locking are implemented once.
 *
 * Conventions:
 *   - Functions ending in "_" are private helpers (not callable from client).
 *   - Sheets are treated as tables: row 1 is headers, data starts at row 2.
 * ---------------------------------------------------------------------------
 */

/**
 * Returns the bound spreadsheet, or opens by ID stored in script properties.
 * For a container-bound script this is simply the active spreadsheet.
 * @return {Spreadsheet}
 * @private
 */
function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  // Standalone deployment fallback: store SPREADSHEET_ID in Script Properties.
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error('No bound spreadsheet found. Set the SPREADSHEET_ID script property.');
  }
  return SpreadsheetApp.openById(id);
}

/**
 * Returns a sheet by name, throwing a clear error if missing.
 * @param {string} name Sheet name.
 * @return {Sheet}
 * @private
 */
function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet "' + name + '" not found. Run initDatabase() first.');
  }
  return sheet;
}

/**
 * Reads an entire sheet into an array of plain objects keyed by the supplied
 * field names (index-aligned with the columns).
 * @param {string} sheetName Sheet to read.
 * @param {string[]} fields Property names for each column.
 * @return {Object[]}
 * @private
 */
function readObjects_(sheetName, fields) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, fields.length).getValues();
  return values.map(function (row, i) {
    var obj = { _row: i + 2 }; // physical sheet row, handy for updates/deletes
    fields.forEach(function (field, c) {
      obj[field] = row[c];
    });
    return obj;
  });
}

/**
 * Appends an object as a new row, ordering values by the field list.
 * @param {string} sheetName Sheet to write.
 * @param {string[]} fields Column order.
 * @param {Object} obj Values keyed by field name.
 * @private
 */
function appendObject_(sheetName, fields, obj) {
  var sheet = getSheet_(sheetName);
  var row = fields.map(function (field) {
    return obj[field] !== undefined && obj[field] !== null ? obj[field] : '';
  });
  sheet.appendRow(row);
}

/**
 * Generates a unique, prefixed, time-ordered ID, e.g. "MED-1718000000000-481".
 * @param {string} prefix Short prefix such as MED / CAT / FAV / CMT / DL.
 * @return {string}
 * @private
 */
function generateId_(prefix) {
  var rand = Math.floor(Math.random() * 1000);
  return prefix + '-' + Date.now() + '-' + rand;
}

/**
 * Acquires the script lock, runs the callback, then releases. Guarantees that
 * concurrent teachers never corrupt the sheet on simultaneous writes.
 * @param {function():*} fn Critical section.
 * @return {*} Whatever fn returns.
 * @private
 */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // wait up to 30s for other writers
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Coerces a value to a JS Date string suitable for transport to the client.
 * Sheets sometimes return Date objects; JSON-serialise them as ISO strings.
 * @param {*} v Value.
 * @return {*}
 * @private
 */
function toTransport_(v) {
  return (v instanceof Date) ? v.toISOString() : v;
}

/**
 * Maps a raw media row object to a JSON-safe transport object.
 * @param {Object} obj Row object.
 * @return {Object}
 * @private
 */
function mediaToTransport_(obj) {
  var out = {};
  CONFIG.MEDIA_COLUMNS.forEach(function (field) {
    out[field] = toTransport_(obj[field]);
  });
  out._row = obj._row;
  out.viewCount = Number(obj.viewCount) || 0;
  return out;
}

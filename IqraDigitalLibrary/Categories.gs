/**
 * Categories.gs
 * ---------------------------------------------------------------------------
 * Department / Subject-Group management (the "Category Management" page).
 *
 * Categories back the department dropdowns used throughout the UI and on the
 * filters bar. Type is usually "Department" but the schema allows other groups.
 * ---------------------------------------------------------------------------
 */

var CATEGORY_FIELDS = ['categoryId', 'name', 'type', 'description', 'createdDate'];

/**
 * Returns all categories.
 * @return {Object[]}
 */
function getCategories() {
  return readObjects_(CONFIG.SHEETS.CATEGORIES, CATEGORY_FIELDS).map(function (c) {
    c.createdDate = toTransport_(c.createdDate);
    return c;
  });
}

/**
 * Returns just the department names (for dropdowns).
 * @return {string[]}
 */
function getDepartments() {
  return getCategories()
    .filter(function (c) { return !c.type || c.type === 'Department'; })
    .map(function (c) { return c.name; });
}

/**
 * Adds a category.
 * @param {Object} cat { name, type, description }
 * @return {Object} Saved category.
 */
function addCategory(cat) {
  requireRole('Teacher');
  var name = String((cat && cat.name) || '').trim();
  if (!name) throw new Error('Category name is required.');

  return withLock_(function () {
    // Prevent duplicates (case-insensitive).
    var exists = getCategories().some(function (c) {
      return c.name.toLowerCase() === name.toLowerCase();
    });
    if (exists) throw new Error('A category named "' + name + '" already exists.');

    var row = {
      categoryId: generateId_('CAT'),
      name: name,
      type: (cat.type || 'Department').trim(),
      description: (cat.description || '').trim(),
      createdDate: new Date()
    };
    appendObject_(CONFIG.SHEETS.CATEGORIES, CATEGORY_FIELDS, row);
    row.createdDate = row.createdDate.toISOString();
    return row;
  });
}

/**
 * Updates a category.
 * @param {string} categoryId ID.
 * @param {Object} fields { name, type, description }
 * @return {Object}
 */
function updateCategory(categoryId, fields) {
  requireRole('Teacher');
  return withLock_(function () {
    var rows = readObjects_(CONFIG.SHEETS.CATEGORIES, CATEGORY_FIELDS);
    var found = rows.filter(function (c) { return c.categoryId === categoryId; })[0];
    if (!found) throw new Error('Category not found.');

    var sheet = getSheet_(CONFIG.SHEETS.CATEGORIES);
    var merged = [
      found.categoryId,
      (fields.name !== undefined ? fields.name : found.name),
      (fields.type !== undefined ? fields.type : found.type),
      (fields.description !== undefined ? fields.description : found.description),
      found.createdDate
    ];
    sheet.getRange(found._row, 1, 1, CATEGORY_FIELDS.length).setValues([merged]);
    return { success: true };
  });
}

/**
 * Deletes a category. Admin only (deleting a department is consequential).
 * @param {string} categoryId ID.
 * @return {Object}
 */
function deleteCategory(categoryId) {
  requireRole('Admin');
  return withLock_(function () {
    var rows = readObjects_(CONFIG.SHEETS.CATEGORIES, CATEGORY_FIELDS);
    var found = rows.filter(function (c) { return c.categoryId === categoryId; })[0];
    if (!found) throw new Error('Category not found.');
    getSheet_(CONFIG.SHEETS.CATEGORIES).deleteRow(found._row);
    return { success: true };
  });
}

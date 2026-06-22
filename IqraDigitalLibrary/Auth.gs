/**
 * Auth.gs
 * ---------------------------------------------------------------------------
 * Authentication, role resolution and permission guards.
 *
 * Authentication itself is handled by Google: the Web App is deployed so that
 * users sign in with their Google account, and Session.getActiveUser() gives us
 * the verified email. This module turns that identity into a role and provides
 * guard helpers that every write/delete endpoint calls before mutating data.
 * ---------------------------------------------------------------------------
 */

/**
 * Returns the signed-in user's email, or '' if unavailable.
 * @return {string}
 */
function getActiveUser() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (err) {
    return '';
  }
}

/**
 * Resolves the role for an email address.
 * Resolution order: bootstrap admins -> Users sheet -> default role.
 * Honours the domain restriction toggle.
 * @param {string} [email] Email to resolve; defaults to active user.
 * @return {string} 'Admin' | 'Teacher' | 'Viewer'
 */
function getUserRole(email) {
  email = (email || getActiveUser() || '').toLowerCase();

  // Domain restriction: outsiders are downgraded to Viewer (read-only).
  if (CONFIG.RESTRICT_TO_DOMAIN && email && !endsWithDomain_(email, CONFIG.SCHOOL_DOMAIN)) {
    return 'Viewer';
  }

  // Bootstrap admins always win.
  if (CONFIG.ADMIN_EMAILS.map(lower_).indexOf(email) !== -1) {
    return 'Admin';
  }

  // Users sheet lookup.
  var user = findUser_(email);
  if (user && user.role) return user.role;

  // Recognised Google user but not provisioned -> default role.
  if (email) return CONFIG.DEFAULT_ROLE;

  return 'Viewer';
}

/**
 * True if the given role meets or exceeds the required role.
 * @param {string} role User's role.
 * @param {string} required Minimum role.
 * @return {boolean}
 */
function hasRole(role, required) {
  var have = CONFIG.ROLES[role] || 0;
  var need = CONFIG.ROLES[required] || 0;
  return have >= need;
}

/**
 * Throws if the active user does not meet the required role. Use at the top of
 * any state-changing server function.
 * @param {string} required Minimum role.
 * @return {string} The active user's email (convenience).
 */
function requireRole(required) {
  var email = getActiveUser();
  var role = getUserRole(email);
  if (!hasRole(role, required)) {
    throw new Error('Permission denied: this action requires the "' + required + '" role.');
  }
  return email;
}

/* --------------------------- Users sheet CRUD --------------------------- */

/**
 * Returns all provisioned users.
 * @return {Object[]}
 */
function listUsers() {
  requireRole('Admin');
  return readObjects_(CONFIG.SHEETS.USERS, ['email', 'displayName', 'role', 'addedDate'])
    .map(function (u) {
      u.addedDate = toTransport_(u.addedDate);
      return u;
    });
}

/**
 * Finds a single user by email (case-insensitive).
 * @param {string} email Email.
 * @return {Object|null}
 * @private
 */
function findUser_(email) {
  var target = lower_(email);
  var users = readObjects_(CONFIG.SHEETS.USERS, ['email', 'displayName', 'role', 'addedDate']);
  for (var i = 0; i < users.length; i++) {
    if (lower_(users[i].email) === target) return users[i];
  }
  return null;
}

/**
 * Inserts or updates a user record.
 * @param {string} email Email.
 * @param {string} displayName Display name.
 * @param {string} role Role.
 * @return {Object} The saved user.
 */
function upsertUser(email, displayName, role) {
  return withLock_(function () {
    var sheet = getSheet_(CONFIG.SHEETS.USERS);
    var existing = findUser_(email);
    if (existing) {
      sheet.getRange(existing._row, 1, 1, 4)
        .setValues([[email, displayName || existing.displayName, role || existing.role, existing.addedDate || new Date()]]);
    } else {
      sheet.appendRow([email, displayName || '', role || CONFIG.DEFAULT_ROLE, new Date()]);
    }
    return { email: email, displayName: displayName, role: role };
  });
}

/**
 * Admin endpoint: change a user's role.
 * @param {string} email Target user.
 * @param {string} role New role.
 * @return {Object}
 */
function setUserRole(email, role) {
  requireRole('Admin');
  if (!CONFIG.ROLES[role]) throw new Error('Unknown role: ' + role);
  return upsertUser(email, '', role);
}

/* ------------------------------- Helpers ------------------------------- */

/** @private */
function lower_(s) { return String(s || '').toLowerCase(); }

/** @private */
function endsWithDomain_(email, domain) {
  return lower_(email).slice(-(domain.length + 1)) === ('@' + lower_(domain));
}

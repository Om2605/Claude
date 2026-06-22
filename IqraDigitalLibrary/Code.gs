/**
 * Code.gs
 * ---------------------------------------------------------------------------
 * Application entry point and HTML templating helpers.
 *
 * This file wires the Web App together:
 *   - doGet()   serves the single-page application shell (Index.html).
 *   - include() injects partial HTML files (styles, scripts, page views).
 *   - getBootstrapData() hands the front-end everything it needs on first load
 *     (current user, role, config-derived option lists) in one round-trip.
 *
 * The actual business logic lives in the service modules:
 *   Auth.gs, DriveService.gs, MediaService.gs, Dashboard.gs,
 *   Categories.gs, Engagement.gs, ImportExport.gs, Setup.gs
 * ---------------------------------------------------------------------------
 */

/**
 * Web App HTTP GET handler. Serves the SPA shell.
 * @param {GoogleAppsScript.Events.DoGet} e Request event.
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');

  // Deep-link support: ?page=upload opens straight to a view.
  template.initialPage = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'dashboard';

  return template
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setFaviconUrl('https://ssl.gstatic.com/docs/script/images/favicon.ico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWING);
}

/**
 * Includes the contents of another HTML file. Used inside templates as:
 *   <?!= include('Styles') ?>
 * @param {string} filename Name of the .html file without extension.
 * @return {string} Evaluated HTML.
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/**
 * One-shot bootstrap payload for the front-end. Called once on page load so the
 * UI can render the correct chrome (user identity, role-based controls) and
 * populate dropdowns without several separate calls.
 * @return {Object}
 */
function getBootstrapData() {
  var email = getActiveUser();
  var role = getUserRole(email);

  return {
    app: {
      name: CONFIG.APP_NAME,
      schoolName: CONFIG.SCHOOL_NAME
    },
    user: {
      email: email,
      role: role,
      isAdmin: role === 'Admin',
      canEdit: hasRole(role, 'Teacher')
    },
    options: {
      mediaTypes: CONFIG.MEDIA_TYPES,
      gradeLevels: getGradeLevels(),
      statusOptions: CONFIG.STATUS_OPTIONS,
      departments: getDepartments(),
      pageSize: CONFIG.DEFAULT_PAGE_SIZE,
      maxFileSize: CONFIG.MAX_FILE_SIZE,
      allowedExtensions: CONFIG.ALLOWED_EXTENSIONS
    },
    settings: {
      restrictToDomain: CONFIG.RESTRICT_TO_DOMAIN,
      schoolDomain: CONFIG.SCHOOL_DOMAIN
    }
  };
}

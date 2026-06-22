/**
 * Config.gs
 * ---------------------------------------------------------------------------
 * Central configuration for the Iqra Muslim School Digital Library.
 *
 * Everything that an administrator might want to tweak lives here so the rest
 * of the codebase never hard-codes magic strings. Treat this file as the single
 * source of truth for sheet names, column ordering, Drive folder names, roles,
 * security limits and feature toggles.
 *
 * IMPORTANT: The `MEDIA_COLUMNS` array order defines the physical column order
 * in the "MediaDatabase" sheet. Do not reorder it after data has been entered.
 * ---------------------------------------------------------------------------
 */

/** Global configuration object. Accessed everywhere as CONFIG. */
var CONFIG = {
  /** Human-friendly name shown in the header / browser tab. */
  APP_NAME: 'Iqra Muslim School Teaching Resource Hub',
  SCHOOL_NAME: 'Iqra Muslim School',

  /* ----------------------------- Spreadsheet ----------------------------- */

  /** Primary media table. */
  SHEET_NAME: 'MediaDatabase',

  /** Auxiliary sheets used by advanced features. */
  SHEETS: {
    MEDIA: 'MediaDatabase',
    CATEGORIES: 'Categories',
    FAVORITES: 'Favorites',
    COMMENTS: 'Comments',
    DOWNLOADS: 'Downloads',
    USERS: 'Users'
  },

  /**
   * Column order for MediaDatabase. The 13 required columns from the spec.
   * The keys below are also used as object property names when rows are
   * converted to/from JSON, so keep them stable.
   */
  MEDIA_COLUMNS: [
    'mediaId',          // 1.  Media ID
    'title',            // 2.  Media Title
    'mediaType',        // 3.  Media Type
    'department',       // 4.  Department / Subject Group
    'gradeLevel',       // 5.  Grade Level
    'description',      // 6.  Description
    'creatorName',      // 7.  Creator Name
    'uploadDate',       // 8.  Upload Date
    'driveLink',        // 9.  Google Drive Link
    'driveFileId',      // 10. Drive File ID
    'thumbnailUrl',     // 11. Cover Image / Thumbnail URL
    'viewCount',        // 12. View Count
    'status'            // 13. Publication Status
  ],

  /** Human readable headers, index-aligned with MEDIA_COLUMNS. */
  MEDIA_HEADERS: [
    'Media ID',
    'Media Title',
    'Media Type',
    'Department / Subject Group',
    'Grade Level',
    'Description',
    'Creator Name',
    'Upload Date',
    'Google Drive Link',
    'Drive File ID',
    'Cover Image / Thumbnail URL',
    'View Count',
    'Publication Status'
  ],

  CATEGORY_HEADERS: ['Category ID', 'Name', 'Type', 'Description', 'Created Date'],
  FAVORITE_HEADERS: ['Favorite ID', 'User Email', 'Media ID', 'Created Date'],
  COMMENT_HEADERS:  ['Comment ID', 'Media ID', 'User Email', 'User Name', 'Rating', 'Comment', 'Created Date'],
  DOWNLOAD_HEADERS: ['Download ID', 'Media ID', 'User Email', 'Action', 'Timestamp'],
  USER_HEADERS:     ['Email', 'Display Name', 'Role', 'Added Date'],

  /* ------------------------------- Drive --------------------------------- */

  /** Top-level Drive folder. Type sub-folders are created beneath it. */
  ROOT_FOLDER_NAME: 'Iqra Digital Library',

  /** Allowed media types and the Drive sub-folder each maps to. */
  MEDIA_TYPES: ['Document', 'Image', 'Video', 'Audio', 'PDF', 'Link'],

  TYPE_FOLDERS: {
    Document: 'Documents',
    Image: 'Images',
    Video: 'Videos',
    Audio: 'Audio',
    PDF: 'PDFs',
    Link: 'Links'
  },

  /* ------------------------------ Security ------------------------------- */

  /**
   * Whitelisted file extensions. Anything else is rejected during upload.
   * Lower-case, without the leading dot.
   */
  ALLOWED_EXTENSIONS: [
    // Documents
    'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'csv',
    // PDF
    'pdf',
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
    // Audio
    'mp3', 'wav', 'ogg', 'm4a', 'aac',
    // Video
    'mp4', 'webm', 'mov', 'avi', 'mkv'
  ],

  /** Maximum upload size in bytes (default 50 MB). */
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  /**
   * Domain restriction. When ON, only users whose email ends with SCHOOL_DOMAIN
   * may use the app. Toggle from the Settings page or here.
   */
  RESTRICT_TO_DOMAIN: false,
  SCHOOL_DOMAIN: 'iqraschool.edu',

  /**
   * Bootstrap admins. Any email listed here is always treated as an Admin even
   * before the Users sheet is populated. Replace with real admin emails.
   */
  ADMIN_EMAILS: [
    'admin@iqraschool.edu'
  ],

  /** Role hierarchy used by requireRole(). Higher number = more privilege. */
  ROLES: {
    Viewer: 1,
    Teacher: 2,
    Admin: 3
  },

  /** Default role granted to a recognised user who is not in the Users sheet. */
  DEFAULT_ROLE: 'Teacher',

  /* ------------------------------ Behaviour ------------------------------ */

  /** Default publication status for new media. */
  DEFAULT_STATUS: 'Published',
  STATUS_OPTIONS: ['Published', 'Draft', 'Archived'],

  /** Default page size for paginated media listings. */
  DEFAULT_PAGE_SIZE: 12
};

/**
 * Returns the spelled-out list of grade levels offered by the school.
 * Kept as a function so it can be sourced dynamically later if needed.
 * @return {string[]}
 */
function getGradeLevels() {
  return [
    'Pre-K', 'Kindergarten',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
    'All Grades'
  ];
}

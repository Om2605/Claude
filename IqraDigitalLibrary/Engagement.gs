/**
 * Engagement.gs
 * ---------------------------------------------------------------------------
 * Favorites (bookmarks) and Comments / Reviews.
 *
 * Favorites are per-user toggles stored one row per (user, media) pair.
 * Comments support an optional 1-5 star rating alongside free text.
 * ---------------------------------------------------------------------------
 */

var FAVORITE_FIELDS = ['favoriteId', 'userEmail', 'mediaId', 'createdDate'];
var COMMENT_FIELDS  = ['commentId', 'mediaId', 'userEmail', 'userName', 'rating', 'comment', 'createdDate'];

/* ------------------------------ Favorites ------------------------------- */

/**
 * Toggles a favorite for the current user.
 * @param {string} mediaId Media ID.
 * @return {Object} { favorited: boolean }
 */
function toggleFavorite(mediaId) {
  var email = getActiveUser();
  if (!email) throw new Error('You must be signed in to use favorites.');

  return withLock_(function () {
    var rows = readObjects_(CONFIG.SHEETS.FAVORITES, FAVORITE_FIELDS);
    var existing = rows.filter(function (f) {
      return f.mediaId === mediaId && lower_(f.userEmail) === lower_(email);
    })[0];

    if (existing) {
      getSheet_(CONFIG.SHEETS.FAVORITES).deleteRow(existing._row);
      return { favorited: false };
    }
    appendObject_(CONFIG.SHEETS.FAVORITES, FAVORITE_FIELDS, {
      favoriteId: generateId_('FAV'),
      userEmail: email,
      mediaId: mediaId,
      createdDate: new Date()
    });
    return { favorited: true };
  });
}

/**
 * Returns the set of media IDs the current user has favorited.
 * @return {string[]}
 */
function getMyFavorites() {
  var email = getActiveUser();
  if (!email) return [];
  return readObjects_(CONFIG.SHEETS.FAVORITES, FAVORITE_FIELDS)
    .filter(function (f) { return lower_(f.userEmail) === lower_(email); })
    .map(function (f) { return f.mediaId; });
}

/* ------------------------------- Comments ------------------------------- */

/**
 * Returns all comments for a media item, newest first.
 * @param {string} mediaId Media ID.
 * @return {Object[]}
 */
function getComments(mediaId) {
  return readObjects_(CONFIG.SHEETS.COMMENTS, COMMENT_FIELDS)
    .filter(function (c) { return c.mediaId === mediaId; })
    .map(function (c) { c.createdDate = toTransport_(c.createdDate); return c; })
    .sort(function (a, b) {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
}

/**
 * Adds a comment / review.
 * @param {string} mediaId Media ID.
 * @param {string} text Comment text.
 * @param {number} [rating] Optional 1-5 rating.
 * @return {Object} Saved comment.
 */
function addComment(mediaId, text, rating) {
  var email = getActiveUser();
  if (!email) throw new Error('You must be signed in to comment.');
  text = String(text || '').trim();
  if (!text) throw new Error('Comment cannot be empty.');

  var r = parseInt(rating, 10);
  if (isNaN(r) || r < 1 || r > 5) r = '';

  var row = {
    commentId: generateId_('CMT'),
    mediaId: mediaId,
    userEmail: email,
    userName: email.split('@')[0],
    rating: r,
    comment: text,
    createdDate: new Date()
  };
  appendObject_(CONFIG.SHEETS.COMMENTS, COMMENT_FIELDS, row);
  row.createdDate = row.createdDate.toISOString();
  return row;
}

/**
 * Deletes a comment. The author may delete their own; Admins may delete any.
 * @param {string} commentId Comment ID.
 * @return {Object}
 */
function deleteComment(commentId) {
  var email = getActiveUser();
  var role = getUserRole(email);

  return withLock_(function () {
    var rows = readObjects_(CONFIG.SHEETS.COMMENTS, COMMENT_FIELDS);
    var found = rows.filter(function (c) { return c.commentId === commentId; })[0];
    if (!found) throw new Error('Comment not found.');

    if (role !== 'Admin' && lower_(found.userEmail) !== lower_(email)) {
      throw new Error('You can only delete your own comments.');
    }
    getSheet_(CONFIG.SHEETS.COMMENTS).deleteRow(found._row);
    return { success: true };
  });
}

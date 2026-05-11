// Single source of truth for the latest "announcements" version.
// Bump this string whenever you publish new entries in AnnouncementsView so
// every user sees the notification dot + toast on next app load.
//
// Format: YYYY-MM-DD (or YYYY-MM-DD-r2 for same-day re-publish)
export const ANNOUNCEMENTS_VERSION = '2026-05-11';

// localStorage key prefix
export const ANNOUNCEMENTS_SEEN_KEY = 'tue_announcements_seen_version';

/** Returns true if the user has NOT seen the current announcement version yet. */
export function hasUnseenAnnouncements(): boolean {
  try {
    const seen = localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY);
    return seen !== ANNOUNCEMENTS_VERSION;
  } catch {
    return false;
  }
}

/** Marks the current announcement version as seen by this user. */
export function markAnnouncementsSeen(): void {
  try {
    localStorage.setItem(ANNOUNCEMENTS_SEEN_KEY, ANNOUNCEMENTS_VERSION);
  } catch {}
}

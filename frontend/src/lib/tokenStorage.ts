const STORAGE_KEY = 'vitrine.accessToken';

/**
 * Access token persistence.
 *
 * sessionStorage (never localStorage): the session survives page reloads but
 * ends when the tab is closed and is not shared with other tabs. Storage
 * access can throw (e.g. blocked in private mode), so failures are ignored and
 * the app simply behaves as logged out.
 */
export const tokenStorage = {
  get(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },

  set(token: string): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      // Ignored: the token stays only in memory for this page load.
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored.
    }
  },
};

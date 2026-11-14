export type Theme = 'light' | 'dark';

/**
 * Cookie that stores the explicit choice. A first-party cookie instead of
 * localStorage (not used by this app): it persists across sessions, holds no
 * sensitive data and can be read synchronously by `public/theme-init.js`
 * before the first paint. Keep the name in sync with that script.
 */
export const THEME_COOKIE = 'vitrine-theme';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Explicit choice saved in the cookie string, or null when there is none. */
export function readStoredTheme(cookies: string): Theme | null {
  for (const entry of cookies.split(';')) {
    const [name, value] = entry.trim().split('=');
    if (name === THEME_COOKIE && isTheme(value)) return value;
  }
  return null;
}

/** The saved choice wins; otherwise the operating system preference. */
export function resolveTheme(stored: Theme | null, prefersDark: boolean): Theme {
  return stored ?? (prefersDark ? 'dark' : 'light');
}

export function serializeThemeCookie(theme: Theme, secure: boolean): string {
  return `${THEME_COOKIE}=${theme}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

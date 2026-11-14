import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DARK_SCHEME_QUERY,
  isTheme,
  oppositeTheme,
  readStoredTheme,
  resolveTheme,
  serializeThemeCookie,
  type Theme,
} from '../../lib/theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_SCHEME_QUERY).matches;
}

function readCookies(): string {
  try {
    return document.cookie;
  } catch {
    return '';
  }
}

/** Starts from the theme already applied by `public/theme-init.js`, so the first render matches the page. */
function readInitialTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  return isTheme(applied) ? applied : resolveTheme(readStoredTheme(readCookies()), prefersDark());
}

function saveTheme(theme: Theme): void {
  try {
    document.cookie = serializeThemeCookie(theme, window.location.protocol === 'https:');
  } catch {
    // Cookies blocked: the choice lasts only for this page load.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme === theme) return;
    // Suspends CSS transitions for the switch, so every color changes at once
    // instead of some elements animating while others snap.
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    void window.getComputedStyle(document.body).color; // applies the new colors while transitions are off
    const timer = window.setTimeout(() => root.classList.remove('theme-switching'), 0);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove('theme-switching');
    };
  }, [theme]);

  // Until the user makes an explicit choice, follow changes of the system preference.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DARK_SCHEME_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme(readCookies()) === null) setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = oppositeTheme(theme);
    saveTheme(next);
    setTheme(next);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

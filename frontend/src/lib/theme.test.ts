import { describe, expect, it } from 'vitest';
import initScript from '../../public/theme-init.js?raw';
import { oppositeTheme, readStoredTheme, resolveTheme, serializeThemeCookie, THEME_COOKIE } from './theme';

describe('readStoredTheme', () => {
  it('reads the saved choice among other cookies', () => {
    expect(readStoredTheme('a=1; vitrine-theme=dark; b=2')).toBe('dark');
    expect(readStoredTheme('vitrine-theme=light')).toBe('light');
  });

  it('returns null when there is no valid choice', () => {
    expect(readStoredTheme('')).toBeNull();
    expect(readStoredTheme('other=dark')).toBeNull();
    expect(readStoredTheme('vitrine-theme=blue')).toBeNull();
    expect(readStoredTheme('my-vitrine-theme=dark')).toBeNull();
  });
});

describe('resolveTheme', () => {
  it('prefers the saved choice over the system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system preference on the first visit', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
});

describe('serializeThemeCookie', () => {
  it('builds a long-lived, site-wide cookie', () => {
    const cookie = serializeThemeCookie('dark', false);
    expect(cookie).toMatch(/^vitrine-theme=dark; /);
    expect(cookie).toContain('Max-Age=31536000');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
  });

  it('adds Secure on HTTPS', () => {
    expect(serializeThemeCookie('light', true)).toMatch(/; Secure$/);
  });

  it('round-trips through readStoredTheme', () => {
    const [pair] = serializeThemeCookie('dark', false).split(';');
    expect(readStoredTheme(pair ?? '')).toBe('dark');
  });
});

describe('oppositeTheme', () => {
  it('switches between the two themes', () => {
    expect(oppositeTheme('light')).toBe('dark');
    expect(oppositeTheme('dark')).toBe('light');
  });
});

/** Runs public/theme-init.js against a minimal fake document and window. */
function runInitScript(cookie: string, prefersDark: boolean | 'unsupported'): string | undefined {
  const documentElement = { dataset: {} as Record<string, string> };
  const fakeDocument = { cookie, documentElement };
  const fakeWindow =
    prefersDark === 'unsupported' ? {} : { matchMedia: (query: string) => ({ matches: prefersDark && query.includes('dark') }) };
  new Function('document', 'window', initScript)(fakeDocument, fakeWindow);
  return documentElement.dataset.theme;
}

describe('public/theme-init.js (runs before React)', () => {
  it('uses the same cookie name as the app', () => {
    expect(initScript).toContain(`${THEME_COOKIE}=`);
  });

  it('applies the same resolution rules as resolveTheme', () => {
    expect(runInitScript('vitrine-theme=light', true)).toBe('light');
    expect(runInitScript('a=1; vitrine-theme=dark', false)).toBe('dark');
    expect(runInitScript('', true)).toBe('dark');
    expect(runInitScript('', false)).toBe('light');
    expect(runInitScript('vitrine-theme=blue', false)).toBe('light');
    expect(runInitScript('my-vitrine-theme=dark', false)).toBe('light');
  });

  it('falls back to light when matchMedia is unavailable', () => {
    expect(runInitScript('', 'unsupported')).toBe('light');
  });
});

// Applies the color theme before the first paint, so the page never flashes
// the wrong theme. Loaded as a blocking script in <head>; kept as an external
// file (not inline) so it stays compatible with a strict Content Security Policy.
// Mirrors readStoredTheme/resolveTheme in src/lib/theme.ts (same cookie name).
(function () {
  var theme = 'light';
  try {
    var match = document.cookie.match(/(?:^|;\s*)vitrine-theme=(light|dark)(?:;|$)/);
    if (match) {
      theme = match[1];
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (error) {
    // Cookies or matchMedia unavailable: keep the light theme.
  }
  document.documentElement.dataset.theme = theme;
})();

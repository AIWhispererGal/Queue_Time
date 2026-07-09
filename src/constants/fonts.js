/**
 * Font options for the app UI + video overlay.
 *
 * The Zoom app's CSP blocks external font hosts (e.g. Google Fonts), so these
 * are all system font families that require no web-font loading.
 *
 * `css` is the family stack applied to the HTML UI (via the --app-font CSS
 * variable) and threaded into the canvas overlay renderer.
 */
export const FONT_OPTIONS = [
  {
    label: 'System',
    css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  },
  {
    label: 'Serif',
    css: "Georgia, 'Times New Roman', serif",
  },
  {
    label: 'Mono',
    css: "'Courier New', Courier, monospace",
  },
  {
    label: 'Rounded',
    css: "'Trebuchet MS', Verdana, Geneva, sans-serif",
  },
];

export const DEFAULT_FONT = FONT_OPTIONS[0];

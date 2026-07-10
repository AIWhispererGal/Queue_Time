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

/**
 * Font size scaling (applied to the app UI root font-size and the overlay
 * canvas fonts). 1 = default; the slider covers MIN..MAX.
 */
export const FONT_SCALE = {
  DEFAULT: 1,
  MIN: 0.8,
  MAX: 1.5,
  STEP: 0.05,
};

/** Base root font-size (px) that the scale multiplies. */
export const BASE_FONT_PX = 16;

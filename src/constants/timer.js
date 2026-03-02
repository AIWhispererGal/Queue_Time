/**
 * Timer and speaker queue constants
 * Extracted from magic numbers throughout the codebase
 */

// Timer defaults
export const TIMER_DEFAULTS = {
  TIME_LIMIT: 120,           // 2 minutes default speaker time
  MIN_TIME_LIMIT: 10,        // Minimum time limit
  MAX_TIME_LIMIT: 600,       // Maximum time limit (10 minutes)
  TIME_STEP: 10,             // Time limit adjustment step
  WARNING_THRESHOLD: 30,     // Seconds remaining for warning
  URGENT_THRESHOLD: 10,      // Seconds remaining for urgent warning
  GRACE_PERIOD_SHORT: 15,    // Keyboard shortcut grace (G key)
  GRACE_PERIOD_LONG: 30,     // Button grace period (+30s)
  MAX_GRACE_OVER_LIMIT: 60,  // Maximum seconds over time limit
};

// Audio alert frequencies (Hz)
export const AUDIO_FREQUENCIES = {
  WARNING: 440,   // A4 note
  URGENT: 660,    // E5 note
  END: 880,       // A5 note
};

// Audio alert volumes (0-1)
export const AUDIO_VOLUMES = {
  WARNING: 0.3,
  URGENT: 0.4,
  END: 0.5,
};

// Zoom video overlay dimensions
export const ZOOM_OVERLAY = {
  WIDTH: 1280,
  HEIGHT: 720,
  Z_INDEX: 3,
};

// Color thresholds for timer (percentage remaining)
export const TIMER_COLORS = {
  GREEN: '#4CAF50',     // > 50% remaining
  AMBER: '#FFC107',     // 25-50% remaining
  RED: '#F44336',       // < 25% remaining
  GREEN_THRESHOLD: 50,
  AMBER_THRESHOLD: 25,
};

// Overlay update intervals (ms)
export const UPDATE_INTERVALS = {
  TIMER: 1000,              // Timer updates every second
  OVERLAY_INIT_DELAY: 500,  // Delay before starting overlay updates
  SDK_INIT_DELAY: 1000,     // Delay before SDK initialization
};

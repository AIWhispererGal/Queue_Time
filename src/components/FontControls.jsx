import React from 'react';
import { FONT_OPTIONS, DEFAULT_FONT, FONT_SCALE } from '../constants/fonts';

/**
 * Font type + size controls for one target (e.g. the app UI or the video
 * overlay), with an independent reset-to-default. Purely controlled by props.
 */
function FontControls({ label, fontFamily, onFontChange, fontScale = FONT_SCALE.DEFAULT, onFontScaleChange }) {
  const handleScaleChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && onFontScaleChange) {
      onFontScaleChange(value);
    }
  };

  const handleReset = () => {
    if (onFontChange) onFontChange(DEFAULT_FONT.css);
    if (onFontScaleChange) onFontScaleChange(FONT_SCALE.DEFAULT);
  };

  return (
    <div className="font-controls">
      <label className="settings-label">{label}</label>

      {onFontChange && (
        <div className="font-presets">
          {FONT_OPTIONS.map(option => (
            <button
              key={option.label}
              className={`preset-button ${fontFamily === option.css ? 'active' : ''}`}
              style={{ fontFamily: option.css }}
              onClick={() => onFontChange(option.css)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {onFontScaleChange && (
        <>
          <label className="settings-label settings-sublabel">Text Size</label>
          <div className="custom-time">
            <input
              type="range"
              min={FONT_SCALE.MIN}
              max={FONT_SCALE.MAX}
              step={FONT_SCALE.STEP}
              value={fontScale}
              onChange={handleScaleChange}
              className="time-slider"
              aria-label={`${label} text size`}
            />
            <div className="time-display">
              <span className="current-time">{Math.round(fontScale * 100)}%</span>
            </div>
          </div>
        </>
      )}

      <button className="reset-appearance-button" onClick={handleReset}>
        Reset to default
      </button>
    </div>
  );
}

export default FontControls;

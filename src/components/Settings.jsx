import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import { FONT_OPTIONS, DEFAULT_FONT, FONT_SCALE } from '../constants/fonts';
import './Settings.css';

function Settings({ timeLimit, onTimeLimitChange, fontFamily, onFontChange, fontScale = FONT_SCALE.DEFAULT, onFontScaleChange }) {
  const presets = [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '2m', value: 120 },
    { label: '3m', value: 180 },
    { label: '5m', value: 300 },
  ];

  const handlePresetClick = (value) => {
    onTimeLimitChange(value);
  };

  const handleCustomChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 600) {
      onTimeLimitChange(value);
    }
  };

  const handleFontScaleChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && onFontScaleChange) {
      onFontScaleChange(value);
    }
  };

  const handleResetAppearance = () => {
    if (onFontChange) onFontChange(DEFAULT_FONT.css);
    if (onFontScaleChange) onFontScaleChange(FONT_SCALE.DEFAULT);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <CollapsibleSection className="settings-container" title="Settings" defaultCollapsed>
      <div className="settings-section">
        <label className="settings-label">Speaking Time Limit</label>
        <div className="time-presets">
          {presets.map(preset => (
            <button
              key={preset.value}
              className={`preset-button ${timeLimit === preset.value ? 'active' : ''}`}
              onClick={() => handlePresetClick(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="custom-time">
          <input
            type="range"
            min="10"
            max="600"
            step="10"
            value={timeLimit}
            onChange={handleCustomChange}
            className="time-slider"
          />
          <div className="time-display">
            <span className="current-time">{formatTime(timeLimit)}</span>
          </div>
        </div>
      </div>

      {(onFontChange || onFontScaleChange) && (
        <div className="settings-section">
          <label className="settings-label">Font</label>

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
                  onChange={handleFontScaleChange}
                  className="time-slider"
                  aria-label="Text size"
                />
                <div className="time-display">
                  <span className="current-time">{Math.round(fontScale * 100)}%</span>
                </div>
              </div>
            </>
          )}

          <button className="reset-appearance-button" onClick={handleResetAppearance}>
            Reset to default
          </button>
        </div>
      )}

      <div className="settings-info">
        <p>💡 <strong>Tip:</strong> Change time limit between speakers</p>
        <p>
          <a
            className="how-to-link"
            href="https://queuetime.app/documentation.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            How to use Queue Time ↗
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
}

export default Settings;
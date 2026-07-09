import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import { FONT_OPTIONS } from '../constants/fonts';
import './Settings.css';

function Settings({ timeLimit, onTimeLimitChange, fontFamily, onFontChange }) {
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

      {onFontChange && (
        <div className="settings-section">
          <label className="settings-label">Font</label>
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
        </div>
      )}

      <div className="settings-info">
        <p>💡 <strong>Tip:</strong> Change time limit between speakers</p>
      </div>
    </CollapsibleSection>
  );
}

export default Settings;
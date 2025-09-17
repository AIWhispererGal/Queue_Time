import React from 'react';
import './Settings.css';

function Settings({ timeLimit, onTimeLimitChange, videoOverlayEnabled, onVideoOverlayChange }) {
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
    <div className="settings-container">
      <h3>Settings</h3>

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

      <div className="settings-section">
        <label className="settings-label">Video Overlay</label>
        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={videoOverlayEnabled}
              onChange={(e) => onVideoOverlayChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            {videoOverlayEnabled ? 'Timer shows on your video' : 'Timer hidden from video'}
          </span>
        </div>
      </div>

      <div className="settings-info">
        <p>💡 <strong>Tip:</strong> Change time limit between speakers</p>
        <p>📹 Video overlay shows timer & queue on YOUR video feed</p>
      </div>
    </div>
  );
}

export default Settings;
import React from 'react';
import './FloatingTimer.css';

function FloatingTimer({ currentSpeaker, timeRemaining, timeLimit, speakerStats }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeRemaining / timeLimit) * 100;
    if (percentage > 50) return '#4CAF50';
    if (percentage > 20) return '#FFC107';
    return '#F44336';
  };

  if (!currentSpeaker) return null;

  return (
    <div className="floating-timer">
      <div className="floating-speaker-name">
        {currentSpeaker.displayName}
      </div>
      <div
        className="floating-time-display"
        style={{ color: getTimerColor() }}
      >
        {formatTime(timeRemaining)}
      </div>
      {speakerStats && (
        <div className="floating-stats">
          Turn {speakerStats.instances + 1} • Total: {formatTime(speakerStats.totalTime)}
        </div>
      )}
      <div className="floating-progress">
        <div
          className="floating-progress-bar"
          style={{
            width: `${(timeRemaining / timeLimit) * 100}%`,
            backgroundColor: getTimerColor()
          }}
        />
      </div>
    </div>
  );
}

export default FloatingTimer;
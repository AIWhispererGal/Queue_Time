import React, { useState, useEffect, useRef } from 'react';
import './Timer.css';

function Timer({ isActive, timeLimit, currentSpeaker, speakerStats, onComplete, onTimeLimitChange, onTimeRemainingChange }) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [totalTimeSpoken, setTotalTimeSpoken] = useState(0);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      setTimeRemaining(timeLimit);
      setTotalTimeSpoken(0);

      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev <= 1 ? 0 : prev - 1;

          if (prev <= 1) {
            handleTimerEnd();
          }

          // Play warning sounds
          if (prev === 31) {
            playAlert('warning');
          } else if (prev === 11) {
            playAlert('urgent');
          }

          // Update parent component
          if (onTimeRemainingChange) {
            onTimeRemainingChange(newTime);
          }

          return newTime;
        });
        setTotalTimeSpoken(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setTimeRemaining(timeLimit);
      setTotalTimeSpoken(0);
      if (onTimeRemainingChange) {
        onTimeRemainingChange(timeLimit);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLimit]);

  const handleTimerEnd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    playAlert('end');
    onComplete(totalTimeSpoken);
  };

  const playAlert = (type) => {
    // Create audio context for different alert types
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(type) {
      case 'warning':
        oscillator.frequency.value = 440; // A4
        gainNode.gain.value = 0.3;
        break;
      case 'urgent':
        oscillator.frequency.value = 660; // E5
        gainNode.gain.value = 0.4;
        break;
      case 'end':
        oscillator.frequency.value = 880; // A5
        gainNode.gain.value = 0.5;
        break;
      default:
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.3;
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

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

  const handleEndTurn = () => {
    onComplete(totalTimeSpoken);
  };

  const handleTimeLimitChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      onTimeLimitChange(value);
    }
  };

  return (
    <div className="timer-container">
      {currentSpeaker && (
        <div className="current-speaker">
          <div className="speaker-name">{currentSpeaker.displayName}</div>
          {speakerStats && (
            <div className="speaker-quick-stats">
              <span>Turn #{speakerStats.instances + 1}</span>
              <span>•</span>
              <span>Total: {formatTime(speakerStats.totalTime)}</span>
            </div>
          )}
        </div>
      )}

      <div className="timer-display" style={{ color: getTimerColor() }}>
        {formatTime(timeRemaining)}
      </div>

      <div className="timer-progress">
        <div
          className="timer-progress-bar"
          style={{
            width: `${(timeRemaining / timeLimit) * 100}%`,
            backgroundColor: getTimerColor()
          }}
        />
      </div>

      {isActive ? (
        <button className="timer-button end-turn" onClick={handleEndTurn}>
          End Turn
        </button>
      ) : (
        <div className="timer-settings">
          <label htmlFor="time-limit">Time Limit:</label>
          <input
            id="time-limit"
            type="number"
            value={timeLimit}
            onChange={handleTimeLimitChange}
            min="10"
            max="600"
            step="10"
          />
          <span>sec</span>
        </div>
      )}

      {timeRemaining <= 30 && timeRemaining > 0 && isActive && (
        <div className="timer-warning">
          {timeRemaining <= 10 ? 'Time up!' : '30 seconds'}
        </div>
      )}
    </div>
  );
}

export default Timer;
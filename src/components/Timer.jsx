import React, { useEffect, useRef, useCallback } from 'react';
import { formatTime } from '../utils/formatTime';
import {
  TIMER_DEFAULTS,
  AUDIO_FREQUENCIES,
  AUDIO_VOLUMES,
  TIMER_COLORS
} from '../constants/timer';
import './Timer.css';

/**
 * Controlled Timer component - timeRemaining is managed by parent
 * This eliminates state duplication between Timer and App.jsx
 */
function Timer({
  isActive,
  timeLimit,
  timeRemaining,  // Controlled by parent
  currentSpeaker,
  speakerStats,
  onComplete,
  onTimeLimitChange,
  onTimeRemainingChange,
  isPaused
}) {
  const intervalRef = useRef(null);
  const totalTimeSpokenRef = useRef(0);
  // Use ref to access current timeRemaining in interval (avoid stale closure)
  const timeRemainingRef = useRef(timeRemaining);

  // Keep ref in sync with prop
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Reset totalTimeSpoken when speaker changes
  useEffect(() => {
    if (isActive && currentSpeaker) {
      totalTimeSpokenRef.current = 0;
    }
  }, [currentSpeaker, isActive]);

  // Handle timer countdown
  useEffect(() => {
    if (isActive && !isPaused) {
      // Start or resume the timer
      intervalRef.current = setInterval(() => {
        // Increment time spoken
        totalTimeSpokenRef.current += 1;

        const currentTime = timeRemainingRef.current;
        const newTime = currentTime <= 1 ? 0 : currentTime - 1;

        // Notify parent of time change
        if (onTimeRemainingChange) {
          onTimeRemainingChange(newTime);
        }

        if (currentTime <= 1) {
          // Timer ended
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          playAlert('end');
          onComplete(totalTimeSpokenRef.current);
        } else if (currentTime === TIMER_DEFAULTS.WARNING_THRESHOLD + 1) {
          playAlert('warning');
        } else if (currentTime === TIMER_DEFAULTS.URGENT_THRESHOLD + 1) {
          playAlert('urgent');
        }
      }, 1000);
    } else if (isPaused && intervalRef.current) {
      // Pause without resetting
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (!isActive && intervalRef.current) {
      // Stop timer when not active
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isPaused, onComplete, onTimeRemainingChange]);

  const playAlert = useCallback((type) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(type) {
      case 'warning':
        oscillator.frequency.value = AUDIO_FREQUENCIES.WARNING;
        gainNode.gain.value = AUDIO_VOLUMES.WARNING;
        break;
      case 'urgent':
        oscillator.frequency.value = AUDIO_FREQUENCIES.URGENT;
        gainNode.gain.value = AUDIO_VOLUMES.URGENT;
        break;
      case 'end':
        oscillator.frequency.value = AUDIO_FREQUENCIES.END;
        gainNode.gain.value = AUDIO_VOLUMES.END;
        break;
      default:
        oscillator.frequency.value = AUDIO_FREQUENCIES.WARNING;
        gainNode.gain.value = AUDIO_VOLUMES.WARNING;
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);

    oscillator.onended = () => {
      audioContext.close();
    };
  }, []);

  const getTimerColor = useCallback(() => {
    const percentage = (timeRemaining / timeLimit) * 100;
    if (percentage > TIMER_COLORS.GREEN_THRESHOLD) return TIMER_COLORS.GREEN;
    if (percentage > TIMER_COLORS.AMBER_THRESHOLD) return TIMER_COLORS.AMBER;
    return TIMER_COLORS.RED;
  }, [timeRemaining, timeLimit]);

  const handleTimeLimitChange = useCallback((e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      onTimeLimitChange(value);
    }
  }, [onTimeLimitChange]);

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

      {!isActive && (
        <div className="timer-settings">
          <label htmlFor="time-limit">Time Limit:</label>
          <input
            id="time-limit"
            type="number"
            value={timeLimit}
            onChange={handleTimeLimitChange}
            min={TIMER_DEFAULTS.MIN_TIME_LIMIT}
            max={TIMER_DEFAULTS.MAX_TIME_LIMIT}
            step={TIMER_DEFAULTS.TIME_STEP}
          />
          <span>sec</span>
        </div>
      )}

      {timeRemaining <= TIMER_DEFAULTS.WARNING_THRESHOLD && timeRemaining > 0 && isActive && (
        <div className="timer-warning">
          {timeRemaining <= TIMER_DEFAULTS.URGENT_THRESHOLD ? 'Time up!' : `${TIMER_DEFAULTS.WARNING_THRESHOLD} seconds`}
        </div>
      )}
    </div>
  );
}

export default Timer;

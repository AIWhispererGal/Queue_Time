import { useEffect, useRef, useCallback } from 'react';
import { TIMER_DEFAULTS } from '../constants/timer';

/**
 * Custom hook for keyboard shortcuts with proper stale closure handling
 * Uses refs to always access current state values
 */
function useKeyboardShortcuts({
  currentSpeaker,
  queue,
  timeLimit,
  timeRemaining,
  onEndTurn,
  onStartNextSpeaker,
  onTogglePause,
  onAddGracePeriod
}) {
  // Use refs to avoid stale closures in event handlers
  const currentSpeakerRef = useRef(currentSpeaker);
  const queueRef = useRef(queue);
  const timeLimitRef = useRef(timeLimit);
  const timeRemainingRef = useRef(timeRemaining);

  // Keep refs in sync with props
  useEffect(() => {
    currentSpeakerRef.current = currentSpeaker;
  }, [currentSpeaker]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    timeLimitRef.current = timeLimit;
  }, [timeLimit]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Stable handler using refs
  const handleKeyPress = useCallback((e) => {
    // Ignore if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.key) {
      case ' ':
      case 'e':
      case 'E':
        e.preventDefault();
        // End current speaker's turn
        if (currentSpeakerRef.current) {
          onEndTurn();
        }
        break;

      case 'n':
      case 'N':
        e.preventDefault();
        // Start next speaker (only if no one is currently speaking)
        if (queueRef.current.length > 0 && !currentSpeakerRef.current) {
          onStartNextSpeaker();
        }
        break;

      case 'p':
      case 'P':
        e.preventDefault();
        // Toggle pause
        onTogglePause();
        break;

      case 'g':
      case 'G':
        e.preventDefault();
        // Add grace period
        if (currentSpeakerRef.current) {
          onAddGracePeriod(TIMER_DEFAULTS.GRACE_PERIOD_SHORT);
        }
        break;

      default:
        break;
    }
  }, [onEndTurn, onStartNextSpeaker, onTogglePause, onAddGracePeriod]);

  // Set up event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}

export default useKeyboardShortcuts;

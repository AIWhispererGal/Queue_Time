import React, { useState, useMemo, useCallback } from 'react';
import ParticipantList from './components/ParticipantList';
import SpeakerQueue from './components/SpeakerQueue';
import Timer from './components/Timer';
import Statistics from './components/Statistics';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import useZoomSdk from './hooks/useZoomSdk';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useVideoOverlay from './hooks/useVideoOverlay';
import { formatTime } from './utils/formatTime';
import { TIMER_DEFAULTS } from './constants/timer';
import './App.css';

function App() {
  // Zoom SDK state (extracted to custom hook)
  const {
    participants,
    isZoomConnected,
    myUserId,
    zoomSdkInstance,
    sdkError,
    debugInfo,
    contextType
  } = useZoomSdk();

  // App-specific state
  const [queue, setQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [speakerStats, setSpeakerStats] = useState({});
  const [timeLimit, setTimeLimit] = useState(TIMER_DEFAULTS.TIME_LIMIT);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DEFAULTS.TIME_LIMIT);
  const [videoOverlayEnabled, setVideoOverlayEnabled] = useState('full'); // 'off', 'mini', or 'full'
  const [overlayDebug, setOverlayDebug] = useState('Overlay not active');
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [totalSpeakersCount, setTotalSpeakersCount] = useState(0);
  const [shouldClearStatsOnNext, setShouldClearStatsOnNext] = useState(false);

  // Calculate session stats (memoized to prevent 60+ calculations per minute)
  const calculateStats = useMemo(() => {
    const sessionSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    const sessionTime = formatTime(sessionSeconds);

    // Get current speaker's stats
    let currentSpeakerStats = null;
    if (currentSpeaker) {
      const stats = speakerStats[currentSpeaker.userId] || { totalTime: 0, instances: 0 };

      // Calculate average time for this speaker (only from completed turns)
      const avgSecondsForSpeaker = stats.instances > 0 ?
        Math.floor(stats.totalTime / stats.instances) : 0;

      // Calculate total speaking time across all speakers (including current elapsed time)
      let totalSpeakingTime = Object.values(speakerStats).reduce(
        (total, speaker) => total + speaker.totalTime, 0
      );

      // Add current speaking time if speaker is active
      const currentElapsed = Math.max(0, timeLimit - timeRemaining);
      if (currentElapsed > 0) {
        totalSpeakingTime += currentElapsed;
      }

      // Calculate percentage of total time including current
      const speakerTotal = stats.totalTime + currentElapsed;
      const percentageOfTotal = totalSpeakingTime > 0 ?
        Math.round((speakerTotal / totalSpeakingTime) * 100) : 0;

      currentSpeakerStats = {
        turnNumber: stats.instances + 1 // This is their Nth turn (counting current)
      };
    }

    return {
      sessionTime,
      currentSpeakerStats
    };
  }, [speakerStats, currentSpeaker, sessionStartTime, totalSpeakersCount, timeLimit, timeRemaining]);

  const endTurn = useCallback(() => {
    setCurrentSpeaker(speaker => {
      if (speaker) {
        const timeSpoken = timeLimit - timeRemaining;
        setSpeakerStats(prev => ({
          ...prev,
          [speaker.userId]: {
            name: speaker.displayName,
            totalTime: (prev[speaker.userId]?.totalTime || 0) + timeSpoken,
            instances: (prev[speaker.userId]?.instances || 0) + 1
          }
        }));
        setTimeRemaining(timeLimit);
      }
      return null;
    });
  }, [timeLimit, timeRemaining]);

  // Keyboard shortcut callbacks
  const handleStartNextSpeaker = useCallback(() => {
    if (queue.length > 0 && !currentSpeaker) {
      const nextSpeaker = queue[0];
      setCurrentSpeaker(nextSpeaker);
      setQueue(prev => prev.slice(1));
      setTimeRemaining(timeLimit);
      setTotalSpeakersCount(prev => prev + 1);
    }
  }, [queue, currentSpeaker, timeLimit]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleAddGracePeriod = useCallback((seconds) => {
    setTimeRemaining(prev => Math.min(prev + seconds, timeLimit + TIMER_DEFAULTS.MAX_GRACE_OVER_LIMIT));
  }, [timeLimit]);

  // Keyboard shortcuts hook (extracted to avoid stale closures)
  useKeyboardShortcuts({
    currentSpeaker,
    queue,
    timeLimit,
    timeRemaining,
    onEndTurn: endTurn,
    onStartNextSpeaker: handleStartNextSpeaker,
    onTogglePause: handleTogglePause,
    onAddGracePeriod: handleAddGracePeriod
  });

  const addToQueue = useCallback((participant) => {
    setQueue(prev => {
      if (prev.find(p => p.userId === participant.userId)) {
        return prev;
      }
      return [...prev, participant];
    });
    // Check if we should clear stats when adding the first speaker for a new topic
    if (shouldClearStatsOnNext) {
      setSpeakerStats({});
      setTotalSpeakersCount(0);
      setShouldClearStatsOnNext(false);
    }
  }, [shouldClearStatsOnNext]);

  const removeFromQueue = useCallback((userId) => {
    setQueue(prev => prev.filter(p => p.userId !== userId));
  }, []);

  const reorderQueue = useCallback((result) => {
    if (!result.destination) return;
    setQueue(prev => {
      const items = Array.from(prev);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      return items;
    });
  }, []);

  const startSpeaking = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) return prev;
      const speaker = prev[0];
      setCurrentSpeaker(speaker);
      // Initialize stats if needed
      setSpeakerStats(stats => {
        if (stats[speaker.userId]) return stats;
        return {
          ...stats,
          [speaker.userId]: {
            name: speaker.displayName,
            totalTime: 0,
            instances: 0
          }
        };
      });
      return prev.slice(1);
    });
  }, []);

  const onTimerComplete = useCallback((timeSpoken) => {
    setCurrentSpeaker(speaker => {
      if (speaker) {
        setSpeakerStats(prev => ({
          ...prev,
          [speaker.userId]: {
            name: speaker.displayName,
            totalTime: (prev[speaker.userId]?.totalTime || 0) + timeSpoken,
            instances: (prev[speaker.userId]?.instances || 0) + 1
          }
        }));
      }
      return null;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const resetStats = useCallback(() => {
    setSpeakerStats({});
  }, []);

  const endTopic = useCallback(() => {
    // End current speaker's turn and prepare for new topic
    endTurn();
    setQueue([]);
    setShouldClearStatsOnNext(true);
  }, [endTurn]);

  const addGracePeriod = useCallback((seconds = TIMER_DEFAULTS.GRACE_PERIOD_LONG) => {
    setCurrentSpeaker(speaker => {
      if (speaker) {
        setTimeRemaining(prev => Math.min(prev + seconds, timeLimit + TIMER_DEFAULTS.MAX_GRACE_OVER_LIMIT));
      }
      return speaker;
    });
  }, [timeLimit]);

  // Use video overlay hook when enabled
  const overlayStatus = useVideoOverlay(
    videoOverlayEnabled !== 'off' ? zoomSdkInstance : null,
    currentSpeaker,
    timeRemaining,
    timeLimit,
    myUserId,
    queue,
    setOverlayDebug,
    calculateStats,
    isPaused,
    videoOverlayEnabled // pass the mode ('mini' or 'full')
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Queue Manager</h1>
        <div className="header-controls">
          {currentSpeaker && (
            <span className="timing-badge">
              Timing: {currentSpeaker.displayName}
            </span>
          )}
          <button
            onClick={() => {
              // Cycle through modes: off -> mini -> full -> off
              const nextMode = videoOverlayEnabled === 'off' ? 'mini' :
                               videoOverlayEnabled === 'mini' ? 'full' : 'off';
              setVideoOverlayEnabled(nextMode);
            }}
            className={`btn-small ${videoOverlayEnabled !== 'off' ? 'btn-active' : 'btn-inactive'}`}
            title="Toggle video overlay mode"
          >
            Video: {videoOverlayEnabled.toUpperCase()}
          </button>
          {!isZoomConnected && (
            <>
              <span className="dev-mode-badge">Dev Mode</span>
              {sdkError && (
                <span className="error-text">
                  {sdkError}
                </span>
              )}
            </>
          )}
        </div>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <ParticipantList
            participants={participants}
            onAddToQueue={addToQueue}
            speakerStats={speakerStats}
            currentSpeaker={currentSpeaker}
            queue={queue}
          />
        </div>

        <div className="center-panel">
          <Timer
            isActive={!!currentSpeaker}
            timeLimit={timeLimit}
            timeRemaining={timeRemaining}
            currentSpeaker={currentSpeaker}
            speakerStats={speakerStats[currentSpeaker?.userId]}
            onComplete={onTimerComplete}
            onTimeLimitChange={setTimeLimit}
            onTimeRemainingChange={setTimeRemaining}
            isPaused={isPaused}
          />

          <SpeakerQueue
            queue={queue}
            onRemove={removeFromQueue}
            onReorder={reorderQueue}
            onStartSpeaking={startSpeaking}
            onClearQueue={clearQueue}
            currentSpeaker={currentSpeaker}
            onEndTopic={endTopic}
            onEndTurn={endTurn}
            onAddGracePeriod={addGracePeriod}
          />

          <Settings
            timeLimit={timeLimit}
            onTimeLimitChange={setTimeLimit}
          />
        </div>

        <div className="right-panel">
          <Statistics
            speakerStats={speakerStats}
            participants={participants}
            onReset={resetStats}
            currentSpeaker={currentSpeaker}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
          />
        </div>
      </div>
    </div>
  );
}

// Wrap App with ErrorBoundary for graceful error handling
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
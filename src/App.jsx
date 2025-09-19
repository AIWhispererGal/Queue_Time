import React, { useState, useEffect } from 'react';
import zoomSdk from '@zoom/appssdk';
import ParticipantList from './components/ParticipantList';
import SpeakerQueue from './components/SpeakerQueue';
import Timer from './components/Timer';
import Statistics from './components/Statistics';
import FloatingTimer from './components/FloatingTimer';
import Settings from './components/Settings';
import useVideoOverlay from './hooks/useVideoOverlay';
import './App.css';

function App() {
  const [participants, setParticipants] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [speakerStats, setSpeakerStats] = useState({});
  const [timeLimit, setTimeLimit] = useState(120); // 2 minutes default
  const [isZoomConnected, setIsZoomConnected] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [myUserId, setMyUserId] = useState(null);
  const [zoomSdkInstance, setZoomSdkInstance] = useState(null);
  const [videoOverlayEnabled, setVideoOverlayEnabled] = useState(true);
  const [sdkError, setSdkError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('Waiting to initialize...');
  const [overlayDebug, setOverlayDebug] = useState('Overlay not active');
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [totalSpeakersCount, setTotalSpeakersCount] = useState(0);

  // Calculate session stats
  const calculateStats = () => {
    const sessionSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    const sessionMins = Math.floor(sessionSeconds / 60);
    const sessionSecs = sessionSeconds % 60;
    const sessionTime = `${String(sessionMins).padStart(2, '0')}:${String(sessionSecs).padStart(2, '0')}`;

    // Get current speaker's stats
    let currentSpeakerStats = null;
    if (currentSpeaker) {
      const stats = speakerStats[currentSpeaker.userId] || { totalTime: 0, instances: 0 };

      // Calculate average time for this speaker (only from completed turns)
      const avgSecondsForSpeaker = stats.instances > 0 ?
        Math.floor(stats.totalTime / stats.instances) : 0;
      const avgMins = Math.floor(avgSecondsForSpeaker / 60);
      const avgSecs = avgSecondsForSpeaker % 60;

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
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case ' ':
        case 'e':
        case 'E':
          e.preventDefault();
          // End current speaker's turn and update stats
          if (currentSpeaker) {
            // Calculate time spoken
            const timeSpoken = timeLimit - timeRemaining;

            // Update speaker stats
            setSpeakerStats(prev => ({
              ...prev,
              [currentSpeaker.userId]: {
                name: currentSpeaker.displayName,
                totalTime: (prev[currentSpeaker.userId]?.totalTime || 0) + timeSpoken,
                instances: (prev[currentSpeaker.userId]?.instances || 0) + 1
              }
            }));

            setCurrentSpeaker(null);
            setTimeRemaining(timeLimit);
          }
          break;

        case 'n':
        case 'N':
        case 'Enter':
          if (e.target.tagName !== 'BUTTON') { // Don't trigger on button press
            e.preventDefault();
            // Start next speaker
            if (queue.length > 0 && !currentSpeaker) {
              const nextSpeaker = queue[0];
              setCurrentSpeaker(nextSpeaker);
              setQueue(queue.slice(1));
              setTimeRemaining(timeLimit);
              setTotalSpeakersCount(prev => prev + 1);
            }
          }
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          // Toggle pause
          setIsPaused(prev => !prev);
          break;

        case 'g':
        case 'G':
          e.preventDefault();
          // Add grace period (+15 seconds)
          setTimeRemaining(prev => Math.min(prev + 15, timeLimit + 60)); // Max grace of 1 minute over
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSpeaker, queue, timeLimit]);

  useEffect(() => {
    // Inject critical styles for Zoom iframe compatibility
    const injectCriticalStyles = () => {
      // Check if styles already exist to prevent duplicates
      if (document.querySelector('style[data-critical="zoom-app"]')) {
        console.log('Critical styles already injected, skipping...');
        return;
      }

      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-critical', 'zoom-app');
      document.head.appendChild(styleEl);

      // Use insertRule to avoid CSP violations with innerHTML
      const sheet = styleEl.sheet;
      const rules = [
        'body #root { background: #f5f5f5 !important; }',
        'body #root .app { display: flex !important; flex-direction: column !important; min-height: 100vh !important; }',
        'body #root .app-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: white !important; padding: 0.5rem 1rem !important; display: flex !important; align-items: center !important; justify-content: space-between !important; }',
        'body #root .main-layout { flex: 1 !important; display: flex !important; gap: 0.5rem !important; padding: 0.5rem !important; }',
        'body #root .left-panel, body #root .right-panel { flex: 1 !important; background: white !important; border-radius: 0.25rem !important; padding: 0.5rem !important; }',
        'body #root .center-panel { flex: 1.5 !important; display: flex !important; flex-direction: column !important; gap: 0.5rem !important; }'
      ];

      rules.forEach(rule => {
        try {
          sheet.insertRule(rule, sheet.cssRules.length);
        } catch (e) {
          console.warn('Failed to insert CSS rule:', rule, e);
        }
      });
      
      console.log('Critical styles injected successfully using insertRule');
    };

    injectCriticalStyles();

    // Wait a bit for SDK to be ready in Zoom client
    const timer = setTimeout(() => {
      initializeZoomApp();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const initializeZoomApp = async () => {
    setDebugInfo('Starting SDK initialization...');
    try {
      console.log('Initializing Zoom SDK...');

      // Configure SDK with event-based capabilities that work without special permissions
      const configResponse = await zoomSdk.config({
        capabilities: [
          'getMeetingContext',
          'getRunningContext',
          'getUserContext',
          'onParticipantChange',
          'onMeeting',
          'onExpandApp',
          'onConnect',
          'onMessage',
          'onReaction',
          'runRenderingContext',
          'closeRenderingContext',
          'drawImage',
          'clearImage',
          'drawParticipant',
          'drawWebView',
          'clearParticipant',
          'clearWebView'
        ],
        version: '0.16.0'
      });

      console.log('SDK configured:', configResponse);
      setDebugInfo('SDK configured successfully! Using event-based tracking.');

      // Mark as connected immediately after config success
      setIsZoomConnected(true);

      // Get current user info first
      try {
        const context = await zoomSdk.getRunningContext();
        console.log('Running context:', context);
        setMyUserId(context.userId);
        setDebugInfo(`Connected as user: ${context.userId}`);
      } catch (e) {
        console.log('Could not get running context:', e);
      }

      // Get meeting context for basic info
      try {
        const meetingContext = await zoomSdk.getMeetingContext();
        console.log('Meeting context:', meetingContext);

        // Extract any participant info from meeting context if available
        if (meetingContext.meetingID) {
          setDebugInfo(`Connected to meeting: ${meetingContext.meetingID}`);
        }
      } catch (e) {
        console.log('Could not get meeting context:', e);
      }

      // Set up event listeners first (these work without special permissions)
      console.log('Setting up event listeners...');

      // Primary participant tracking via events
      try {
        await zoomSdk.onParticipantChange((event) => {
          console.log('Participant change event:', event);
          setDebugInfo(`Participant update: ${event.participants?.length || 0} participants`);

          if (event.participants && Array.isArray(event.participants)) {
            const formattedParticipants = event.participants.map(p => ({
              userId: p.participantUUID || p.participantId || p.userId || String(Math.random()),
              displayName: p.displayName || p.screenName || p.userName || 'Unknown User',
              avatar: p.avatar || null,
              role: p.role || (p.isHost ? 'host' : 'participant'),
              isCurrentUser: p.participantUUID === myUserId || p.userId === myUserId
            }));

            setParticipants(formattedParticipants);
            console.log('✅ Updated participants via event:', formattedParticipants.length);
          }
        });
        console.log('✅ Participant change listener registered');
      } catch (e) {
        console.log('Could not register onParticipantChange:', e);
      }

      // Try to set up meeting event listener
      try {
        await zoomSdk.onMeeting((event) => {
          console.log('Meeting event:', event);
          if (event.action === 'ended') {
            setParticipants([]);
            setDebugInfo('Meeting ended');
          }
        });
        console.log('✅ Meeting listener registered');
      } catch (e) {
        console.log('Could not register onMeeting:', e);
      }

      // Listen for messages (sometimes used for participant updates)
      try {
        await zoomSdk.onMessage((event) => {
          console.log('Message event:', event);
        });
      } catch (e) {
        console.log('Could not register onMessage:', e);
      }

      // NOW try to get initial participants - but don't fail if we can't
      try {
        console.log('Attempting to get initial participants...');

        // Try multiple approaches in order of likelihood to work
        let participantData = null;

        // Approach 1: Try getMeetingParticipants (might work in some contexts)
        try {
          participantData = await zoomSdk.getMeetingParticipants();
          console.log('getMeetingParticipants succeeded:', participantData);
        } catch (e) {
          console.log('getMeetingParticipants failed (expected):', e.message);
        }

        // Approach 2: Try listParticipants (older API)
        if (!participantData) {
          try {
            participantData = await zoomSdk.listParticipants();
            console.log('listParticipants succeeded:', participantData);
          } catch (e) {
            console.log('listParticipants failed:', e.message);
          }
        }

        // Process any participant data we got
        if (participantData && participantData.participants) {
          const formattedParticipants = participantData.participants.map(p => ({
            userId: p.participantUUID || p.participantId || p.userId || String(Math.random()),
            displayName: p.displayName || p.screenName || p.userName || 'Unknown User',
            avatar: p.avatar || null,
            role: p.role || (p.isHost ? 'host' : 'participant')
          }));

          setParticipants(formattedParticipants);
          setDebugInfo(`Loaded ${formattedParticipants.length} participants`);
        } else {
          console.log('No initial participants available - waiting for events');
          setDebugInfo('Waiting for participants to join (event-based mode)');
          setParticipants([]); // Start with empty, will populate via events
        }

      } catch (e) {
        console.log('Could not get initial participants (using event mode):', e.message);
        setDebugInfo('Event mode active - participants will appear as they join/leave');
      }

      // Store the SDK instance for video overlay
      setZoomSdkInstance(zoomSdk);

      // Success - we're connected even if we don't have participants yet
      console.log('✅ Zoom SDK initialized successfully in event mode');

    } catch (error) {
      console.error('Zoom SDK initialization failed:', error);
      setSdkError(error.message || 'Unknown error');
      setDebugInfo('SDK Error: ' + (error.message || 'Unknown error'));

      // Load mock data for testing
      console.log('Loading mock data for testing');
      setMyUserId('1');
      setParticipants([
        { userId: '1', displayName: 'John Doe (You)', avatar: null, role: 'host', isCurrentUser: true },
        { userId: '2', displayName: 'Jane Smith', avatar: null, role: 'participant' },
        { userId: '3', displayName: 'Bob Johnson', avatar: null, role: 'participant' },
        { userId: '4', displayName: 'Alice Brown', avatar: null, role: 'participant' },
        { userId: '5', displayName: 'Charlie Davis', avatar: null, role: 'participant' },
        { userId: '6', displayName: 'Sarah Lee', avatar: null, role: 'participant' },
        { userId: '7', displayName: 'Mike Wilson', avatar: null, role: 'participant' },
      ]);
    }
  };

  const addToQueue = (participant) => {
    if (!queue.find(p => p.userId === participant.userId)) {
      setQueue([...queue, participant]);
    }
  };

  const removeFromQueue = (userId) => {
    setQueue(queue.filter(p => p.userId !== userId));
  };

  const reorderQueue = (result) => {
    if (!result.destination) return;

    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQueue(items);
  };

  const startSpeaking = () => {
    if (queue.length > 0) {
      const speaker = queue[0];
      setCurrentSpeaker(speaker);
      setQueue(queue.slice(1));

      // Initialize stats if needed
      if (!speakerStats[speaker.userId]) {
        setSpeakerStats({
          ...speakerStats,
          [speaker.userId]: {
            name: speaker.displayName,
            totalTime: 0,
            instances: 0
          }
        });
      }
    }
  };

  const onTimerComplete = (timeSpoken) => {
    if (currentSpeaker) {
      setSpeakerStats(prev => ({
        ...prev,
        [currentSpeaker.userId]: {
          name: currentSpeaker.displayName,
          totalTime: (prev[currentSpeaker.userId]?.totalTime || 0) + timeSpoken,
          instances: (prev[currentSpeaker.userId]?.instances || 0) + 1
        }
      }));
      setCurrentSpeaker(null);
    }
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const resetStats = () => {
    setSpeakerStats({});
  };

  // Use video overlay hook when enabled
  const overlayStatus = useVideoOverlay(
    videoOverlayEnabled ? zoomSdkInstance : null,
    currentSpeaker,
    timeRemaining,
    timeLimit,
    myUserId,
    queue,
    setOverlayDebug,
    calculateStats(),
    isPaused
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
            onClick={() => setVideoOverlayEnabled(!videoOverlayEnabled)}
            className={`btn-small ${videoOverlayEnabled ? 'btn-active' : 'btn-inactive'}`}
            title="Shows timer on YOUR video for everyone to see"
          >
            My Video Timer: {videoOverlayEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowFloatingTimer(!showFloatingTimer)}
            className="btn-small"
          >
            Floating: {showFloatingTimer ? 'ON' : 'OFF'}
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
            isActive={!!currentSpeaker && !isPaused}
            timeLimit={timeLimit}
            currentSpeaker={currentSpeaker}
            speakerStats={speakerStats[currentSpeaker?.userId]}
            onComplete={onTimerComplete}
            onTimeLimitChange={setTimeLimit}
            onTimeRemainingChange={setTimeRemaining}
            isPaused={isPaused}
            externalTimeRemaining={timeRemaining}
          />

          <SpeakerQueue
            queue={queue}
            onRemove={removeFromQueue}
            onReorder={reorderQueue}
            onStartSpeaking={startSpeaking}
            onClearQueue={clearQueue}
            currentSpeaker={currentSpeaker}
          />

          <Settings
            timeLimit={timeLimit}
            onTimeLimitChange={setTimeLimit}
            videoOverlayEnabled={videoOverlayEnabled}
            onVideoOverlayChange={setVideoOverlayEnabled}
          />
        </div>

        <div className="right-panel">
          <Statistics
            speakerStats={speakerStats}
            participants={participants}
            onReset={resetStats}
          />
        </div>
      </div>

      {showFloatingTimer && (
        <FloatingTimer
          currentSpeaker={currentSpeaker}
          timeRemaining={timeRemaining}
          timeLimit={timeLimit}
          speakerStats={speakerStats[currentSpeaker?.userId]}
        />
      )}

      {/* Debug Info */}
      <div className="debug-panel" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <div>🔍 DEBUG INFO:</div>
        <div style={{ backgroundColor: videoOverlayEnabled && currentSpeaker ? '#2e7d32' : '#333', padding: '2px 5px', marginBottom: '2px' }}>
          Hook Active: {videoOverlayEnabled && currentSpeaker ? '✅ YES' : '❌ NO'}
        </div>
        <div>Overlay Enabled: {videoOverlayEnabled ? '✅ YES' : '❌ NO'}</div>
        <div>Current Speaker: {currentSpeaker ? `🎤 ${currentSpeaker.displayName}` : '❌ None'}</div>
        <div>Time Remaining: {timeRemaining}s</div>
        <div>Rendering Context: {overlayStatus?.renderingContextActive ? '✅ ACTIVE' : '❌ INACTIVE'}</div>
        <div>Video Overlay: {overlayDebug || 'Not initialized'}</div>
        <div>SDK Connected: {isZoomConnected ? '✅ YES' : '❌ NO'}</div>
        <div>Participants: {participants.length}</div>
        <div>Status: {debugInfo}</div>
        {/* Stats Debug */}
        <div style={{ borderTop: '1px solid #555', marginTop: '5px', paddingTop: '5px' }}>
          <div>📊 STATS DEBUG:</div>
          {currentSpeaker && (
            <>
              <div>Turn #: {speakerStats[currentSpeaker.userId]?.instances + 1 || 1}</div>
              <div>Speaker Total Time: {speakerStats[currentSpeaker.userId]?.totalTime || 0}s</div>
              <div>Stats Calculated: {calculateStats().currentSpeakerStats ? '✅' : '❌'}</div>
            </>
          )}
        </div>
        {sdkError && <div className="debug-error">Error: {sdkError}</div>}
      </div>
    </div>
  );
}

export default App;
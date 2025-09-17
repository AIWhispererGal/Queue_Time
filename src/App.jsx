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
  const [zoomStream, setZoomStream] = useState(null);
  const [videoOverlayEnabled, setVideoOverlayEnabled] = useState(true);

  useEffect(() => {
    initializeZoomApp();
  }, []);

  const initializeZoomApp = async () => {
    try {
      console.log('Starting Zoom SDK initialization...');
      console.log('zoomSdk available:', !!zoomSdk);

      // Try minimal config first
      const configResponse = await zoomSdk.config({
        capabilities: ['getMeetingParticipants'],
      });

      console.log('Zoom SDK configured:', configResponse);

      // Get current user info
      const context = await zoomSdk.getRunningContext();
      console.log('Running context:', context);
      setMyUserId(context.userId);

      // Get meeting participants using the newer API
      try {
        const meetingContext = await zoomSdk.getMeetingContext();
        console.log('Meeting context:', meetingContext);

        const participantList = await zoomSdk.getMeetingParticipants();
        console.log('Participants:', participantList);

        // Format participants
        const formattedParticipants = participantList.participants.map(p => ({
          userId: p.participantId || p.userId,
          displayName: p.displayName || p.screenName || 'Unknown',
          avatar: p.avatar || null,
          role: p.role || (p.isHost ? 'host' : 'participant')
        }));

        setParticipants(formattedParticipants);
        setIsZoomConnected(true);
      } catch (e) {
        console.log('Error getting participants:', e);
        // Try the older API
        try {
          const { participants } = await zoomSdk.listParticipants();
          console.log('Participants (old API):', participants);
          setParticipants(participants);
          setIsZoomConnected(true);
        } catch (e2) {
          console.log('Error with old API too:', e2);
          throw e2;
        }
      }

      // Listen for participant changes
      zoomSdk.onParticipantChange((event) => {
        // Merge with existing panelists if any
        const panelists = participants.filter(p => p.role === 'panelist');
        const updatedList = [...event.participants, ...panelists];
        const unique = Array.from(
          new Map(updatedList.map(a => [a.userId, a])).values()
        );
        setParticipants(unique);
      });

      // Listen for panelist changes (webinars)
      try {
        zoomSdk.onPanelistChange((event) => {
          // Merge with existing participants
          const regularParticipants = participants.filter(p => !p.role || p.role !== 'panelist');
          const panelistsWithRole = event.panelists.map(p => ({
            ...p,
            role: 'panelist'
          }));
          const updatedList = [...regularParticipants, ...panelistsWithRole];
          const unique = Array.from(
            new Map(updatedList.map(a => [a.userId, a])).values()
          );
          setParticipants(unique);
        });
      } catch (e) {
        console.log('Panelist events not available');
      }
    } catch (error) {
      console.error('Error initializing Zoom App:', error);

      // For development/testing without Zoom
      setMyUserId('1'); // Simulate you as John Doe
      setParticipants([
        { userId: '1', displayName: 'John Doe (You)', avatar: null, role: 'panelist' },
        { userId: '2', displayName: 'Jane Smith', avatar: null, role: 'panelist' },
        { userId: '3', displayName: 'Bob Johnson', avatar: null, role: 'panelist' },
        { userId: '4', displayName: 'Alice Brown', avatar: null },
        { userId: '5', displayName: 'Charlie Davis', avatar: null },
        { userId: '6', displayName: 'Sarah Lee', avatar: null },
        { userId: '7', displayName: 'Mike Wilson', avatar: null, role: 'panelist' },
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
  useVideoOverlay(
    videoOverlayEnabled ? zoomStream : null,
    currentSpeaker,
    timeRemaining,
    timeLimit,
    myUserId,
    queue
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Queue Manager</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {currentSpeaker && (
            <span style={{
              background: '#FF9800',
              color: 'white',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.625rem',
              fontWeight: 'bold'
            }}>
              Timing: {currentSpeaker.displayName}
            </span>
          )}
          <button
            onClick={() => setVideoOverlayEnabled(!videoOverlayEnabled)}
            style={{
              fontSize: '0.625rem',
              padding: '0.25rem 0.5rem',
              background: videoOverlayEnabled ? '#4CAF50' : '#666'
            }}
            title="Shows timer on YOUR video for everyone to see"
          >
            My Video Timer: {videoOverlayEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowFloatingTimer(!showFloatingTimer)}
            style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
          >
            Floating: {showFloatingTimer ? 'ON' : 'OFF'}
          </button>
          {!isZoomConnected && (
            <span className="dev-mode-badge">Dev Mode</span>
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
            currentSpeaker={currentSpeaker}
            speakerStats={speakerStats[currentSpeaker?.userId]}
            onComplete={onTimerComplete}
            onTimeLimitChange={setTimeLimit}
            onTimeRemainingChange={setTimeRemaining}
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
    </div>
  );
}

export default App;
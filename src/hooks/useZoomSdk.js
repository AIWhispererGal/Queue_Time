import { useState, useEffect, useCallback } from 'react';
import zoomSdk from '@zoom/appssdk';

/**
 * Custom hook for Zoom SDK initialization and participant management
 * Extracts ~228 lines of SDK logic from App.jsx
 */
function useZoomSdk() {
  const [participants, setParticipants] = useState([]);
  const [isZoomConnected, setIsZoomConnected] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [zoomSdkInstance, setZoomSdkInstance] = useState(null);
  const [sdkError, setSdkError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('Waiting to initialize...');
  const [contextType, setContextType] = useState(null); // 'meeting' or 'webinar'

  const initializeZoomApp = useCallback(async () => {
    setDebugInfo('Starting SDK initialization...');
    try {
      // Configure SDK with event-based capabilities that work without special permissions
      const configResponse = await zoomSdk.config({
        capabilities: [
          'getMeetingContext',
          'getWebinarContext',
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

      setDebugInfo('SDK configured successfully! Using event-based tracking.');

      // Mark as connected immediately after config success
      setIsZoomConnected(true);

      // Get current user info and detect context type (meeting vs webinar)
      let detectedContextType = null;
      try {
        const context = await zoomSdk.getRunningContext();
        setMyUserId(context.userId);

        // Detect if we're in a webinar or meeting
        if (context.context === 'inWebinar') {
          detectedContextType = 'webinar';
          setContextType('webinar');
          setDebugInfo(`Connected to webinar as user: ${context.userId}`);
        } else if (context.context === 'inMeeting') {
          detectedContextType = 'meeting';
          setContextType('meeting');
          setDebugInfo(`Connected to meeting as user: ${context.userId}`);
        } else {
          detectedContextType = 'unknown';
          setContextType('unknown');
          setDebugInfo(`Connected as user: ${context.userId}`);
        }
      } catch (e) {
        // Could not get running context
      }

      // Get context info (meeting or webinar) based on detected context type
      try {
        if (detectedContextType === 'webinar') {
          const contextData = await zoomSdk.getWebinarContext();
          if (contextData.webinarID) {
            setDebugInfo(`Connected to webinar: ${contextData.webinarID}`);
          }
        } else {
          const contextData = await zoomSdk.getMeetingContext();
          if (contextData.meetingID) {
            setDebugInfo(`Connected to meeting: ${contextData.meetingID}`);
          }
        }
      } catch (e) {
        // Could not get context
      }

      // Set up event listeners (these work without special permissions)

      // Primary participant tracking via events
      try {
        await zoomSdk.onParticipantChange((event) => {
          setDebugInfo(`Participant update: ${event.participants?.length || 0} participants`);

          if (event.participants && Array.isArray(event.participants)) {
            const formattedParticipants = event.participants.map(p => ({
              userId: p.participantUUID || p.participantId || p.userId || String(Math.random()),
              displayName: p.displayName || p.screenName || p.userName || 'Unknown User',
              avatar: p.avatar || null,
              role: p.role || (p.isHost ? 'host' : 'participant'),
              isCurrentUser: p.participantUUID === myUserId || p.userId === myUserId,
              isPanelist: p.role === 'panelist' || p.role === 'host' || p.role === 'coHost'
            }));

            // For webinars, only show panelists (speakers) - filter out attendees
            const visibleParticipants = detectedContextType === 'webinar'
              ? formattedParticipants.filter(p => p.isPanelist)
              : formattedParticipants;

            setParticipants(visibleParticipants);
          }
        });
      } catch (e) {
        // Could not register onParticipantChange
      }

      // Try to set up meeting event listener
      try {
        await zoomSdk.onMeeting((event) => {
          if (event.action === 'ended') {
            setParticipants([]);
            setDebugInfo('Meeting ended');
          }
        });
      } catch (e) {
        // Could not register onMeeting
      }

      // Listen for messages (sometimes used for participant updates)
      try {
        await zoomSdk.onMessage((event) => {
          // Message event received
        });
      } catch (e) {
        // Could not register onMessage
      }

      // Try to get initial participants - but don't fail if we can't
      try {
        let participantData = null;

        if (detectedContextType === 'webinar') {
          // Webinar context: Try getWebinarParticipants
          try {
            participantData = await zoomSdk.getWebinarParticipants();
          } catch (e) {
            // getWebinarParticipants failed
          }
        } else {
          // Meeting context: Try getMeetingParticipants
          try {
            participantData = await zoomSdk.getMeetingParticipants();
          } catch (e) {
            // getMeetingParticipants failed (expected)
          }

          // Fallback: Try listParticipants (older API, works in both)
          if (!participantData) {
            try {
              participantData = await zoomSdk.listParticipants();
            } catch (e) {
              // listParticipants failed
            }
          }
        }

        // Process any participant data we got
        if (participantData && participantData.participants) {
          const formattedParticipants = participantData.participants.map(p => ({
            userId: p.participantUUID || p.participantId || p.userId || String(Math.random()),
            displayName: p.displayName || p.screenName || p.userName || 'Unknown User',
            avatar: p.avatar || null,
            role: p.role || (p.isHost ? 'host' : 'participant'),
            isPanelist: p.role === 'panelist' || p.role === 'host' || p.role === 'coHost'
          }));

          // For webinars, only show panelists (speakers) - filter out attendees
          const visibleParticipants = detectedContextType === 'webinar'
            ? formattedParticipants.filter(p => p.isPanelist)
            : formattedParticipants;

          setParticipants(visibleParticipants);
          const contextLabel = detectedContextType === 'webinar' ? 'panelists' : 'participants';
          setDebugInfo(`Loaded ${visibleParticipants.length} ${contextLabel}`);
        } else {
          setDebugInfo('Waiting for participants to join (event-based mode)');
          setParticipants([]); // Start with empty, will populate via events
        }

      } catch (e) {
        setDebugInfo('Event mode active - participants will appear as they join/leave');
      }

      // Store the SDK instance for video overlay
      setZoomSdkInstance(zoomSdk);

    } catch (error) {
      setSdkError(error.message || 'Unknown error');
      setDebugInfo('SDK Error: ' + (error.message || 'Unknown error'));

      // Load mock data for testing
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
  }, [myUserId]);

  // Initialize SDK on mount
  useEffect(() => {
    // Inject critical styles for Zoom iframe compatibility
    const injectCriticalStyles = () => {
      // Check if styles already exist to prevent duplicates
      if (document.querySelector('style[data-critical="zoom-app"]')) {
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
          // Failed to insert CSS rule
        }
      });
    };

    injectCriticalStyles();

    // Wait a bit for SDK to be ready in Zoom client
    const timer = setTimeout(() => {
      initializeZoomApp();
    }, 1000);

    return () => clearTimeout(timer);
  }, [initializeZoomApp]);

  return {
    participants,
    setParticipants,
    isZoomConnected,
    myUserId,
    zoomSdkInstance,
    sdkError,
    debugInfo,
    contextType
  };
}

export default useZoomSdk;

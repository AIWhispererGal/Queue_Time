import { useState, useEffect, useCallback, useRef } from 'react';
import zoomSdk from '@zoom/appssdk';

// Normalize a raw Zoom participant object into our internal shape. Shared by the
// initial roster fetch and the self-healing poll so both stay consistent.
function formatParticipant(p, myUserId) {
  const userId = p.participantUUID || p.participantId || p.userId || String(Math.random());
  return {
    userId,
    displayName: p.displayName || p.screenName || p.userName || 'Unknown User',
    avatar: p.avatar || null,
    role: p.role || (p.isHost ? 'host' : 'participant'),
    isCurrentUser: userId === myUserId,
    // Zoom event roles are host | cohost | attendee
    isPanelist: p.role === 'panelist' || p.role === 'host' ||
      p.role === 'cohost' || p.role === 'coHost'
  };
}

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
  const [runningContext, setRunningContext] = useState(null); // raw Zoom context, e.g. 'inMeeting' | 'inCamera' | 'inImmersive'
  const [handRaises, setHandRaises] = useState([]);
  const handRaisesRef = useRef([]);
  const myUserIdRef = useRef(null);
  const rosterPollRef = useRef(null);

  const initializeZoomApp = useCallback(async () => {
    setDebugInfo('Starting SDK initialization...');
    try {
      // Configure SDK with event-based capabilities that work without special permissions
      await zoomSdk.config({
        capabilities: [
          'getMeetingContext',
          'getWebinarContext',
          'getRunningContext',
          'getUserContext',
          'getMeetingParticipants',
          'getWebinarParticipants',
          'listParticipants',
          'onParticipantChange',
          'onMeeting',
          'onExpandApp',
          'onConnect',
          'onMessage',
          'onReaction',
          'onFeedbackReaction',
          'onRemoveFeedbackReaction',
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
        myUserIdRef.current = context.userId;
        // Store the raw running context so the app can render a minimal camera
        // overlay when Zoom loads this webview inside the camera/immersive feed.
        setRunningContext(context.context);

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
      } catch {
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
      } catch {
        // Could not get context
      }

      // Set up event listeners (these work without special permissions)

      // Primary participant tracking via events
      try {
        await zoomSdk.onParticipantChange((event) => {
          // onParticipantChange delivers a DELTA — only the participants who
          // just joined or left, each tagged with status 'join' | 'leave'. It is
          // NOT the full roster, so we must merge it into existing state rather
          // than replace (replacing collapsed the list to just the changed user).
          if (!event.participants || !Array.isArray(event.participants)) return;

          setDebugInfo(`Participant update: ${event.participants.length} change(s)`);

          setParticipants(prev => {
            const byId = new Map(prev.map(p => [p.userId, p]));

            for (const p of event.participants) {
              const userId = p.participantUUID || p.participantId || p.userId;
              if (!userId) continue;

              if (p.status === 'leave') {
                byId.delete(userId);
                continue;
              }

              // status 'join' (or any non-leave update): add or refresh entry
              byId.set(userId, {
                userId,
                displayName: p.displayName || p.screenName || p.userName || 'Unknown User',
                avatar: p.avatar || null,
                role: p.role || (p.isHost ? 'host' : 'participant'),
                isCurrentUser: userId === myUserIdRef.current,
                // Zoom event roles are host | cohost | attendee
                isPanelist: p.role === 'panelist' || p.role === 'host' ||
                  p.role === 'cohost' || p.role === 'coHost'
              });
            }

            const merged = Array.from(byId.values());

            // For webinars, only show panelists (speakers) - filter out attendees
            return detectedContextType === 'webinar'
              ? merged.filter(p => p.isPanelist)
              : merged;
          });
        });
      } catch (e) {
        console.warn('onParticipantChange registration failed', e);
        setDebugInfo('onParticipantChange failed: ' + (e?.message || e));
      }

      // Try to set up meeting event listener
      try {
        await zoomSdk.onMeeting((event) => {
          if (event.action === 'ended') {
            setParticipants([]);
            setDebugInfo('Meeting ended');
          }
        });
      } catch {
        // Could not register onMeeting
      }

      // Listen for messages (sometimes used for participant updates)
      try {
        await zoomSdk.onMessage(() => {
          // Message event received
        });
      } catch {
        // Could not register onMessage
      }

      // Hand raise detection (meetings only — SDK error 10128 in webinars)
      try {
        await zoomSdk.onFeedbackReaction((event) => {
          if (event.feedback === 'raiseHand') {
            const userId = event.participantUUID || event.participantId || event.userId;
            if (!userId) return;
            setHandRaises(prev => {
              if (prev.some(h => h.userId === userId)) return prev;
              const next = [...prev, { userId, timestamp: Date.now() }];
              handRaisesRef.current = next;
              return next;
            });
          }
        });
      } catch {
        // onFeedbackReaction not available (webinar or unsupported)
      }

      try {
        await zoomSdk.onRemoveFeedbackReaction((event) => {
          const userId = event.participantUUID || event.participantId || event.userId;
          if (!userId) return;
          setHandRaises(prev => {
            const next = prev.filter(h => h.userId !== userId);
            handRaisesRef.current = next;
            return next;
          });
        });
      } catch {
        // onRemoveFeedbackReaction not available
      }

      // Try to get initial participants - but don't fail if we can't
      try {
        let participantData = null;

        if (detectedContextType === 'webinar') {
          // Webinar context: Try getWebinarParticipants
          try {
            participantData = await zoomSdk.getWebinarParticipants();
          } catch (e) {
            console.warn('getWebinarParticipants failed', e);
            setDebugInfo('getWebinarParticipants failed: ' + (e?.message || e));
          }
        } else {
          // Meeting context: Try getMeetingParticipants
          try {
            participantData = await zoomSdk.getMeetingParticipants();
          } catch (e) {
            console.warn('getMeetingParticipants failed', e);
            setDebugInfo('getMeetingParticipants failed: ' + (e?.message || e));
          }

          // Fallback: Try listParticipants (older API, works in both)
          if (!participantData) {
            try {
              participantData = await zoomSdk.listParticipants();
            } catch (e) {
              console.warn('listParticipants failed', e);
              setDebugInfo('listParticipants failed: ' + (e?.message || e));
            }
          }
        }

        // Process any participant data we got
        if (participantData && participantData.participants) {
          const formattedParticipants = participantData.participants.map(
            p => formatParticipant(p, myUserIdRef.current)
          );

          // For webinars, only show panelists (speakers) - filter out attendees
          const visibleParticipants = detectedContextType === 'webinar'
            ? formattedParticipants.filter(p => p.isPanelist)
            : formattedParticipants;

          setParticipants(visibleParticipants);
          const contextLabel = detectedContextType === 'webinar' ? 'panelists' : 'participants';
          setDebugInfo(`Loaded ${visibleParticipants.length} ${contextLabel}`);

          // Self-healing: the initial fetch worked, so the participant capability
          // is granted. Periodically re-fetch the full roster to catch any missed
          // join/leave deltas (onParticipantChange only delivers changes). Gated on
          // initial success so we never spam a failing/unapproved call.
          if (!rosterPollRef.current) {
            rosterPollRef.current = setInterval(async () => {
              let poll = null;
              try {
                poll = detectedContextType === 'webinar'
                  ? await zoomSdk.getWebinarParticipants()
                  : await zoomSdk.getMeetingParticipants();
              } catch {
                try { poll = await zoomSdk.listParticipants(); } catch { poll = null; }
              }
              // Keep the last-known roster on a transient poll failure.
              if (!poll || !poll.participants) return;
              const formatted = poll.participants.map(p => formatParticipant(p, myUserIdRef.current));
              setParticipants(detectedContextType === 'webinar'
                ? formatted.filter(p => p.isPanelist)
                : formatted);
            }, 5000);
          }
        } else {
          setDebugInfo('Waiting for participants to join (event-based mode)');
          setParticipants([]); // Start with empty, will populate via events
        }

      } catch (e) {
        console.warn('Initial participant fetch failed', e);
        setDebugInfo('Event mode active - participants will appear as they join/leave');
      }

      // Store the SDK instance for video overlay
      setZoomSdkInstance(zoomSdk);

    } catch (error) {
      setSdkError(error.message || 'Unknown error');
      setDebugInfo('SDK Error: ' + (error.message || 'Unknown error'));

      // Load mock data for testing
      setMyUserId('1');
      myUserIdRef.current = '1';
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
    // Runs once on mount — myUserId is read via myUserIdRef to avoid re-initializing
    // the SDK (which would re-register every event listener) when the user id resolves.
  }, []);

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
        } catch {
          // Failed to insert CSS rule
        }
      });
    };

    injectCriticalStyles();

    // Wait a bit for SDK to be ready in Zoom client
    const timer = setTimeout(() => {
      initializeZoomApp();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (rosterPollRef.current) {
        clearInterval(rosterPollRef.current);
        rosterPollRef.current = null;
      }
    };
  }, [initializeZoomApp]);

  const clearHandRaises = useCallback(() => {
    setHandRaises([]);
    handRaisesRef.current = [];
  }, []);

  return {
    participants,
    setParticipants,
    isZoomConnected,
    myUserId,
    zoomSdkInstance,
    sdkError,
    debugInfo,
    contextType,
    runningContext,
    handRaises,
    clearHandRaises
  };
}

export default useZoomSdk;

import { useEffect, useRef, useState } from 'react';
import { OverlayRenderer } from '../utils/overlayRenderer';

/**
 * Hook to overlay timer on video using Zoom Apps SDK Layers API
 * Uses drawImage/clearImage instead of setVirtualForeground
 * Now with enhanced full-screen design including ring progress, queue, and stats
 */
export function useVideoOverlay(zoomSdk, currentSpeaker, timeRemaining, timeLimit, myUserId, queue = [], setDebugMessage, stats = {}, isPaused = false, overlayMode = 'full') {
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const successfulMethodRef = useRef(null);
  const timeRemainingRef = useRef(timeRemaining);
  const isPausedRef = useRef(isPaused);
  const [renderingContextActive, setRenderingContextActive] = useState(false);
  const overlayRendererRef = useRef(null);
  const graceAnimationRef = useRef(false);
  const forceUpdateRef = useRef(false);

  // Update the ref when timeRemaining changes, but don't trigger effect
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Update pause ref and force an update when pause state changes
  useEffect(() => {
    if (isPausedRef.current !== isPaused) {
      isPausedRef.current = isPaused;
      forceUpdateRef.current = true;
    }
  }, [isPaused]);

  // Force update when overlay mode changes
  useEffect(() => {
    forceUpdateRef.current = true;
  }, [overlayMode]);

  useEffect(() => {
    if (!zoomSdk) {
      // When SDK becomes null (toggle OFF), try to clear any existing overlay
      if (setDebugMessage) setDebugMessage('Overlay disabled - clearing...');

      // Try to clear with the last known SDK instance if we had one
      if (window.lastZoomSdk) {
        // First try to close rendering context if it was active
        if (renderingContextActive) {
          window.lastZoomSdk.closeRenderingContext()
            .then(() => {
              setRenderingContextActive(false);
            })
            .catch(() => { /* ignore */ });
        }

        window.lastZoomSdk.clearImage()
          .then(() => {
            if (setDebugMessage) setDebugMessage('Overlay cleared (toggle OFF)');
          })
          .catch(() => {
            // Try drawing a transparent overlay as fallback
            const clearCanvas = document.createElement('canvas');
            clearCanvas.width = 1280;
            clearCanvas.height = 720;
            const clearCtx = clearCanvas.getContext('2d');
            clearCtx.clearRect(0, 0, clearCanvas.width, clearCanvas.height);

            const clearImageData = clearCtx.getImageData(0, 0, clearCanvas.width, clearCanvas.height);
            window.lastZoomSdk.drawImage({
              x: 0, y: 0,
              imageData: clearImageData,
              zIndex: 3
            }).then(() => {
              if (setDebugMessage) setDebugMessage('Overlay cleared (transparent)');
            }).catch(() => { /* ignore */ });
          });
      }
      return;
    }

    // Store SDK reference for cleanup
    window.lastZoomSdk = zoomSdk;

    // Initialize rendering context for camera mode
    const initRenderingContext = async () => {
      try {
        // First check if we already have an active context
        if (renderingContextActive) {
          return true;
        }

        // Start rendering context in camera mode for overlay capability
        const result = await zoomSdk.runRenderingContext({
          view: 'camera'
        });

        // Check if the result indicates success
        if (result && (result.success === true || result.status === 'success' || result === true)) {
          setRenderingContextActive(true);
          if (setDebugMessage) setDebugMessage('Rendering context active');
          return true;
        } else {
          // Assume it worked if we didn't get an error
          setRenderingContextActive(true);
          if (setDebugMessage) setDebugMessage('Rendering context started');
          return true;
        }
      } catch (error) {
        if (setDebugMessage) setDebugMessage(`Context error: ${error.message || error}`);
        return false;
      }
    };

    // Show idle state when no one is speaking
    if (!currentSpeaker) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Reset the successful method when no speaker
      successfulMethodRef.current = null;

      // Clear overlay when no speaker
      if (renderingContextActive && zoomSdk) {
        if (setDebugMessage) setDebugMessage('Clearing overlay...');

        const clearOverlay = async () => {
          try {
            await zoomSdk.clearImage();
            if (setDebugMessage) setDebugMessage('Overlay cleared');
          } catch (err) {
            // Try drawing a transparent overlay as fallback
            try {
              const clearCanvas = document.createElement('canvas');
              clearCanvas.width = 1280;
              clearCanvas.height = 720;
              const clearCtx = clearCanvas.getContext('2d');
              clearCtx.clearRect(0, 0, clearCanvas.width, clearCanvas.height);

              const clearImageData = clearCtx.getImageData(0, 0, clearCanvas.width, clearCanvas.height);
              await zoomSdk.drawImage({
                x: 0, y: 0,
                imageData: clearImageData,
                zIndex: 3
              });
              if (setDebugMessage) setDebugMessage('Overlay cleared (transparent)');
            } catch (fallbackErr) {
              if (setDebugMessage) setDebugMessage('Clear overlay failed');
            }
          }
        };

        clearOverlay();
      }

      return;
    }

    // Start rendering context if not active
    if (!renderingContextActive) {
      initRenderingContext().then(success => {
        if (!success) return;
      });
    }

    // Create canvas and renderer only once
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;

      // Initialize overlay renderer
      overlayRendererRef.current = new OverlayRenderer(canvas, {
        showRing: true,
        showDigital: true,
        showQueue: true,
        showStats: true
      });
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Function to draw the timer overlay using new renderer
    const drawTimerOverlay = () => {
      const nextSpeaker = queue && queue.length > 0 ? queue[0] : null;
      const sessionTime = stats.sessionTime || '00:00';
      const avgTime = stats.avgTime || '00:00';
      const totalSpeakers = stats.totalSpeakers || queue.length;

      overlayRendererRef.current.drawOverlay({
        currentSpeaker,
        nextSpeaker,
        timeRemaining: timeRemainingRef.current,
        timeLimit,
        queue,
        isPaused: isPausedRef.current,
        stats,
        graceAnimating: graceAnimationRef.current
      }, overlayMode);
    };

    // Function to update the overlay using drawImage
    const updateOverlay = async () => {
      try {
        // Update if time has changed OR if we need to force update
        const currentSecond = Math.floor(timeRemainingRef.current);
        if (currentSecond === lastUpdateRef.current && !forceUpdateRef.current) {
          return;
        }
        lastUpdateRef.current = currentSecond;
        forceUpdateRef.current = false;

        drawTimerOverlay();

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Method 3: Full ImageData object (most reliable)
          try {
            await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: imageData,
              zIndex: 3
            });
            if (setDebugMessage) setDebugMessage(`Timer: ${Math.floor(timeRemainingRef.current / 60)}:${(timeRemainingRef.current % 60).toString().padStart(2, '0')}`);
            return;
          } catch (error3) {
            // Try base64 fallbacks
          }

          // Method 2: Base64 with prefix
          try {
            const base64Image = canvas.toDataURL('image/png');
            await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: base64Image,
              zIndex: 3
            });
            successfulMethodRef.current = 'base64';
            if (setDebugMessage) setDebugMessage(`Timer active`);
            return;
          } catch (error2) {
            // Try without prefix
          }

          // Method 2b: Base64 without prefix
          try {
            const base64Full = canvas.toDataURL('image/png');
            const base64Data = base64Full.replace(/^data:image\/\w+;base64,/, '');
            await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: base64Data,
              zIndex: 3
            });
            successfulMethodRef.current = 'base64clean';
            if (setDebugMessage) setDebugMessage(`Timer active`);
            return;
          } catch (error2b) {
            // All methods failed
          }

          if (setDebugMessage) setDebugMessage(`Draw methods failed`);

        } catch (error) {
          if (setDebugMessage) setDebugMessage(`Draw error: ${error.message || error}`);

          // If API not supported, stop trying
          if (error.message && error.message.includes('not support')) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch (error) {
        if (setDebugMessage) setDebugMessage(`Overlay error: ${error.message || 'Unknown'}`);
      }
    };

    // Initial update
    if (setDebugMessage) setDebugMessage(`Starting overlay for ${currentSpeaker.displayName}`);

    // Wait for rendering context before starting updates
    setTimeout(() => {
      updateOverlay();

      // Update every 1000ms (once per second) to match timer changes
      intervalRef.current = setInterval(() => {
        updateOverlay();
      }, 1000);
    }, 500);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Clear overlay on cleanup
      if (zoomSdk && renderingContextActive) {
        zoomSdk.clearImage().catch(() => { /* ignore */ });
      }
    };
  }, [zoomSdk, currentSpeaker, timeLimit, myUserId, queue, setDebugMessage, overlayMode]);

  return { canvasRef, renderingContextActive };
}

export default useVideoOverlay;

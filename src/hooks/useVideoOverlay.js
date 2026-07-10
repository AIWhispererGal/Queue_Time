import { useEffect, useRef, useState } from 'react';
import { OverlayRenderer } from '../utils/overlayRenderer';

/**
 * Hook to overlay timer on video using Zoom Apps SDK Layers API
 * Uses drawImage/clearImage instead of setVirtualForeground
 * Now with enhanced full-screen design including ring progress, queue, and stats
 */
export function useVideoOverlay(zoomSdk, currentSpeaker, timeRemaining, timeLimit, myUserId, queue = [], setDebugMessage, stats = {}, isPaused = false, overlayMode = 'full', overlayFontFamily = 'sans-serif', overlayFontScale = 1) {
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

  // Force update when overlay mode or font settings change
  useEffect(() => {
    forceUpdateRef.current = true;
  }, [overlayMode, overlayFontFamily, overlayFontScale]);

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

    // Create canvas and renderer once (shared by idle + active frames)
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;

      overlayRendererRef.current = new OverlayRenderer(canvas, {
        showRing: true,
        showDigital: true,
        showQueue: true,
        showStats: true
      });
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Keep the cached renderer's font in sync with the app's font settings.
    overlayRendererRef.current.fontFamily = overlayFontFamily;
    overlayRendererRef.current.fontScale = overlayFontScale;

    // Push the current canvas to the camera via the drawImage fallback chain
    // (ImageData -> base64 -> base64 without prefix). Returns true on success.
    const pushCanvas = async () => {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          await zoomSdk.drawImage({ x: 0, y: 0, imageData, zIndex: 3 });
          return true;
        } catch { /* try base64 */ }

        try {
          const base64Image = canvas.toDataURL('image/png');
          await zoomSdk.drawImage({ x: 0, y: 0, imageData: base64Image, zIndex: 3 });
          successfulMethodRef.current = 'base64';
          return true;
        } catch { /* try without prefix */ }

        try {
          const base64Data = canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, '');
          await zoomSdk.drawImage({ x: 0, y: 0, imageData: base64Data, zIndex: 3 });
          successfulMethodRef.current = 'base64clean';
          return true;
        } catch { /* all methods failed */ }

        return false;
      } catch (error) {
        if (setDebugMessage) setDebugMessage(`Draw error: ${error.message || error}`);
        return false;
      }
    };

    // Idle state: overlay is on (mini/full) but no one is speaking. Draw a static
    // "No current speaker" frame instead of clearing to a silent no-op.
    if (!currentSpeaker) {
      // Idle frame is static — stop the per-second update loop.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      successfulMethodRef.current = null;
      lastUpdateRef.current = -1; // force a redraw once a speaker starts again

      const drawIdleFrame = async () => {
        overlayRendererRef.current.drawIdle(overlayMode);
        const ok = await pushCanvas();
        if (setDebugMessage) {
          setDebugMessage(ok ? 'Idle: No current speaker' : 'Idle frame draw failed');
        }
      };

      const showIdle = async () => {
        const wasActive = renderingContextActive;
        const started = wasActive || await initRenderingContext();
        if (!started) return;
        // Give a freshly started context a moment before the first draw.
        if (wasActive) {
          await drawIdleFrame();
        } else {
          setTimeout(drawIdleFrame, 500);
        }
      };

      showIdle();
      return;
    }

    // Start rendering context if not active
    if (!renderingContextActive) {
      initRenderingContext().then(success => {
        if (!success) return;
      });
    }

    // Function to draw the timer overlay using new renderer
    const drawTimerOverlay = () => {
      const nextSpeaker = queue && queue.length > 0 ? queue[0] : null;

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
        // Update if the second changed OR a forced update was requested
        const currentSecond = Math.floor(timeRemainingRef.current);
        if (currentSecond === lastUpdateRef.current && !forceUpdateRef.current) {
          return;
        }
        lastUpdateRef.current = currentSecond;
        forceUpdateRef.current = false;

        drawTimerOverlay();
        const ok = await pushCanvas();
        if (setDebugMessage) {
          if (ok) {
            const mm = Math.floor(timeRemainingRef.current / 60);
            const ss = (timeRemainingRef.current % 60).toString().padStart(2, '0');
            setDebugMessage(`Timer: ${mm}:${ss}`);
          } else {
            setDebugMessage('Draw methods failed');
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
  }, [zoomSdk, currentSpeaker, timeLimit, myUserId, queue, setDebugMessage, overlayMode, overlayFontFamily, overlayFontScale]);

  return { canvasRef, renderingContextActive };
}

export default useVideoOverlay;

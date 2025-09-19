import { useEffect, useRef, useState } from 'react';
import { OverlayRenderer } from '../utils/overlayRenderer';

/**
 * Hook to overlay timer on video using Zoom Apps SDK Layers API
 * Uses drawImage/clearImage instead of setVirtualForeground
 * Now with enhanced full-screen design including ring progress, queue, and stats
 */
export function useVideoOverlay(zoomSdk, currentSpeaker, timeRemaining, timeLimit, myUserId, queue = [], setDebugMessage, stats = {}, isPaused = false) {
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const successfulMethodRef = useRef(null); // Track which method works
  const timeRemainingRef = useRef(timeRemaining); // Track time without triggering re-renders
  const isPausedRef = useRef(isPaused); // Track pause state
  const [renderingContextActive, setRenderingContextActive] = useState(false);
  const overlayRendererRef = useRef(null);
  const graceAnimationRef = useRef(false);
  const forceUpdateRef = useRef(false); // Force update flag

  // Update the ref when timeRemaining changes, but don't trigger effect
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Update pause ref and force an update when pause state changes
  useEffect(() => {
    if (isPausedRef.current !== isPaused) {
      isPausedRef.current = isPaused;
      forceUpdateRef.current = true; // Force next update regardless of timer
    }
  }, [isPaused]);

  useEffect(() => {
    if (!zoomSdk) {
      // When SDK becomes null (toggle OFF), try to clear any existing overlay
      if (setDebugMessage) setDebugMessage('Overlay disabled - clearing...');

      // Try to clear with the last known SDK instance if we had one
      if (window.lastZoomSdk) {
        window.lastZoomSdk.clearImage()
          .then(() => {
            console.log('✅ Overlay cleared when toggled OFF');
            if (setDebugMessage) setDebugMessage('Overlay cleared (toggle OFF)');
          })
          .catch(err => {
            console.log('❌ clearImage failed when toggling OFF, trying transparent fallback');
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
              console.log('✅ Drew transparent overlay as fallback');
              if (setDebugMessage) setDebugMessage('Overlay cleared (transparent)');
            }).catch(e => {
              console.log('❌ Failed to clear with transparent overlay:', e);
            });
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
          console.log('Rendering context already active, skipping init');
          return true;
        }

        console.log('Attempting to start rendering context in camera mode...');

        // Start rendering context in camera mode for overlay capability
        const result = await zoomSdk.runRenderingContext({
          view: 'camera'
        });

        console.log('Rendering context response:', JSON.stringify(result));

        // Check if the result indicates success
        if (result && (result.success === true || result.status === 'success' || result === true)) {
          setRenderingContextActive(true);
          if (setDebugMessage) setDebugMessage('Rendering context active');
          console.log('✅ Rendering context successfully activated');
          return true;
        } else {
          // Sometimes the API returns without error but not a clear success
          // Let's assume it worked if we didn't get an error
          setRenderingContextActive(true);
          if (setDebugMessage) setDebugMessage('Rendering context started (assumed success)');
          console.log('⚠️ Rendering context started with ambiguous response:', result);
          return true;
        }
      } catch (error) {
        console.error('❌ Failed to start rendering context:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
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

      // Use the new overlay renderer for idle state too
      if (renderingContextActive && zoomSdk) {
        if (setDebugMessage) setDebugMessage('Drawing enhanced idle overlay...');

        // Reset the successful method when no speaker
        successfulMethodRef.current = null;

        // Clear overlay when no speaker
        const clearOverlay = async () => {
          try {
            // Try to clear the overlay
            await zoomSdk.clearImage();
            console.log('✅ Overlay cleared - no current speaker');
            if (setDebugMessage) setDebugMessage('Overlay cleared');
          } catch (err) {
            console.log('Failed to clear overlay:', err.message);
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
              console.log('✅ Drew transparent overlay as clear fallback');
              if (setDebugMessage) setDebugMessage('Overlay cleared (transparent)');
            } catch (fallbackErr) {
              console.log('Failed to clear with transparent overlay:', fallbackErr);
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
      // Use Zoom's expected resolution
      canvas.width = 1280;  // Zoom standard
      canvas.height = 720;   // Zoom standard
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
      // Get next speaker from queue (first person in queue since current speaker is not in queue)
      const nextSpeaker = queue && queue.length > 0 ? queue[0] : null;

      // Calculate stats
      const sessionTime = stats.sessionTime || '00:00';
      const avgTime = stats.avgTime || '00:00';
      const totalSpeakers = stats.totalSpeakers || queue.length;

      // Draw the enhanced overlay
      overlayRendererRef.current.drawOverlay({
        currentSpeaker,
        nextSpeaker,
        timeRemaining: timeRemainingRef.current,
        timeLimit,
        queue,
        isPaused: isPausedRef.current, // Use ref to get current pause state
        stats,
        graceAnimating: graceAnimationRef.current
      });
    };

    // Function to update the overlay using drawImage
    const updateOverlay = async () => {
      try {
        // Update if time has changed OR if we need to force update (e.g., pause state changed)
        const currentSecond = Math.floor(timeRemainingRef.current);
        if (currentSecond === lastUpdateRef.current && !forceUpdateRef.current) {
          return; // Skip this update, nothing changed
        }
        lastUpdateRef.current = currentSecond;
        forceUpdateRef.current = false; // Reset force update flag

        // Draw the overlay
        drawTimerOverlay();

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Skip straight to methods that work: Start with Method 3 (most reliable)
          // Method 3: Try with the full ImageData object (this one seems most stable)
          try {
            const result = await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: imageData, // Full ImageData object
              zIndex: 3
            });
            console.log('✅ Method 3 WORKS - Full ImageData object');
            if (setDebugMessage) setDebugMessage(`Timer: ${Math.floor(timeRemainingRef.current / 60)}:${(timeRemainingRef.current % 60).toString().padStart(2, '0')}`);
            return; // Success, exit early
          } catch (error3) {
            console.log('Method 3 failed, trying base64 methods:', error3.message);
          }

          // Method 2: Try with base64 encoded image (with prefix)
          try {
            if (setDebugMessage) setDebugMessage(`Trying Method 2: Base64 with prefix...`);
            const base64Image = canvas.toDataURL('image/png');
            const result = await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: base64Image,
              zIndex: 3
            });
            console.log('✅ Method 2 WORKS - Base64 with prefix');
            successfulMethodRef.current = 'base64';
            if (setDebugMessage) setDebugMessage(`✅ Method 2 (Base64 w/ prefix) WORKS!`);
            return; // Success, exit early
          } catch (error2) {
            console.log('Method 2 failed (base64 with prefix):', error2.message);
            if (setDebugMessage) setDebugMessage(`❌ Method 2 failed: ${error2.message || 'Unknown error'}`);
          }

          // Method 2b: Try with base64 without the data URL prefix
          try {
            if (setDebugMessage) setDebugMessage(`Trying Method 2b: Base64 NO prefix...`);
            const base64Full = canvas.toDataURL('image/png');
            const base64Data = base64Full.replace(/^data:image\/\w+;base64,/, '');
            const result = await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: base64Data,
              zIndex: 3
            });
            console.log('✅ Method 2b WORKS - Base64 without prefix');
            successfulMethodRef.current = 'base64clean';
            if (setDebugMessage) setDebugMessage(`✅ Method 2b (Base64 no prefix) WORKS!`);
            return; // Success, exit early
          } catch (error2b) {
            console.log('Method 2b failed (base64 without prefix):', error2b.message);
            if (setDebugMessage) setDebugMessage(`❌ Method 2b failed: ${error2b.message || 'Unknown error'}`);
          }

          // Removed Methods 1, 1b, and 4 since they never work
          // If all working methods failed, report the error
          if (setDebugMessage) setDebugMessage(`All methods failed - check console`);

        } catch (error) {
          console.error('drawImage failed completely:', error);
          if (setDebugMessage) setDebugMessage(`Draw error: ${error.message || error}`);

          // If API not supported, stop trying
          if (error.message && error.message.includes('not support')) {
            console.log('drawImage not supported, stopping updates');
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Failed to update overlay:', error);
        if (setDebugMessage) setDebugMessage(`Overlay error: ${error.message || 'Unknown'}`);
      }
    };

    // Initial update
    if (setDebugMessage) setDebugMessage(`Starting overlay for ${currentSpeaker.displayName}`);

    // Wait for rendering context before starting updates
    setTimeout(() => {
      updateOverlay();

      // Update every 1000ms (once per second) to match timer changes
      // This prevents the jumping issue and reduces overhead
      intervalRef.current = setInterval(() => {
        updateOverlay();
      }, 1000);
    }, 500); // Give rendering context time to initialize

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Clear overlay on cleanup - just log errors, don't show to user
      if (zoomSdk && renderingContextActive) {
        zoomSdk.clearImage()
          .then(() => console.log('Overlay cleared on cleanup'))
          .catch(err => {
            // Silently fail - this is expected if clearImage isn't supported
            console.log('Note: clearImage not available on cleanup (this is OK):', err.message);
          });
      }
    };
  }, [zoomSdk, currentSpeaker, timeLimit, myUserId, queue, setDebugMessage]); // Removed timeRemaining and renderingContextActive to prevent re-initialization

  return { canvasRef, renderingContextActive };
}

export default useVideoOverlay;
import { useEffect, useRef, useState } from 'react';

/**
 * Hook to overlay timer on video using Zoom Apps SDK Layers API
 * Uses drawImage/clearImage instead of setVirtualForeground
 */
export function useVideoOverlay(zoomSdk, currentSpeaker, timeRemaining, timeLimit, myUserId, queue = [], setDebugMessage) {
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const successfulMethodRef = useRef(null); // Track which method works
  const timeRemainingRef = useRef(timeRemaining); // Track time without triggering re-renders
  const [renderingContextActive, setRenderingContextActive] = useState(false);

  // Update the ref when timeRemaining changes, but don't trigger effect
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

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

    // Show "Queue Ready" message when no one is speaking
    if (!currentSpeaker) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Draw a "Queue Ready" or "Next Speaker?" overlay instead of clearing
      if (renderingContextActive && zoomSdk) {
        if (setDebugMessage) setDebugMessage('Drawing idle overlay...');

        // Reset the successful method when no speaker
        successfulMethodRef.current = null;

        // Draw an idle state overlay with logo
        const drawIdleOverlay = async () => {
          try {
            const idleCanvas = document.createElement('canvas');
            idleCanvas.width = 1280;
            idleCanvas.height = 720;
            const ctx = idleCanvas.getContext('2d');

            // Clear canvas first
            ctx.clearRect(0, 0, idleCanvas.width, idleCanvas.height);

            // Load and draw the logo
            const logoImg = new Image();
            logoImg.src = '/logo.jpg'; // Public folder assets are served from root

            await new Promise((resolve, reject) => {
              logoImg.onload = resolve;
              logoImg.onerror = reject;
              // Set timeout in case image doesn't load
              setTimeout(reject, 1000);
            }).catch(() => {
              console.log('Logo failed to load, using text fallback');
            });

            const padding = 20;

            if (logoImg.complete && logoImg.naturalHeight !== 0) {
              // Logo loaded successfully - draw it
              const logoSize = 80; // Square logo
              const x = idleCanvas.width - logoSize - padding;
              const y = padding;

              // Draw semi-transparent background box for logo
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              const boxPadding = 10;
              ctx.fillRect(x - boxPadding, y - boxPadding, logoSize + boxPadding * 2, logoSize + boxPadding * 2);

              // Draw the logo
              ctx.drawImage(logoImg, x, y, logoSize, logoSize);

              // If there's a queue, show count below logo
              if (queue && queue.length > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(x - boxPadding, y + logoSize + 5, logoSize + boxPadding * 2, 25);

                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${queue.length} waiting`, x + logoSize/2, y + logoSize + 22);
              }
            } else {
              // Fallback to text if logo doesn't load
              const boxWidth = 200;
              const boxHeight = 60;
              const x = idleCanvas.width - boxWidth - padding;
              const y = padding;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.fillRect(x, y, boxWidth, boxHeight);

              ctx.fillStyle = '#4CAF50';
              ctx.font = 'bold 24px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Queue Ready', x + boxWidth/2, y + 38);

              if (queue && queue.length > 0) {
                ctx.fillStyle = '#FFD700';
                ctx.font = '14px Arial';
                ctx.fillText(`${queue.length} waiting`, x + boxWidth/2, y + boxHeight - 8);
              }
            }

            // Try to draw using the most reliable method (Method 3 - ImageData)
            const imageData = ctx.getImageData(0, 0, idleCanvas.width, idleCanvas.height);

            await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: imageData,
              zIndex: 3
            });

            console.log('✅ Drew "Queue Ready" idle overlay');
            if (setDebugMessage) setDebugMessage('Queue Ready overlay shown');

          } catch (err) {
            console.log('Failed to draw idle overlay:', err.message);
            // Try base64 as fallback
            try {
              const idleCanvas = document.createElement('canvas');
              idleCanvas.width = 1280;
              idleCanvas.height = 720;
              const ctx = idleCanvas.getContext('2d');

              // Same design but with base64
              ctx.clearRect(0, 0, idleCanvas.width, idleCanvas.height);
              const boxWidth = 200;
              const boxHeight = 60;
              const padding = 20;
              const x = idleCanvas.width - boxWidth - padding;
              const y = padding;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.fillRect(x, y, boxWidth, boxHeight);

              ctx.fillStyle = '#4CAF50';
              ctx.font = 'bold 24px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Queue Ready', x + boxWidth/2, y + 38);

              const base64Idle = idleCanvas.toDataURL('image/png');
              await zoomSdk.drawImage({
                x: 0,
                y: 0,
                imageData: base64Idle,
                zIndex: 3
              });

              console.log('✅ Drew idle overlay with base64');
              if (setDebugMessage) setDebugMessage('Queue Ready (base64)');
            } catch (fallbackErr) {
              console.log('Failed to draw idle overlay with any method:', fallbackErr);
              if (setDebugMessage) setDebugMessage('Idle overlay failed');
            }
          }
        };

        drawIdleOverlay();
      }

      return;
    }

    // Start rendering context if not active
    if (!renderingContextActive) {
      initRenderingContext().then(success => {
        if (!success) return;
      });
    }

    // Create canvas for drawing overlay
    const canvas = document.createElement('canvas');
    // Use standard HD resolution for better quality
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    canvasRef.current = canvas;

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // Function to draw the timer overlay
    const drawTimerOverlay = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas with transparency
      ctx.clearRect(0, 0, width, height);

      // Timer position and size
      const timerWidth = Math.min(350, width * 0.27);
      const timerHeight = 90;
      const padding = 20;
      const x = width - timerWidth - padding;
      const y = padding;

      // Semi-transparent background for timer
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      drawRoundedRect(x, y, timerWidth, timerHeight, 10);
      ctx.fill();

      // Timer text
      const mins = Math.floor(timeRemainingRef.current / 60);
      const secs = timeRemainingRef.current % 60;
      const timeText = `${mins}:${secs.toString().padStart(2, '0')}`;

      // Color based on time remaining
      const percentage = (timeRemainingRef.current / timeLimit) * 100;
      let color = '#4CAF50'; // Green
      if (percentage <= 20) color = '#F44336'; // Red
      else if (percentage <= 50) color = '#FFC107'; // Yellow

      // Draw time
      ctx.fillStyle = color;
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(timeText, x + 20, y + 55);

      // Draw who's speaking
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.fillText(`Speaking: ${currentSpeaker.displayName}`, x + 20, y + 25);

      // Progress bar
      const progressY = y + timerHeight - 12;
      const progressWidth = timerWidth - 40;
      const progressX = x + 20;

      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(progressX, progressY, progressWidth, 4);

      // Progress
      ctx.fillStyle = color;
      const currentProgress = (timeRemainingRef.current / timeLimit) * progressWidth;
      ctx.fillRect(progressX, progressY, currentProgress, 4);

      // Draw Queue below timer if exists
      if (queue && queue.length > 0) {
        const queueY = y + timerHeight + 10;
        const queueHeight = Math.min(queue.length * 30 + 35, 180);

        // Queue background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        drawRoundedRect(x, queueY, timerWidth, queueHeight, 10);
        ctx.fill();

        // Queue header
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('NEXT UP:', x + 20, queueY + 25);

        // Queue items (show up to 5)
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        const maxQueueDisplay = Math.min(queue.length, 5);

        for (let i = 0; i < maxQueueDisplay; i++) {
          const itemY = queueY + 45 + (i * 25);
          const displayText = `${i + 1}. ${queue[i].displayName}`;
          ctx.fillText(displayText, x + 20, itemY);
        }

        // If more than 5 in queue, show count
        if (queue.length > 5) {
          const moreY = queueY + 45 + (maxQueueDisplay * 25);
          ctx.fillStyle = '#cccccc';
          ctx.font = 'italic 13px Arial';
          ctx.fillText(`... +${queue.length - 5} more`, x + 20, moreY);
        }
      }
    };

    // Function to update the overlay using drawImage
    const updateOverlay = async () => {
      try {
        // Only update if time has actually changed (once per second)
        const currentSecond = Math.floor(timeRemainingRef.current);
        if (currentSecond === lastUpdateRef.current) {
          return; // Skip this update, timer hasn't changed
        }
        lastUpdateRef.current = currentSecond;

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
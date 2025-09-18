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
      if (setDebugMessage) setDebugMessage('No SDK instance');
      return;
    }

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

    // Clear overlay when no one is speaking
    if (!currentSpeaker) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Clear the overlay - just try clearImage, ignore if it fails
      if (renderingContextActive && zoomSdk) {
        if (setDebugMessage) setDebugMessage('No active speaker');

        // Reset the successful method when no speaker
        successfulMethodRef.current = null;

        // Try to clear, but don't worry if it fails
        zoomSdk.clearImage()
          .then(() => {
            console.log('Overlay cleared');
          })
          .catch(err => {
            // Silently ignore - clearImage may not be available
            console.log('Note: clearImage not available (this is OK)');
          });
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

          // If we already know which method works, use it directly
          if (successfulMethodRef.current) {
            try {
              let result;
              switch(successfulMethodRef.current) {
                case 'uint8array':
                  result = await zoomSdk.drawImage({
                    x: 0, y: 0,
                    imageData: imageData.data,
                    width: canvas.width,
                    height: canvas.height,
                    zIndex: 3
                  });
                  break;
                case 'structured':
                  result = await zoomSdk.drawImage({
                    x: 0, y: 0,
                    imageData: { data: imageData.data, width: canvas.width, height: canvas.height },
                    zIndex: 3
                  });
                  break;
                case 'base64':
                  const base64 = canvas.toDataURL('image/png');
                  result = await zoomSdk.drawImage({
                    x: 0, y: 0,
                    imageData: base64,
                    zIndex: 3
                  });
                  break;
                case 'base64clean':
                  const base64Full = canvas.toDataURL('image/png');
                  const base64Clean = base64Full.replace(/^data:image\/\w+;base64,/, '');
                  result = await zoomSdk.drawImage({
                    x: 0, y: 0,
                    imageData: base64Clean,
                    zIndex: 3
                  });
                  break;
                case 'imagedata':
                  result = await zoomSdk.drawImage({
                    x: 0, y: 0,
                    imageData: imageData,
                    zIndex: 3
                  });
                  break;
              }
              if (setDebugMessage) setDebugMessage(`Timer: ${Math.floor(timeRemainingRef.current / 60)}:${(timeRemainingRef.current % 60).toString().padStart(2, '0')} (${successfulMethodRef.current})`);
              return; // Success, exit early
            } catch (e) {
              // Method stopped working, clear it
              successfulMethodRef.current = null;
              console.log('Previously successful method failed:', e);
            }
          }

          // Try all methods to find one that works
          try {
            // First attempt: Pass just the Uint8ClampedArray data with width and height
            if (setDebugMessage) setDebugMessage(`Trying Method 1: Uint8ClampedArray...`);
            const result = await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: imageData.data, // Just the Uint8ClampedArray, not the whole ImageData object
              width: canvas.width,
              height: canvas.height,
              zIndex: 3
            });
            console.log('Overlay drawn successfully with Uint8ClampedArray:', result);
            successfulMethodRef.current = 'uint8array';
            if (setDebugMessage) setDebugMessage(`✅ SUCCESS (data array): ${currentSpeaker.displayName} - ${currentSecond}s`);
            return; // Success, exit early
          } catch (error1) {
            console.log('Method 1 failed (Uint8ClampedArray):', error1.message);
            if (setDebugMessage) setDebugMessage(`❌ Method 1 failed: ${error1.message || 'Unknown error'}`);
          }

          // Method 1b: Try with structured imageData object
          try {
            if (setDebugMessage) setDebugMessage(`Trying Method 1b: Structured object...`);
            const structuredImageData = {
              data: imageData.data,
              width: canvas.width,
              height: canvas.height
            };
            const result = await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: structuredImageData,
              zIndex: 3
            });
            console.log('Overlay drawn successfully with structured ImageData:', result);
            successfulMethodRef.current = 'structured';
            if (setDebugMessage) setDebugMessage(`✅ SUCCESS (structured): ${currentSpeaker.displayName} - ${currentSecond}s`);
            return; // Success, exit early
          } catch (error1b) {
            console.log('Method 1b failed (structured ImageData):', error1b.message);
            if (setDebugMessage) setDebugMessage(`❌ Method 1b failed: ${error1b.message || 'Unknown error'}`);
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
            console.log('Overlay drawn successfully with base64:', result);
            successfulMethodRef.current = 'base64';
            if (setDebugMessage) setDebugMessage(`✅ SUCCESS (base64): ${currentSpeaker.displayName} - ${currentSecond}s`);
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
            console.log('Overlay drawn successfully with base64 (no prefix):', result);
            successfulMethodRef.current = 'base64clean';
            if (setDebugMessage) setDebugMessage(`✅ SUCCESS (base64 clean): ${currentSpeaker.displayName} - ${currentSecond}s`);
            return; // Success, exit early
          } catch (error2b) {
            console.log('Method 2b failed (base64 without prefix):', error2b.message);
            if (setDebugMessage) setDebugMessage(`❌ Method 2b failed: ${error2b.message || 'Unknown error'}`);
          }

          // Method 3: Try with the full ImageData object (original method)
          try {
            if (setDebugMessage) setDebugMessage(`Trying Method 3: Full ImageData object...`);
            const result = await zoomSdk.drawImage({
              x: 0,
              y: 0,
              imageData: imageData, // Full ImageData object
              zIndex: 3
            });
            console.log('Overlay drawn successfully with ImageData object:', result);
            successfulMethodRef.current = 'imagedata';
            if (setDebugMessage) setDebugMessage(`✅ SUCCESS (ImageData): ${currentSpeaker.displayName} - ${currentSecond}s`);
            return; // Success, exit early
          } catch (error3) {
            console.log('Method 3 failed (ImageData object):', error3.message);
            if (setDebugMessage) setDebugMessage(`❌ Method 3 failed: ${error3.message || 'Unknown error'}`);
          }

          // Method 4: Try creating a blob and converting to base64
          await new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
              if (!blob) {
                console.log('Failed to create blob from canvas');
                resolve();
                return;
              }

              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  if (setDebugMessage) setDebugMessage(`Trying Method 4: Blob base64...`);
                  const result = await zoomSdk.drawImage({
                    x: 0,
                    y: 0,
                    imageData: reader.result, // base64 from blob
                    zIndex: 3
                  });
                  console.log('Overlay drawn successfully with blob base64:', result);
                  if (setDebugMessage) setDebugMessage(`✅ SUCCESS (blob): ${currentSpeaker.displayName} - ${currentSecond}s`);
                } catch (error4) {
                  console.log('Method 4 failed (blob base64):', error4.message);
                  if (setDebugMessage) setDebugMessage(`❌ Method 4 failed: ${error4.message || 'Unknown error'}`);
                }
                resolve();
              };
              reader.readAsDataURL(blob);
            }, 'image/png');
          });

          // If all methods failed, report the error
          if (setDebugMessage) setDebugMessage(`All draw methods failed - check console`);

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
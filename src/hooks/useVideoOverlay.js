import { useEffect, useRef } from 'react';

/**
 * Hook to overlay timer on the TIMEKEEPER'S outgoing video feed
 * As the queue manager, YOUR video always shows the current speaker's timer
 * This way everyone in the meeting can see the countdown on your video
 */
export function useVideoOverlay(zoomStream, currentSpeaker, timeRemaining, timeLimit, myUserId, queue = []) {
  const canvasRef = useRef(null);
  const videoProcessorRef = useRef(null);

  useEffect(() => {
    if (!zoomStream) return;

    // As the timekeeper, ALWAYS show the overlay when someone is speaking
    // Remove it only when no one is speaking
    if (!currentSpeaker) {
      // Remove overlay when no one is speaking
      if (videoProcessorRef.current) {
        zoomStream.stopVideoProcessor();
        videoProcessorRef.current = null;
      }
      return;
    }

    // Create custom video processor for Zoom Video SDK
    class TimerOverlayProcessor {
      constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
      }

      // Called for each video frame
      async process(imageData, stream) {
        const { width, height } = imageData;
        this.canvas.width = width;
        this.canvas.height = height;

        // Draw original video frame
        this.ctx.putImageData(imageData, 0, 0);

        // Draw timer overlay
        this.drawTimerOverlay(width, height);

        // Return modified frame
        return this.ctx.getImageData(0, 0, width, height);
      }

      drawTimerOverlay(width, height) {
        const ctx = this.ctx;

        // Timer position and size
        const timerWidth = Math.min(250, width * 0.35);
        const timerHeight = 70;
        const padding = 10;
        const x = width - timerWidth - padding;
        const y = padding;

        // Semi-transparent background for timer
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(x, y, timerWidth, timerHeight);

        // Timer text
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        const timeText = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Color based on time remaining
        const percentage = (timeRemaining / timeLimit) * 100;
        let color = '#4CAF50'; // Green
        if (percentage <= 20) color = '#F44336'; // Red
        else if (percentage <= 50) color = '#FFC107'; // Yellow

        // Draw time
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.min(32, width * 0.05)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(timeText, x + 10, y + 40);

        // Draw who's speaking
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.min(14, width * 0.022)}px Arial`;
        ctx.fillText(`Speaking: ${currentSpeaker.displayName}`, x + 10, y + 20);

        // Progress bar
        const progressY = y + timerHeight - 8;
        const progressWidth = timerWidth - 20;
        const progressX = x + 10;

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(progressX, progressY, progressWidth, 3);

        // Progress
        ctx.fillStyle = color;
        const currentProgress = (timeRemaining / timeLimit) * progressWidth;
        ctx.fillRect(progressX, progressY, currentProgress, 3);

        // Draw Queue below timer
        if (queue && queue.length > 0) {
          const queueY = y + timerHeight + 5;
          const queueHeight = Math.min(queue.length * 25 + 25, 150);

          // Queue background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(x, queueY, timerWidth, queueHeight);

          // Queue header
          ctx.fillStyle = '#FFD700';
          ctx.font = `bold ${Math.min(12, width * 0.02)}px Arial`;
          ctx.fillText('NEXT UP:', x + 10, queueY + 18);

          // Queue items (show up to 5)
          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.min(11, width * 0.018)}px Arial`;
          const maxQueueDisplay = Math.min(queue.length, 5);

          for (let i = 0; i < maxQueueDisplay; i++) {
            const itemY = queueY + 35 + (i * 20);
            const displayText = `${i + 1}. ${queue[i].displayName}`;
            ctx.fillText(displayText, x + 10, itemY);
          }

          // If more than 5 in queue, show count
          if (queue.length > 5) {
            const moreY = queueY + 35 + (maxQueueDisplay * 20);
            ctx.fillStyle = '#cccccc';
            ctx.font = `italic ${Math.min(10, width * 0.016)}px Arial`;
            ctx.fillText(`... +${queue.length - 5} more`, x + 10, moreY);
          }
        }
      }

      destroy() {
        // Cleanup
        this.canvas = null;
        this.ctx = null;
      }
    }

    // Apply video processor to your outgoing stream
    const applyOverlay = async () => {
      try {
        // Stop any existing processor
        if (videoProcessorRef.current) {
          await zoomStream.stopVideoProcessor();
        }

        // Create and start new processor
        const processor = new TimerOverlayProcessor();
        videoProcessorRef.current = processor;

        // Register with Zoom Video SDK
        await zoomStream.startVideoProcessor(processor);

        console.log('Timer overlay applied to your video');
      } catch (error) {
        console.error('Failed to apply video overlay:', error);
      }
    };

    applyOverlay();

    // Cleanup
    return () => {
      if (videoProcessorRef.current) {
        zoomStream.stopVideoProcessor();
        videoProcessorRef.current.destroy();
        videoProcessorRef.current = null;
      }
    };
  }, [zoomStream, currentSpeaker, timeRemaining, timeLimit, myUserId, queue]);

  return { canvasRef };
}

export default useVideoOverlay;
import React, { useEffect, useRef } from 'react';
import './VideoOverlay.css';

function VideoOverlay({
  currentSpeaker,
  timeRemaining,
  timeLimit,
  speakerStats,
  isMyTurn,
  stream // Zoom Video SDK stream
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = (timeRemaining / timeLimit) * 100;
    if (percentage > 50) return '#4CAF50';
    if (percentage > 20) return '#FFC107';
    return '#F44336';
  };

  // Draw timer overlay on canvas
  const drawOverlay = (ctx, width, height) => {
    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    // Draw video frame
    if (videoRef.current && videoRef.current.readyState === 4) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    }

    // Only draw timer if it's my turn to speak
    if (isMyTurn && currentSpeaker) {
      // Semi-transparent background for timer
      const timerBg = 'rgba(0, 0, 0, 0.7)';
      const padding = 10;
      const timerHeight = 80;
      const timerWidth = 200;
      const x = width - timerWidth - padding;
      const y = padding;

      // Draw timer background
      ctx.fillStyle = timerBg;
      ctx.roundRect(x, y, timerWidth, timerHeight, 8);
      ctx.fill();

      // Draw speaker name
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText(currentSpeaker.displayName, x + 10, y + 20);

      // Draw timer
      ctx.fillStyle = getTimerColor();
      ctx.font = 'bold 28px Arial';
      ctx.fillText(formatTime(timeRemaining), x + 10, y + 50);

      // Draw stats
      if (speakerStats) {
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px Arial';
        ctx.fillText(
          `Turn ${speakerStats.instances + 1} • Total: ${formatTime(speakerStats.totalTime)}`,
          x + 10,
          y + 68
        );
      }

      // Draw progress bar
      const progressY = y + timerHeight - 5;
      const progressWidth = timerWidth - 20;
      const progressX = x + 10;

      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(progressX, progressY, progressWidth, 3);

      // Progress
      ctx.fillStyle = getTimerColor();
      const currentProgress = (timeRemaining / timeLimit) * progressWidth;
      ctx.fillRect(progressX, progressY, currentProgress, 3);
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    drawOverlay(ctx, canvas.width, canvas.height);
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    // Start animation
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentSpeaker, timeRemaining, isMyTurn]);

  // Initialize video stream from Zoom
  useEffect(() => {
    const initializeVideo = async () => {
      if (!stream || !canvasRef.current) return;

      try {
        // For Zoom Video SDK - render your own video with overlay
        // This would replace your normal video with the canvas that has the overlay
        await stream.startVideo({
          videoElement: canvasRef.current,
          // Use canvas as output instead of direct video
          virtualBackground: false
        });
      } catch (error) {
        console.error('Error initializing video overlay:', error);
      }
    };

    initializeVideo();
  }, [stream]);

  return (
    <div className="video-overlay-container">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="video-canvas"
      />
    </div>
  );
}

// Polyfill for roundRect if needed
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

export default VideoOverlay;
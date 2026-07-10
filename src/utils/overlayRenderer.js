/**
 * Enhanced overlay renderer for full-screen timer display
 * Creates beautiful, professional overlays with ring progress, queue visualization, and stats
 */

export class OverlayRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Design options
    this.options = {
      showRing: true,
      showDigital: true,
      showQueue: true,
      showStats: true,
      ...options
    };

    // Base font sizes — multiplied by fontScale (via the setter below) into this.fonts
    this._baseFonts = {
      labels: 16,    // Labels & Stats
      names: 22,     // Queue Names
      headers: 26    // Headers & Current Speaker
    };

    // Configurable font family + size scale for overlay text (from the app's font
    // settings). Mutable so the cached renderer can update without recreation.
    this.fontFamily = options.fontFamily || 'sans-serif';
    this.fontScale = options.fontScale || 1; // setter also populates this.fonts

    // Load background image
    this.backgroundImage = null;
    this.loadBackgroundImage();

    // Colors
    this.colors = {
      green: '#4ade80',
      greenGradient: ['#34d399', '#4ade80', '#10b981'],
      amber: '#fbbf24',
      amberGradient: ['#fbbf24', '#f59e0b'],
      red: '#ef4444',
      redGradient: ['#ef4444', '#dc2626'],
      blue: '#60a5fa',
      white: '#ffffff',
      black: '#000000',
      overlay: 'rgba(0,0,0,0.5)'
    };
  }

  /** Scale factor for all overlay text; recomputes this.fonts when set. */
  set fontScale(scale) {
    this._fontScale = scale || 1;
    this.fonts = {
      labels: this._baseFonts.labels * this._fontScale,
      names: this._baseFonts.names * this._fontScale,
      headers: this._baseFonts.headers * this._fontScale
    };
  }

  get fontScale() {
    return this._fontScale;
  }

  /**
   * Draw the app URL as small informational text in the bottom-left corner.
   */
  drawAppLink() {
    this.ctx.save();
    this.ctx.font = `${Math.round(14 * this.fontScale)}px ${this.fontFamily}`;
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('queuetime.app', 24, this.height - 20);
    this.ctx.restore();
  }

  /**
   * Load background image
   */
  loadBackgroundImage() {
    const img = new Image();
    img.src = '/background.jpg';
    img.onload = () => {
      this.backgroundImage = img;
    };
    img.onerror = () => {
      // Using gradient fallback
    };
  }

  /**
   * Get initials from name or object
   */
  getInitials(person) {
    let name = person;
    // Handle both string and object formats
    if (typeof person === 'object' && person !== null) {
      name = person.displayName || person.name || '??';
    }
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Get display name from person (string or object)
   */
  getDisplayName(person, maxLength = 20) {
    let name;
    if (typeof person === 'string') {
      name = person;
    } else if (typeof person === 'object' && person !== null) {
      name = person.displayName || person.name || 'Unknown';
    } else {
      name = 'Unknown';
    }

    // Truncate if too long
    if (name.length > maxLength) {
      return name.substring(0, maxLength - 1) + '…';
    }
    return name;
  }

  /**
   * Draw the full overlay
   */
  drawOverlay(state, mode = 'full') {
    const {
      currentSpeaker,
      nextSpeaker,
      timeRemaining,
      timeLimit,
      queue = [],
      isPaused = false,
      stats = {},
      graceAnimating = false
    } = state;

    // Clear canvas completely
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Reset any transforms or styles
    this.ctx.globalAlpha = 1;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw semi-transparent background
    this.drawBackground();

    // Check if we're in mini mode
    const isMini = mode === 'mini';

    // Draw main timer display with ring
    if (this.options.showRing || this.options.showDigital) {
      this.drawTimerDisplay(timeRemaining, timeLimit, isMini);
    }

    // Only draw these in full mode
    if (!isMini) {
      // Draw current speaker badge
      if (currentSpeaker) {
        this.drawCurrentSpeaker(currentSpeaker);
      }

      // Draw next speaker badge
      if (nextSpeaker) {
        this.drawNextSpeaker(nextSpeaker);
      }

      // Draw queue list
      if (this.options.showQueue && queue.length > 0) {
        this.drawQueueList(queue, currentSpeaker);
      }

      // Draw stats panel
      if (this.options.showStats && stats) {
        this.drawStatsPanel(stats);
      }

      // Draw keyboard hints (only in full mode)
      this.drawKeyboardHints();
    }

    // Draw pause overlay
    if (isPaused) {
      this.drawPausedOverlay();
    }

    // Draw grace animation
    if (graceAnimating) {
      this.drawGraceAnimation();
    }

    // App URL (informational, on top of everything)
    this.drawAppLink();
  }

  /**
   * Draw a static idle frame shown when the overlay is on but no one is speaking.
   * Uses the same gradient/background styling as the live overlay so the camera
   * shows an intentional "No current speaker" frame instead of a blank/no-op.
   */
  drawIdle(mode = 'full') {
    const isMini = mode === 'mini';
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Clear + reset (mirrors drawOverlay setup)
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.globalAlpha = 1;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // App gradient / background styling
    this.drawBackground();

    // Centered "No current speaker" headline
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = `bold ${(isMini ? 72 : 54) * this.fontScale}px ${this.fontFamily}`;
    this.ctx.fillStyle = this.colors.white;
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetY = 2;
    this.ctx.fillText('No current speaker', centerX, centerY);
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // Subtitle hint in full mode
    if (!isMini) {
      this.ctx.font = `500 ${this.fonts.headers}px ${this.fontFamily}`;
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this.ctx.fillText('Start a turn to display the timer', centerX, centerY + 60);
    }

    // App URL (informational)
    this.drawAppLink();
  }

  /**
   * Draw semi-transparent background
   */
  drawBackground() {
    // Draw background image if loaded
    if (this.backgroundImage) {
      // Draw the image to cover the canvas
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);

      // Add a semi-transparent overlay for better text visibility
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      // Fallback to gradient if image not loaded
      const gradient = this.ctx.createRadialGradient(
        this.width / 2, this.height / 2, 0,
        this.width / 2, this.height / 2, this.width / 2
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Draw timer display with optional ring
   */
  drawTimerDisplay(timeRemaining, timeLimit, isMini = false) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    // Much larger ring in mini mode (80% of screen height)
    const radius = isMini ?
      Math.min(this.width, this.height) * 0.4 :
      Math.min(this.width, this.height) * 0.25; // Smaller ring in full mode

    // Determine color based on percentage remaining
    const percentageRemaining = (timeRemaining / timeLimit) * 100;
    let color = this.colors.green;
    let gradientColors = this.colors.greenGradient;

    if (percentageRemaining <= 25) {
      // Less than 25% - RED
      color = this.colors.red;
      gradientColors = this.colors.redGradient;
    } else if (percentageRemaining <= 50) {
      // 25% to 50% - AMBER
      color = this.colors.amber;
      gradientColors = this.colors.amberGradient;
    }
    // else > 50% - GREEN (default)

    // Draw progress ring
    if (this.options.showRing) {
      this.drawProgressRing(centerX, centerY, radius, timeRemaining, timeLimit, gradientColors, isMini);
    }

    // Draw digital timer
    if (this.options.showDigital) {
      this.drawDigitalTimer(centerX, centerY, timeRemaining, color, isMini);
    }
  }

  /**
   * Draw circular progress ring
   */
  drawProgressRing(centerX, centerY, radius, timeRemaining, timeLimit, colors, isMini = false) {
    // Thicker line in mini mode
    const lineWidth = isMini ? 60 : 40;
    const startAngle = -Math.PI / 2; // Start at top
    const progress = timeRemaining / timeLimit;
    const endAngle = startAngle + (2 * Math.PI * progress);

    // Draw background ring
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();

    // Draw progress ring with gradient
    const gradient = this.ctx.createLinearGradient(
      centerX - radius, centerY - radius,
      centerX + radius, centerY + radius
    );
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Reset shadow (no glow for cleaner look)
    this.ctx.shadowBlur = 0;
  }

  /**
   * Draw digital timer display
   */
  drawDigitalTimer(centerX, centerY, timeRemaining, color, isMini = false) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Load custom font or use bold sans-serif - much larger in mini mode
    const fontSize = (isMini ? 200 : 140) * this.fontScale;
    this.ctx.font = `bold ${fontSize}px "Orbitron", ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Simple subtle shadow
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetY = 2;

    // Draw main text once
    this.ctx.fillStyle = this.colors.white;
    this.ctx.fillText(timeText, centerX, centerY);

    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;
  }

  /**
   * Draw current speaker badge at top
   */
  drawCurrentSpeaker(speaker) {
    const centerX = this.width / 2;
    const y = 60; // Higher up
    const displayName = this.getDisplayName(speaker);

    // Draw background box
    this.ctx.fillStyle = 'rgba(74,222,128,0.15)';
    this.ctx.strokeStyle = 'rgba(74,222,128,0.3)';
    this.ctx.lineWidth = 2;

    const boxWidth = 250; // Smaller
    const boxHeight = 60; // Smaller
    const borderRadius = 15;

    this.drawRoundedRect(centerX - boxWidth/2, y, boxWidth, boxHeight, borderRadius);

    // Draw label
    this.ctx.font = `${this.fonts.labels}px ${this.fontFamily}`;
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SPEAKING', centerX, y + 18);

    // Draw name
    this.ctx.font = `bold ${this.fonts.headers}px ${this.fontFamily}`;
    this.ctx.fillStyle = this.colors.white;
    this.ctx.fillText(displayName, centerX, y + 42);
  }

  /**
   * Draw next speaker badge at bottom
   */
  drawNextSpeaker(speaker) {
    const centerX = this.width / 2;
    const y = this.height - 120; // Higher from bottom
    const displayName = this.getDisplayName(speaker);

    // Draw background box
    this.ctx.fillStyle = 'rgba(96,165,250,0.15)';
    this.ctx.strokeStyle = 'rgba(96,165,250,0.3)';
    this.ctx.lineWidth = 2;

    const boxWidth = 240;
    const boxHeight = 55;
    const borderRadius = 15;

    this.drawRoundedRect(centerX - boxWidth/2, y, boxWidth, boxHeight, borderRadius);

    // Draw label
    this.ctx.font = `${this.fonts.labels}px ${this.fontFamily}`;
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('NEXT', centerX, y + 17);

    // Draw name
    this.ctx.font = `bold ${this.fonts.names}px ${this.fontFamily}`;
    this.ctx.fillStyle = this.colors.blue;
    this.ctx.fillText(displayName, centerX, y + 38);
  }

  /**
   * Draw compact queue list on left
   */
  drawQueueList(queue, currentSpeaker) {
    const x = 40; // Closer to edge
    const itemSpacing = 65; // Increased from 50px for better breathing room

    // Filter out current speaker if they're in the queue
    const currentName = this.getDisplayName(currentSpeaker);
    const filteredQueue = queue.filter(person => {
      const personName = this.getDisplayName(person);
      return personName !== currentName;
    });

    const maxVisible = Math.min(filteredQueue.length, 5); // Show 5 items max
    const startY = this.height / 2 - (maxVisible * itemSpacing / 2); // Center based on visible items

    filteredQueue.slice(0, maxVisible).forEach((person, index) => {
      const y = startY + (index * itemSpacing); // More spacing between items
      const isNext = index === 0; // First person in queue is next

      // Draw circle with initials - consistent sizing
      const circleSize = 40;
      const centerX = x + circleSize / 2;
      const centerY = y + circleSize / 2;

      // Circle background - simpler without current speaker
      if (isNext) {
        this.ctx.fillStyle = 'rgba(96,165,250,0.3)';
      } else {
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      }

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, circleSize / 2, 0, 2 * Math.PI);
      this.ctx.fill();

      // Circle border
      this.ctx.strokeStyle = isNext ? '#60a5fa' : 'rgba(255,255,255,0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw initials
      this.ctx.font = `bold ${this.fonts.names}px ${this.fontFamily}`;
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.getInitials(person), centerX, centerY);

      // Draw name with truncation
      const truncatedName = this.getDisplayName(person, 18); // Allow 18 chars in queue
      this.ctx.font = `500 ${this.fonts.names}px ${this.fontFamily}`;
      this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(truncatedName, x + circleSize + 20, centerY);
    });
  }

  /**
   * Draw stats panel on right
   */
  drawStatsPanel(stats) {
    const panelWidth = 240; // wider to fit the longer label
    const padding = 12;
    const labelLineHeight = Math.round(this.fonts.labels + 4);
    const valueHeight = Math.round(22 * this.fontScale + 4);
    const gap = 14;
    const x = this.width - panelWidth - 20;

    const panels = [];

    // Show current speaker's turn count if available
    if (stats && stats.currentSpeakerStats && stats.currentSpeakerStats.turnNumber) {
      panels.push(
        { label: "Current Speaker's Turns in Topic", value: `#${stats.currentSpeakerStats.turnNumber}` }
      );
    }

    // Always show topic time
    panels.push(
      { label: 'TOPIC TIME', value: (stats && stats.sessionTime) || '00:00' }
    );

    // Preserve/restore text alignment so downstream draws aren't affected
    const prevAlign = this.ctx.textAlign;
    const prevBaseline = this.ctx.textBaseline;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    // Pre-measure wrapped label lines to compute each box height
    const laidOut = panels.map(panel => {
      this.ctx.font = `${this.fonts.labels}px ${this.fontFamily}`;
      const lines = this.wrapText(panel.label, panelWidth - padding * 2);
      const boxHeight = padding + lines.length * labelLineHeight + 8 + valueHeight + padding;
      return { ...panel, lines, boxHeight };
    });

    const totalHeight = laidOut.reduce((h, p) => h + p.boxHeight, 0) + (laidOut.length - 1) * gap;
    let y = this.height / 2 - totalHeight / 2;

    laidOut.forEach(panel => {
      // Background box
      this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.ctx.fillRect(x, y, panelWidth, panel.boxHeight);

      // Wrapped label
      this.ctx.font = `${this.fonts.labels}px ${this.fontFamily}`;
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      panel.lines.forEach((line, i) => {
        this.ctx.fillText(line, x + padding, y + padding + i * labelLineHeight);
      });

      // Value below the label
      this.ctx.font = `bold ${Math.round(22 * this.fontScale)}px "Courier New", monospace`;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(panel.value, x + padding, y + padding + panel.lines.length * labelLineHeight + 8);

      y += panel.boxHeight + gap;
    });

    this.ctx.textAlign = prevAlign;
    this.ctx.textBaseline = prevBaseline;
  }

  /**
   * Word-wrap `text` to fit `maxWidth` using the current ctx font. Returns lines.
   */
  wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (current && this.ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  /**
   * Draw keyboard hints
   */
  drawKeyboardHints() {
    // Position at bottom right, aligned with stats panel
    const x = this.width - 200; // Same x as stats panel
    const startY = this.height - 140; // Bottom area

    // Vertical layout - one per line
    const hints = [
      { key: 'SPACE', action: 'End Turn' },
      { key: 'N', action: 'Next' },
      { key: 'P', action: 'Pause' },
      { key: 'G', action: '+15s' }
    ];

    // Draw background panel matching stats style
    this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 1;
    this.drawRoundedRect(x - 10, startY - 10, 180, 120, 8);

    // Draw title
    this.ctx.font = `${Math.round(10 * this.fontScale)}px ${this.fontFamily}`;
    this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('KEYBOARD', x, startY + 5);

    // Draw hints vertically - one per line
    hints.forEach((hint, index) => {
      const hintY = startY + 25 + (index * 20);

      // Draw key
      this.ctx.font = `bold ${this.fonts.labels}px monospace`;
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(hint.key, x, hintY);

      // Draw colon
      this.ctx.font = `${this.fonts.labels}px ${this.fontFamily}`;
      this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const keyWidth = this.ctx.measureText(hint.key).width;
      this.ctx.fillText(':', x + keyWidth + 2, hintY);

      // Draw action
      this.ctx.font = `${this.fonts.labels}px ${this.fontFamily}`;
      this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
      this.ctx.fillText(hint.action, x + keyWidth + 8, hintY);
    });
  }

  /**
   * Draw paused overlay
   */
  drawPausedOverlay() {
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Draw pause icon with better proportions
    const barWidth = 25;
    const barHeight = 80;
    const spacing = 15;

    // Add subtle shadow for depth
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 5;

    this.ctx.fillStyle = '#fbbf24';
    // Left bar
    this.ctx.fillRect(centerX - spacing - barWidth, centerY - barHeight/2, barWidth, barHeight);
    // Right bar
    this.ctx.fillRect(centerX + spacing, centerY - barHeight/2, barWidth, barHeight);

    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // PAUSED text below (smaller, cleaner)
    this.ctx.font = `bold ${Math.round(36 * this.fontScale)}px ${this.fontFamily}`;
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('PAUSED', centerX, centerY + 80);
  }

  /**
   * Draw grace animation
   */
  drawGraceAnimation() {
    this.ctx.font = `bold ${Math.round(100 * this.fontScale)}px ${this.fontFamily}`;
    this.ctx.fillStyle = '#60a5fa';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillText('+15s', this.width / 2, this.height / 2 - 50);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Helper: Draw rounded rectangle
   */
  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();

    this.ctx.fill();
    this.ctx.stroke();
  }
}
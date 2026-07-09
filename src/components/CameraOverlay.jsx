import React from 'react';
import { formatTime } from '../utils/formatTime';

/**
 * Minimal overlay rendered when this webview is loaded inside the Zoom camera
 * or immersive feed (runningContext === 'inCamera' | 'inImmersive').
 *
 * The full dashboard must never render as the camera base layer (it caused the
 * "app squished inside the camera tile" review finding). This instance shows
 * only clean, camera-appropriate visuals; the sidebar instance drives state and
 * composites the live timer via the Layers drawImage path.
 */
function CameraOverlay({ currentSpeaker = null, nextSpeaker = null, timeRemaining = 0, timeLimit = 0 }) {
  const hasSpeaker = !!currentSpeaker;

  return (
    <div style={styles.stage}>
      {hasSpeaker ? (
        <div style={styles.center}>
          <div style={styles.label}>SPEAKING</div>
          <div style={styles.name}>{currentSpeaker.displayName || 'Speaker'}</div>
          {timeLimit > 0 && (
            <div style={styles.timer}>{formatTime(Math.max(0, timeRemaining))}</div>
          )}
          {nextSpeaker && (
            <div style={styles.next}>
              Next: {nextSpeaker.displayName || 'Speaker'}
            </div>
          )}
        </div>
      ) : (
        <div style={styles.center}>
          <div style={styles.idleTitle}>No current speaker</div>
          <div style={styles.idleSub}>Start a turn to display the timer</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  stage: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    textAlign: 'center',
    overflow: 'hidden',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '2rem',
  },
  label: {
    fontSize: '1rem',
    letterSpacing: '0.15em',
    opacity: 0.75,
  },
  name: {
    fontSize: '2.5rem',
    fontWeight: 700,
  },
  timer: {
    fontSize: '4rem',
    fontWeight: 800,
    fontFamily: "'Orbitron', 'Arial Black', sans-serif",
    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  next: {
    fontSize: '1.25rem',
    opacity: 0.85,
  },
  idleTitle: {
    fontSize: '2.75rem',
    fontWeight: 700,
    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  idleSub: {
    fontSize: '1.25rem',
    opacity: 0.7,
  },
};

export default CameraOverlay;

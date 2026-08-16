import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/App';

// Mock the Zoom SDK hook so the app runs in "dev mode" with a fixed roster.
vi.mock('../../src/hooks/useZoomSdk', () => ({
  default: () => ({
    participants: [
      { userId: 'u1', displayName: 'Alice', role: 'participant' },
      { userId: 'u2', displayName: 'Bob', role: 'participant' },
    ],
    isZoomConnected: false,
    myUserId: 'host',
    zoomSdkInstance: null,
    sdkError: null,
    debugInfo: null,
    runningContext: 'inMeeting',
    handRaises: [],
    clearHandRaises: vi.fn(),
    refreshRoster: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useVideoOverlay', () => ({ default: vi.fn() }));

describe('Start Next Speaker button', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the next speaker with the full time limit even after a previous timer expired', () => {
    render(<App />);

    // Queue Alice and start her via the Start Next Speaker button.
    fireEvent.click(screen.getByText('Alice'));
    fireEvent.click(screen.getByText('Start Next Speaker'));

    // Let Alice's timer run to completion (default limit is 120s). Advance in
    // 1s steps so the Timer's ref-sync effect flushes between ticks.
    for (let i = 0; i < 121; i++) {
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
    }

    // Queue Bob and start him the same way.
    fireEvent.click(screen.getByText('Bob'));
    fireEvent.click(screen.getByText('Start Next Speaker'));

    // Bob should be the current speaker with a full timer, not instantly reset.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(
      screen.getByText((_, el) => el?.className === 'timing-badge' && /Bob/.test(el.textContent))
    ).toBeInTheDocument();
    expect(screen.getByText('01:59')).toBeInTheDocument();
  });
});

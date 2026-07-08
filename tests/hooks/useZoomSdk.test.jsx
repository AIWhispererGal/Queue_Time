import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture event handlers registered by the hook so tests can fire SDK events.
// Wrapped in vi.hoisted so the vi.mock factory (also hoisted) can reference them.
const { handlers, mockSdk } = vi.hoisted(() => {
  const handlers = {};
  const initialParticipants = [
    { participantUUID: 'me', screenName: 'Me', role: 'host' },
    { participantUUID: 'u2', screenName: 'Alice', role: 'attendee' },
    { participantUUID: 'u3', screenName: 'Bob', role: 'attendee' },
  ];
  const mockSdk = {
    config: () => Promise.resolve({}),
    getRunningContext: () => Promise.resolve({ context: 'inMeeting', userId: 'me' }),
    getMeetingContext: () => Promise.resolve({ meetingID: 'm1' }),
    getWebinarContext: () => Promise.resolve({ webinarID: 'w1' }),
    onParticipantChange: (h) => { handlers.onParticipantChange = h; return Promise.resolve(); },
    onMeeting: (h) => { handlers.onMeeting = h; return Promise.resolve(); },
    onMessage: () => Promise.resolve(),
    onFeedbackReaction: () => Promise.resolve(),
    onRemoveFeedbackReaction: () => Promise.resolve(),
    getMeetingParticipants: () => Promise.resolve({ participants: initialParticipants }),
    listParticipants: () => Promise.resolve(null),
  };
  return { handlers, mockSdk };
});

vi.mock('@zoom/appssdk', () => ({ default: mockSdk }));

import useZoomSdk from '../../src/hooks/useZoomSdk.js';

async function initHook() {
  vi.useFakeTimers();
  const view = renderHook(() => useZoomSdk());
  // Hook waits 1s before initializing, then awaits several SDK promises.
  await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
  vi.useRealTimers();
  return view;
}

describe('useZoomSdk participant tracking', () => {
  beforeEach(() => {
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it('loads the initial participant roster', async () => {
    const { result } = await initHook();
    expect(result.current.participants).toHaveLength(3);
  });

  it('marks the current user in the initial roster', async () => {
    const { result } = await initHook();
    const me = result.current.participants.find(p => p.userId === 'me');
    const other = result.current.participants.find(p => p.userId === 'u2');
    expect(me.isCurrentUser).toBe(true);
    expect(other.isCurrentUser).toBe(false);
  });

  it('keeps existing participants when a new person joins (delta merge)', async () => {
    const { result } = await initHook();
    expect(result.current.participants).toHaveLength(3);

    await act(async () => {
      handlers.onParticipantChange({
        timestamp: 1,
        participants: [
          { status: 'join', screenName: 'Carol', participantUUID: 'u4', role: 'attendee' },
        ],
      });
    });

    // Bug: list collapses to just the joiner. Correct: roster grows to 4.
    expect(result.current.participants).toHaveLength(4);
    expect(result.current.participants.map(p => p.userId)).toContain('u4');
    expect(result.current.participants.map(p => p.userId)).toContain('u2');
  });

  it('removes a participant when they leave', async () => {
    const { result } = await initHook();
    expect(result.current.participants).toHaveLength(3);

    await act(async () => {
      handlers.onParticipantChange({
        timestamp: 2,
        participants: [
          { status: 'leave', screenName: 'Bob', participantUUID: 'u3', role: 'attendee' },
        ],
      });
    });

    expect(result.current.participants).toHaveLength(2);
    expect(result.current.participants.map(p => p.userId)).not.toContain('u3');
  });
});

import '@testing-library/jest-dom';

// Mock window.AudioContext for Timer tests
globalThis.AudioContext = class {
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { value: 0 },
      onended: null,
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: { value: 0 },
    };
  }
  get destination() { return {}; }
  get currentTime() { return 0; }
  close() {}
};

// Mock Zoom SDK
globalThis.zoomSdk = {
  config: () => Promise.resolve({}),
  onParticipantChange: () => {},
  getMeetingParticipants: () => Promise.resolve({ participants: [] }),
};

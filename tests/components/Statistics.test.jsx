import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Statistics from '../../src/components/Statistics';

describe('Statistics', () => {
  const defaultProps = {
    speakerStats: {},
    participants: [],
    onReset: vi.fn(),
    currentSpeaker: null,
    timeRemaining: 120,
    timeLimit: 120,
  };

  it('renders without crashing', () => {
    const { container } = render(<Statistics {...defaultProps} />);
    expect(container.querySelector('.statistics')).toBeInTheDocument();
  });

  it('renders with speaker stats', () => {
    const props = {
      ...defaultProps,
      speakerStats: {
        'user1': { name: 'Alice', totalTime: 60, instances: 2 },
      },
    };
    const { container } = render(<Statistics {...props} />);
    expect(container.querySelector('.statistics')).toBeInTheDocument();
  });
});

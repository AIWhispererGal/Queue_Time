import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timer from '../../src/components/Timer';

describe('Timer', () => {
  const defaultProps = {
    isActive: false,
    timeLimit: 120,
    timeRemaining: 120,
    currentSpeaker: null,
    speakerStats: null,
    onComplete: vi.fn(),
    onTimeLimitChange: vi.fn(),
    onTimeRemainingChange: vi.fn(),
    isPaused: false,
  };

  it('renders time display', () => {
    render(<Timer {...defaultProps} />);
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('shows time limit input when inactive', () => {
    render(<Timer {...defaultProps} />);
    expect(screen.getByLabelText('Time Limit:')).toBeInTheDocument();
  });

  it('hides time limit input when active', () => {
    render(<Timer {...defaultProps} isActive={true} currentSpeaker={{ userId: '1', displayName: 'Test' }} />);
    expect(screen.queryByLabelText('Time Limit:')).not.toBeInTheDocument();
  });

  it('displays warning when time is low', () => {
    render(<Timer {...defaultProps} isActive={true} timeRemaining={25} currentSpeaker={{ userId: '1', displayName: 'Test' }} />);
    expect(screen.getByText('30 seconds')).toBeInTheDocument();
  });

  it('displays urgent warning when time is very low', () => {
    render(<Timer {...defaultProps} isActive={true} timeRemaining={5} currentSpeaker={{ userId: '1', displayName: 'Test' }} />);
    expect(screen.getByText('Time up!')).toBeInTheDocument();
  });
});

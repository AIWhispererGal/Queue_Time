import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ParticipantList from '../../src/components/ParticipantList';

describe('ParticipantList', () => {
  const baseProps = {
    participants: [],
    onAddToQueue: vi.fn(),
    onAddParticipant: vi.fn(),
    onRemoveParticipant: vi.fn(),
    speakerStats: {},
    currentSpeaker: null,
    queue: [],
    handRaises: [],
  };

  it('routes manual add to onAddParticipant (the persisted list), not the queue', () => {
    const onAddParticipant = vi.fn();
    const onAddToQueue = vi.fn();
    const { getByText, getByPlaceholderText } = render(
      <ParticipantList {...baseProps} onAddParticipant={onAddParticipant} onAddToQueue={onAddToQueue} />
    );

    fireEvent.click(getByText('+ Add Participant Manually'));
    fireEvent.change(getByPlaceholderText('Enter name...'), { target: { value: '  Dana  ' } });
    fireEvent.click(getByText('Add'));

    expect(onAddParticipant).toHaveBeenCalledWith('Dana');
    expect(onAddToQueue).not.toHaveBeenCalled();
  });

  it('shows a remove control only for manual participants and calls onRemoveParticipant', () => {
    const onRemoveParticipant = vi.fn();
    const participants = [
      { userId: '1', displayName: 'Alice', role: 'participant' },
      { userId: 'manual-99', displayName: 'Bob', role: 'participant', isManual: true },
    ];
    const { container } = render(
      <ParticipantList {...baseProps} participants={participants} onRemoveParticipant={onRemoveParticipant} />
    );

    const removeButtons = container.querySelectorAll('.manual-remove-button');
    expect(removeButtons).toHaveLength(1);

    fireEvent.click(removeButtons[0]);
    expect(onRemoveParticipant).toHaveBeenCalledWith('manual-99');
  });

  it('renders a Refresh button that calls onRefreshRoster', () => {
    const onRefreshRoster = vi.fn();
    const { getByText, rerender } = render(
      <ParticipantList {...baseProps} onRefreshRoster={onRefreshRoster} />
    );
    fireEvent.click(getByText(/Refresh/));
    expect(onRefreshRoster).toHaveBeenCalled();

    // Hidden when no handler is provided.
    rerender(<ParticipantList {...baseProps} onRefreshRoster={undefined} />);
    expect(() => getByText(/Refresh/)).toThrow();
  });

  it('clicking an available participant adds it to the queue', () => {
    const onAddToQueue = vi.fn();
    const participants = [{ userId: '1', displayName: 'Alice', role: 'participant' }];
    const { getByText } = render(
      <ParticipantList {...baseProps} participants={participants} onAddToQueue={onAddToQueue} />
    );

    fireEvent.click(getByText('Alice'));
    expect(onAddToQueue).toHaveBeenCalledWith(participants[0]);
  });
});

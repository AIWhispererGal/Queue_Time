import React, { useState, memo } from 'react';
import { formatTime } from '../utils/formatTime';
import CollapsibleSection from './CollapsibleSection';
import './ParticipantList.css';

const ParticipantList = memo(function ParticipantList({ participants, onAddToQueue, onAddParticipant, onRemoveParticipant, onRefreshRoster, speakerStats, currentSpeaker, queue, handRaises = [] }) {
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');

  const isInQueue = (participant) => {
    return queue.some(p => p.userId === participant.userId);
  };

  const isCurrentSpeaker = (participant) => {
    return currentSpeaker?.userId === participant.userId;
  };

  const getParticipantStatus = (participant) => {
    if (isCurrentSpeaker(participant)) return 'speaking';
    if (isInQueue(participant)) return 'queued';
    return 'available';
  };

  const handleManualAdd = () => {
    if (manualName.trim()) {
      // Add to the persisted participants list (not straight to the queue). From
      // the list the host clicks the row to queue them, like any other participant.
      onAddParticipant(manualName.trim());
      setManualName('');
      setShowManualAdd(false);
    }
  };

  return (
    <CollapsibleSection className="participant-list" title={`Participants (${participants.length})`}>
      {/* Manual Add Button/Input */}
      <div className="manual-add-container">
        {!showManualAdd ? (
          <div className="participant-actions">
            <button
              className="manual-add-button"
              onClick={() => setShowManualAdd(true)}
            >
              + Add Participant Manually
            </button>
            {onRefreshRoster && (
              <button
                className="roster-refresh-button"
                title="Re-fetch the participant list from Zoom (needs host/co-host)"
                onClick={() => onRefreshRoster()}
              >
                {'↻'} Refresh
              </button>
            )}
          </div>
        ) : (
          <div className="manual-add-form">
            <input
              type="text"
              className="manual-add-input"
              placeholder="Enter name..."
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
              autoFocus
            />
            <button
              className="manual-add-submit"
              onClick={handleManualAdd}
            >
              Add
            </button>
            <button
              className="manual-add-cancel"
              onClick={() => {setShowManualAdd(false); setManualName('');}}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="participant-items">
        {participants.map((participant) => {
          const stats = speakerStats[participant.userId];
          const status = getParticipantStatus(participant);

          return (
            <div
              key={participant.userId}
              className={`participant-item ${status}`}
              onClick={() => status === 'available' && onAddToQueue(participant)}
            >
              <div className="participant-info">
                <div className="participant-avatar">
                  {participant.avatar ? (
                    <img src={participant.avatar} alt={participant.displayName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="participant-details">
                  <div className="participant-name">
                    {participant.displayName}
                    {participant.role === 'panelist' && (
                      <span className="panelist-badge" title="Panelist">●</span>
                    )}
                    {(() => {
                      const handRaiseIndex = handRaises.findIndex(h => h.userId === participant.userId);
                      if (handRaiseIndex === -1) return null;
                      return <span className="hand-raise-badge" title="Hand raised">{'\u270B'}{handRaiseIndex + 1}</span>;
                    })()}
                  </div>
                  {stats && (
                    <div className="participant-stats">
                      <span className="stat-item">
                        Time: {formatTime(stats.totalTime)}
                      </span>
                      <span className="stat-item">
                        Turns: {stats.instances}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="participant-status">
                {status === 'speaking' && <span className="status-badge speaking">Speaking</span>}
                {status === 'queued' && <span className="status-badge queued">In Queue</span>}
                {status === 'available' && <span className="status-badge available">+</span>}
                {participant.isManual && onRemoveParticipant && (
                  <button
                    className="manual-remove-button"
                    title="Remove manually-added participant"
                    onClick={(e) => { e.stopPropagation(); onRemoveParticipant(participant.userId); }}
                  >
                    {'×'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
});

export default ParticipantList;
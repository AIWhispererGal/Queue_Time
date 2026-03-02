import React, { useState, memo } from 'react';
import { formatTime } from '../utils/formatTime';
import './ParticipantList.css';

const ParticipantList = memo(function ParticipantList({ participants, onAddToQueue, speakerStats, currentSpeaker, queue }) {
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
      const manualParticipant = {
        userId: `manual-${Date.now()}`,
        displayName: manualName.trim(),
        avatar: null,
        role: 'participant',
        isManual: true
      };
      onAddToQueue(manualParticipant);
      setManualName('');
      setShowManualAdd(false);
    }
  };

  return (
    <div className="participant-list">
      <h2>Participants ({participants.length})</h2>

      {/* Manual Add Button/Input */}
      <div className="manual-add-container">
        {!showManualAdd ? (
          <button
            className="manual-add-button"
            onClick={() => setShowManualAdd(true)}
          >
            + Add Participant Manually
          </button>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ParticipantList;
import React from 'react';
import './ParticipantList.css';

function ParticipantList({ participants, onAddToQueue, speakerStats, currentSpeaker, queue }) {
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  return (
    <div className="participant-list">
      <h2>Participants ({participants.length})</h2>
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
}

export default ParticipantList;
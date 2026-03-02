import React, { memo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './SpeakerQueue.css';

const SpeakerQueue = memo(function SpeakerQueue({ queue, onRemove, onReorder, onStartSpeaking, onClearQueue, currentSpeaker, onEndTopic, onEndTurn, onAddGracePeriod }) {
  return (
    <div className="speaker-queue">
      <div className="queue-header">
        <h2>Speaker Queue ({queue.length})</h2>
        <div className="queue-actions">
          {queue.length > 0 && !currentSpeaker && (
            <button className="start-button" onClick={onStartSpeaking}>
              Start Next Speaker
            </button>
          )}
          {currentSpeaker && (
            <>
              <button className="grace-button" onClick={() => onAddGracePeriod(30)} title="Add 30 seconds (G key for +15s)">
                +30s
              </button>
              <button className="end-turn-button" onClick={onEndTurn} title="End current speaker's turn">
                End Turn
              </button>
            </>
          )}
          <button className="end-topic-button" onClick={onEndTopic} title="End topic and prepare for new topic">
            End Topic
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty-queue">
          <p>No speakers in queue</p>
          <p className="queue-hint">Click on participants to add them to the queue</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onReorder}>
          <Droppable droppableId="queue">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`queue-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
              >
                {queue.map((participant, index) => (
                  <Draggable
                    key={participant.userId}
                    draggableId={participant.userId}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`queue-item ${snapshot.isDragging ? 'dragging' : ''}`}
                      >
                        <div className="queue-item-content">
                          <div className="queue-position">{index + 1}</div>
                          <div className="queue-participant">
                            <div className="participant-avatar-small">
                              {participant.avatar ? (
                                <img src={participant.avatar} alt={participant.displayName} />
                              ) : (
                                <div className="avatar-placeholder-small">
                                  {participant.displayName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="participant-name">
                              {participant.displayName}
                              {participant.role === 'panelist' && (
                                <span className="panelist-badge" title="Panelist">●</span>
                              )}
                            </span>
                          </div>
                          <button
                            className="remove-button"
                            onClick={() => onRemove(participant.userId)}
                            aria-label="Remove from queue"
                          >
                            ×
                          </button>
                        </div>
                        {index === 0 && !currentSpeaker && (
                          <div className="next-speaker-badge">Next</div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
});

export default SpeakerQueue;
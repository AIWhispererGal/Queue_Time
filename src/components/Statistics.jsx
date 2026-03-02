import React, { useState, useMemo, useCallback, memo } from 'react';
import { formatTime } from '../utils/formatTime';
import './Statistics.css';

const Statistics = memo(function Statistics({ speakerStats, participants, onReset, currentSpeaker, timeRemaining, timeLimit }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate current elapsed time once (memoized)
  const currentElapsed = useMemo(() => {
    if (currentSpeaker && timeRemaining !== undefined && timeLimit !== undefined) {
      return Math.max(0, timeLimit - timeRemaining);
    }
    return 0;
  }, [currentSpeaker, timeRemaining, timeLimit]);

  // Build display stats including current speaker even if not in historical stats
  const displayStats = useMemo(() => {
    const stats = { ...speakerStats };
    if (currentSpeaker?.userId && !stats[currentSpeaker.userId]) {
      stats[currentSpeaker.userId] = {
        name: currentSpeaker.displayName,
        totalTime: 0,
        instances: 0
      };
    }
    return stats;
  }, [speakerStats, currentSpeaker]);

  const getTotalMeetingTime = useCallback(() => {
    const historicalTotal = Object.values(speakerStats).reduce((total, stat) => total + stat.totalTime, 0);
    return historicalTotal + currentElapsed;
  }, [speakerStats, currentElapsed]);

  // FIX: Include current speaker even if they haven't completed a turn yet
  const getTotalSpeakers = useCallback(() => {
    const speakerIds = new Set(Object.keys(speakerStats));
    if (currentSpeaker?.userId) {
      speakerIds.add(currentSpeaker.userId);
    }
    return speakerIds.size;
  }, [speakerStats, currentSpeaker]);

  // FIX: Count current turn as an instance if someone is speaking
  const getAverageSpeakingTime = useCallback(() => {
    let totalInstances = Object.values(speakerStats).reduce((total, stat) => total + stat.instances, 0);

    // Count current turn if someone is speaking
    if (currentSpeaker && currentElapsed > 0) {
      totalInstances += 1;
    }

    if (totalInstances === 0) return 0;
    return Math.round(getTotalMeetingTime() / totalInstances);
  }, [speakerStats, currentSpeaker, currentElapsed, getTotalMeetingTime]);

  // Get adjusted time for a specific user (includes current elapsed if they're speaking)
  const getAdjustedTime = useCallback((userId, stats) => {
    let time = stats.totalTime;
    if (currentSpeaker?.userId === userId) {
      time += currentElapsed;
    }
    return time;
  }, [currentSpeaker, currentElapsed]);

  const exportToCSV = () => {
    const headers = ['Name', 'Total Speaking Time', 'Number of Turns', 'Average Time per Turn'];
    const rows = Object.entries(speakerStats).map(([userId, stats]) => {
      const avgTime = stats.instances > 0 ? Math.round(stats.totalTime / stats.instances) : 0;
      return [
        stats.name,
        formatTime(stats.totalTime),
        stats.instances,
        formatTime(avgTime)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speaker-stats-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // FIX: Use displayStats (includes current speaker) and sort by adjusted time
  const sortedStats = useMemo(() => {
    return Object.entries(displayStats)
      .sort((a, b) => getAdjustedTime(b[0], b[1]) - getAdjustedTime(a[0], a[1]));
  }, [displayStats, getAdjustedTime]);

  // Memoize total time to avoid recalculating in render
  const totalMeetingTime = useMemo(() => getTotalMeetingTime(), [getTotalMeetingTime]);
  const totalSpeakers = useMemo(() => getTotalSpeakers(), [getTotalSpeakers]);
  const avgSpeakingTime = useMemo(() => getAverageSpeakingTime(), [getAverageSpeakingTime]);

  return (
    <div className="statistics">
      <div className="stats-header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
        <h2>{isCollapsed ? '▶' : '▼'} Statistics</h2>
        <div className="stats-actions" onClick={(e) => e.stopPropagation()}>
          {totalSpeakers > 0 && (
            <>
              <button className="export-button" onClick={exportToCSV}>
                Export CSV
              </button>
              <button className="reset-button" onClick={onReset}>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {!isCollapsed && (totalSpeakers === 0 ? (
        <div className="no-stats">
          <p>No statistics yet</p>
          <p className="stats-hint">Statistics will appear once speakers start their turns</p>
        </div>
      ) : (
        <>
          <div className="stats-summary">
            <div className="summary-item">
              <span className="summary-label">Total Meeting Time</span>
              <span className="summary-value">{formatTime(totalMeetingTime)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Active Speakers</span>
              <span className="summary-value">{totalSpeakers}/{participants.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Turn Time</span>
              <span className="summary-value">{formatTime(avgSpeakingTime)}</span>
            </div>
          </div>

          <div className="speaker-stats-list">
            <h3>Speaker Breakdown</h3>
            <div className="stats-list">
              {sortedStats.map(([userId, stats]) => {
                // FIX: Use adjusted time that includes current elapsed for active speaker
                const adjustedTime = getAdjustedTime(userId, stats);
                const percentage = totalMeetingTime > 0
                  ? Math.round((adjustedTime / totalMeetingTime) * 100)
                  : 0;
                // FIX: Include current turn in count for active speaker
                const displayInstances = currentSpeaker?.userId === userId
                  ? stats.instances + 1
                  : stats.instances;
                const avgTime = displayInstances > 0
                  ? Math.round(adjustedTime / displayInstances)
                  : 0;
                const isCurrentlySpeaking = currentSpeaker?.userId === userId;

                return (
                  <div key={userId} className={`stat-item ${isCurrentlySpeaking ? 'speaking' : ''}`}>
                    <div className="stat-name">
                      {stats.name}
                      {isCurrentlySpeaking && <span className="speaking-indicator"> (speaking)</span>}
                    </div>
                    <div className="stat-details">
                      <div className="stat-row">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">{formatTime(adjustedTime)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Turns:</span>
                        <span className="stat-value">{displayInstances}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Avg:</span>
                        <span className="stat-value">{formatTime(avgTime)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Share:</span>
                        <span className="stat-value">{percentage}%</span>
                      </div>
                    </div>
                    <div className="stat-bar">
                      <div
                        className="stat-bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ))}
    </div>
  );
});

export default Statistics;
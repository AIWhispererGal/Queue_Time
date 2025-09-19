import React, { useState } from 'react';
import './Statistics.css';

function Statistics({ speakerStats, participants, onReset, currentSpeaker, timeRemaining, timeLimit }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalMeetingTime = () => {
    let total = Object.values(speakerStats).reduce((total, stat) => total + stat.totalTime, 0);
    // Add current speaker's elapsed time if speaking
    if (currentSpeaker && timeRemaining !== undefined && timeLimit !== undefined) {
      const elapsed = timeLimit - timeRemaining;
      total += elapsed;
    }
    return total;
  };

  const getTotalSpeakers = () => {
    return Object.keys(speakerStats).length;
  };

  const getAverageSpeakingTime = () => {
    const totalInstances = Object.values(speakerStats).reduce((total, stat) => total + stat.instances, 0);
    if (totalInstances === 0) return 0;
    return Math.round(getTotalMeetingTime() / totalInstances);
  };

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

  const sortedStats = Object.entries(speakerStats)
    .sort((a, b) => b[1].totalTime - a[1].totalTime);

  return (
    <div className="statistics">
      <div className="stats-header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
        <h2>{isCollapsed ? '▶' : '▼'} Statistics</h2>
        <div className="stats-actions" onClick={(e) => e.stopPropagation()}>
          {getTotalSpeakers() > 0 && (
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

      {!isCollapsed && (getTotalSpeakers() === 0 ? (
        <div className="no-stats">
          <p>No statistics yet</p>
          <p className="stats-hint">Statistics will appear once speakers start their turns</p>
        </div>
      ) : (
        <>
          <div className="stats-summary">
            <div className="summary-item">
              <span className="summary-label">Total Meeting Time</span>
              <span className="summary-value">{formatTime(getTotalMeetingTime())}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Active Speakers</span>
              <span className="summary-value">{getTotalSpeakers()}/{participants.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Turn Time</span>
              <span className="summary-value">{formatTime(getAverageSpeakingTime())}</span>
            </div>
          </div>

          <div className="speaker-stats-list">
            <h3>Speaker Breakdown</h3>
            <div className="stats-list">
              {sortedStats.map(([userId, stats]) => {
                const percentage = getTotalMeetingTime() > 0
                  ? Math.round((stats.totalTime / getTotalMeetingTime()) * 100)
                  : 0;
                const avgTime = stats.instances > 0
                  ? Math.round(stats.totalTime / stats.instances)
                  : 0;

                return (
                  <div key={userId} className="stat-item">
                    <div className="stat-name">{stats.name}</div>
                    <div className="stat-details">
                      <div className="stat-row">
                        <span className="stat-label">Total:</span>
                        <span className="stat-value">{formatTime(stats.totalTime)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Turns:</span>
                        <span className="stat-value">{stats.instances}</span>
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
}

export default Statistics;
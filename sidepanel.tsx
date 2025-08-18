import { useState, useEffect } from "react"
import { useFluentFlowSupabaseStore as useFluentFlowStore } from "./lib/stores/fluent-flow-supabase-store"
import type { 
  PracticeSession, 
  AudioRecording, 
  YouTubeVideoInfo,
  FluentFlowSettings,
  SavedLoop 
} from "./lib/types/fluent-flow-types"

import "./styles/sidepanel.css"

export default function FluentFlowSidePanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loops' | 'recordings' | 'analytics' | 'settings'>('dashboard')
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null)
  const [playingRecording, setPlayingRecording] = useState<string | null>(null)
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([])
  const [loadingLoops, setLoadingLoops] = useState(false)

  const {
    allSessions,
    statistics,
    settings,
    updateSettings,
    currentSession,
    currentVideo
  } = useFluentFlowStore()

  // Load saved loops on component mount
  useEffect(() => {
    loadSavedLoops()
  }, [])

  const loadSavedLoops = async () => {
    setLoadingLoops(true)
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LIST_LOOPS'
      })
      
      if (response.success) {
        setSavedLoops(response.data)
      } else {
        console.error('Failed to load loops:', response.error)
      }
    } catch (error) {
      console.error('Error loading loops:', error)
    } finally {
      setLoadingLoops(false)
    }
  }

  const deleteLoop = async (loopId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_LOOP',
        data: { id: loopId }
      })
      
      if (response.success) {
        setSavedLoops(loops => loops.filter(loop => loop.id !== loopId))
      } else {
        console.error('Failed to delete loop:', response.error)
      }
    } catch (error) {
      console.error('Error deleting loop:', error)
    }
  }

  const applyLoop = async (loop: SavedLoop) => {
    try {
      // Check if we need to navigate to the video
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]
      
      if (currentTab && currentTab.url && currentTab.url.includes(loop.videoId)) {
        // Same video - apply directly
        chrome.tabs.sendMessage(currentTab.id!, {
          type: 'APPLY_LOOP',
          data: loop
        })
      } else {
        // Different video - open new tab and apply with proper waiting
        const newTab = await chrome.tabs.create({ url: loop.videoUrl })
        
        // Wait for tab to load then apply loop with retry mechanism
        const applyWithRetry = async (attempts = 0) => {
          if (attempts > 10) {
            console.error('FluentFlow: Failed to apply loop after multiple attempts')
            return
          }
          
          try {
            await chrome.tabs.sendMessage(newTab.id!, {
              type: 'APPLY_LOOP',
              data: loop
            })
            console.log('FluentFlow: Loop applied successfully')
          } catch (error) {
            console.log(`FluentFlow: Apply attempt ${attempts + 1} failed, retrying...`)
            setTimeout(() => applyWithRetry(attempts + 1), 2000)
          }
        }
        
        // Start applying after initial delay
        setTimeout(() => applyWithRetry(), 4000)
      }
    } catch (error) {
      console.error('Error applying loop:', error)
    }
  }

  const exportLoop = async (loop: SavedLoop) => {
    try {
      const data = JSON.stringify(loop, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `fluent-flow-loop-${loop.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export loop:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const playRecording = async (recording: AudioRecording) => {
    if (playingRecording === recording.id) {
      setPlayingRecording(null)
      return
    }

    try {
      const audioURL = URL.createObjectURL(recording.audioData)
      const audio = new Audio(audioURL)
      
      audio.onended = () => {
        URL.revokeObjectURL(audioURL)
        setPlayingRecording(null)
      }
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioURL)
        setPlayingRecording(null)
      }

      setPlayingRecording(recording.id)
      await audio.play()
    } catch (error) {
      console.error('Failed to play recording:', error)
      setPlayingRecording(null)
    }
  }

  const deleteRecording = (sessionId: string, recordingId: string) => {
    // This would need to be implemented in the store
    console.log('Delete recording:', recordingId, 'from session:', sessionId)
  }

  const exportRecording = async (recording: AudioRecording) => {
    try {
      const audioURL = URL.createObjectURL(recording.audioData)
      const a = document.createElement('a')
      a.href = audioURL
      a.download = `fluent-flow-recording-${recording.id}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(audioURL)
    } catch (error) {
      console.error('Failed to export recording:', error)
    }
  }

  const renderDashboard = () => (
    <div className="sidepanel-dashboard">
      <div className="dashboard-header">
        <h2>Practice Dashboard</h2>
        {currentVideo && (
          <div className="current-video-banner">
            <div className="video-indicator">🔴 Currently Practicing</div>
            <div className="video-title">{currentVideo.title}</div>
            <div className="video-channel">{currentVideo.channel}</div>
          </div>
        )}
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-value">{statistics.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatTime(statistics.totalPracticeTime)}</div>
          <div className="stat-label">Practice Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.totalRecordings}</div>
          <div className="stat-label">Recordings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatTime(statistics.averageSessionDuration)}</div>
          <div className="stat-label">Avg Session</div>
        </div>
      </div>

      <div className="recent-sessions">
        <h3>Recent Practice Sessions</h3>
        {allSessions.slice(0, 5).map(session => (
          <div 
            key={session.id} 
            className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
            onClick={() => setSelectedSession(session)}
          >
            <div className="session-video">
              <div className="session-title">{session.videoTitle}</div>
              <div className="session-meta">
                {formatDate(session.createdAt)} • {session.segments.length} segments • {session.recordings.length} recordings
              </div>
            </div>
            <div className="session-stats">
              <div className="practice-time">{formatTime(session.totalPracticeTime)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => setActiveTab('recordings')}
          >
            📚 View All Recordings
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => setActiveTab('analytics')}
          >
            📊 View Analytics
          </button>
        </div>
      </div>
    </div>
  )

  const renderRecordings = () => (
    <div className="sidepanel-recordings">
      <div className="recordings-header">
        <h2>Recording Library</h2>
        <div className="recordings-stats">
          {statistics.totalRecordings} recordings across {allSessions.length} sessions
        </div>
      </div>

      <div className="recordings-list">
        {allSessions.map(session => (
          session.recordings.length > 0 && (
            <div key={session.id} className="session-recordings">
              <div className="session-header">
                <h3>{session.videoTitle}</h3>
                <div className="session-date">{formatDate(session.createdAt)}</div>
              </div>
              
              {session.recordings.map(recording => (
                <div key={recording.id} className="recording-item">
                  <div className="recording-info">
                    <div className="recording-title">
                      Recording {recording.id.slice(-6)}
                    </div>
                    <div className="recording-meta">
                      {formatTime(recording.duration)} • {formatDate(recording.createdAt)}
                    </div>
                  </div>
                  
                  <div className="recording-controls">
                    <button 
                      className={`control-btn ${playingRecording === recording.id ? 'playing' : ''}`}
                      onClick={() => playRecording(recording)}
                    >
                      {playingRecording === recording.id ? '⏸️' : '▶️'}
                    </button>
                    <button 
                      className="control-btn"
                      onClick={() => exportRecording(recording)}
                    >
                      💾
                    </button>
                    <button 
                      className="control-btn danger"
                      onClick={() => deleteRecording(session.id, recording.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  )

  const renderLoops = () => (
    <div className="sidepanel-loops">
      <div className="loops-header">
        <h2>Saved Loops</h2>
        <div className="loops-stats">
          {savedLoops.length} saved loops
        </div>
        <button 
          className="action-btn secondary"
          onClick={loadSavedLoops}
          disabled={loadingLoops}
        >
          {loadingLoops ? '⟳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="loops-list">
        {loadingLoops && (
          <div className="loading-state">Loading loops...</div>
        )}
        
        {!loadingLoops && savedLoops.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔁</div>
            <div className="empty-title">No loops saved yet</div>
            <div className="empty-description">
              Create loops on YouTube videos to save them here for later use
            </div>
          </div>
        )}

        {!loadingLoops && savedLoops.map(loop => (
          <div key={loop.id} className="loop-item">
            <div className="loop-info">
              <div className="loop-title">{loop.title}</div>
              <div className="loop-video">{loop.videoTitle}</div>
              <div className="loop-time">
                {formatTime(loop.startTime)} - {formatTime(loop.endTime)}
                {' '} • Duration: {formatTime(loop.endTime - loop.startTime)}
              </div>
              <div className="loop-meta">
                Created: {formatDate(new Date(loop.createdAt))}
              </div>
              {loop.description && (
                <div className="loop-description">{loop.description}</div>
              )}
            </div>
            
            <div className="loop-controls">
              <button 
                className="control-btn primary"
                onClick={() => applyLoop(loop)}
                title="Apply this loop"
              >
                ▶️ Apply
              </button>
              <button 
                className="control-btn"
                onClick={() => exportLoop(loop)}
                title="Export loop as JSON"
              >
                💾 Export
              </button>
              <button 
                className="control-btn danger"
                onClick={() => deleteLoop(loop.id)}
                title="Delete loop"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="sidepanel-analytics">
      <h2>Practice Analytics</h2>
      
      <div className="analytics-cards">
        <div className="analytics-card">
          <h3>Weekly Progress</h3>
          <div className="progress-chart">
            {statistics.weeklyProgress.slice(-7).map(day => (
              <div key={day.date} className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ height: `${Math.min(100, (day.practiceTime / 3600) * 100)}%` }}
                ></div>
                <div className="progress-label">{day.date.slice(-2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Most Practiced Videos</h3>
          <div className="top-videos">
            {statistics.mostPracticedVideos.slice(0, 5).map(video => (
              <div key={video.videoId} className="video-rank">
                <div className="video-info">
                  <div className="video-title">{video.title}</div>
                  <div className="video-channel">{video.channel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Practice Streaks</h3>
          <div className="streak-info">
            <div className="streak-current">
              <div className="streak-number">7</div>
              <div className="streak-label">Day Streak</div>
            </div>
            <div className="streak-best">
              <div className="streak-number">21</div>
              <div className="streak-label">Best Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="sidepanel-settings">
      <h2>Settings</h2>
      
      <div className="settings-section">
        <h3>Audio Settings</h3>
        <div className="setting-item">
          <label>Recording Quality</label>
          <select 
            value={settings.audioQuality}
            onChange={(e) => updateSettings({ audioQuality: e.target.value as 'low' | 'medium' | 'high' })}
          >
            <option value="low">Low (32kbps)</option>
            <option value="medium">Medium (64kbps)</option>
            <option value="high">High (128kbps)</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Max Recording Duration</label>
          <select
            value={settings.maxRecordingDuration}
            onChange={(e) => updateSettings({ maxRecordingDuration: parseInt(e.target.value) })}
          >
            <option value="60">1 minute</option>
            <option value="180">3 minutes</option>
            <option value="300">5 minutes</option>
            <option value="600">10 minutes</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>UI Preferences</h3>
        <div className="setting-item">
          <label>Panel Position</label>
          <select
            value={settings.panelPosition}
            onChange={(e) => updateSettings({ panelPosition: e.target.value as any })}
          >
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </div>
        
        <div className="setting-item checkbox">
          <input
            type="checkbox"
            id="autoSave"
            checked={settings.autoSaveRecordings}
            onChange={(e) => updateSettings({ autoSaveRecordings: e.target.checked })}
          />
          <label htmlFor="autoSave">Auto-save recordings</label>
        </div>
        
        <div className="setting-item checkbox">
          <input
            type="checkbox"
            id="visualFeedback"
            checked={settings.showVisualFeedback}
            onChange={(e) => updateSettings({ showVisualFeedback: e.target.checked })}
          />
          <label htmlFor="visualFeedback">Show visual feedback</label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Keyboard Shortcuts</h3>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <span>Set Loop Points</span>
            <kbd>{settings.keyboardShortcuts.toggleLoop}</kbd>
          </div>
          <div className="shortcut-item">
            <span>Start/Stop Recording</span>
            <kbd>{settings.keyboardShortcuts.toggleRecording}</kbd>
          </div>
          <div className="shortcut-item">
            <span>Compare Audio</span>
            <kbd>{settings.keyboardShortcuts.compareAudio}</kbd>
          </div>
          <div className="shortcut-item">
            <span>Toggle Panel</span>
            <kbd>{settings.keyboardShortcuts.togglePanel}</kbd>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Data Management</h3>
        <div className="data-actions">
          <button className="action-btn secondary">Export All Data</button>
          <button className="action-btn secondary">Import Data</button>
          <button className="action-btn danger">Clear All Data</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fluent-flow-sidepanel">
      <div className="sidepanel-header">
        <h1>FluentFlow</h1>
        <div className="sidepanel-subtitle">YouTube Language Learning</div>
      </div>

      <div className="sidepanel-tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'loops' ? 'active' : ''}`}
          onClick={() => setActiveTab('loops')}
        >
          🔁 Loops
        </button>
        <button 
          className={`tab ${activeTab === 'recordings' ? 'active' : ''}`}
          onClick={() => setActiveTab('recordings')}
        >
          🎵 Recordings
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="sidepanel-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'loops' && renderLoops()}
        {activeTab === 'recordings' && renderRecordings()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  )
}
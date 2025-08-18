import { useState, useEffect } from "react"
import { useFluentFlowSupabaseStore as useFluentFlowStore } from "./lib/stores/fluent-flow-supabase-store"
import type { YouTubeVideoInfo, PracticeSession } from "./lib/types/fluent-flow-types"

import "./styles/popup.css"

export default function FluentFlowPopup() {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null)
  const [isYouTubePage, setIsYouTubePage] = useState(false)
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null)
  
  const { 
    currentSession,
    statistics,
    settings,
    uiState,
    togglePanel,
    updateSettings
  } = useFluentFlowStore()

  useEffect(() => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      setCurrentTab(tab)
      
      if (tab?.url) {
        const isYT = tab.url.includes('youtube.com/watch')
        setIsYouTubePage(isYT)
        
        if (isYT && tab.id) {
          // Try to get video info from content script
          chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' }, (response) => {
            if (response?.success && response.videoInfo) {
              setVideoInfo(response.videoInfo)
            }
          })
        }
      }
    })
  }, [])

  const handleTogglePanel = () => {
    if (currentTab?.id && isYouTubePage) {
      chrome.tabs.sendMessage(currentTab.id, { type: 'TOGGLE_PANEL' })
      togglePanel()
      window.close() // Close popup after action
    }
  }

  const handleOpenSidePanel = () => {
    chrome.sidePanel.open({ windowId: currentTab?.windowId })
    window.close()
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
    window.close()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isYouTubePage) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <h1 className="popup-title">FluentFlow</h1>
          <div className="popup-subtitle">YouTube Language Learning</div>
        </div>
        
        <div className="popup-content">
          <div className="not-youtube-message">
            <div className="icon">📺</div>
            <h3>Not on YouTube</h3>
            <p>FluentFlow works on YouTube watch pages. Navigate to a YouTube video to start practicing!</p>
            
            <div className="quick-actions">
              <button 
                className="action-button secondary"
                onClick={handleOpenSidePanel}
              >
                Open Practice History
              </button>
              <button 
                className="action-button secondary"
                onClick={handleOpenOptions}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1 className="popup-title">FluentFlow</h1>
        <div className="popup-subtitle">YouTube Language Learning</div>
      </div>
      
      <div className="popup-content">
        {videoInfo && (
          <div className="current-video">
            <div className="video-info">
              <h3 className="video-title">{videoInfo.title}</h3>
              <div className="video-channel">{videoInfo.channel}</div>
              <div className="video-duration">{formatTime(videoInfo.duration)}</div>
            </div>
          </div>
        )}

        <div className="practice-status">
          {currentSession ? (
            <div className="session-active">
              <div className="status-indicator active"></div>
              <div>
                <div className="status-title">Practice Session Active</div>
                <div className="status-details">
                  {currentSession.segments.length} segments • {currentSession.recordings.length} recordings
                </div>
              </div>
            </div>
          ) : (
            <div className="session-inactive">
              <div className="status-indicator"></div>
              <div>
                <div className="status-title">Ready to Practice</div>
                <div className="status-details">Open panel to start practicing</div>
              </div>
            </div>
          )}
        </div>

        <div className="quick-actions">
          <button 
            className="action-button primary"
            onClick={handleTogglePanel}
          >
            {uiState.isPanelVisible ? 'Hide Panel' : 'Show Panel'}
          </button>
          
          <div className="action-row">
            <button 
              className="action-button secondary"
              onClick={handleOpenSidePanel}
            >
              Practice History
            </button>
            <button 
              className="action-button secondary"
              onClick={handleOpenOptions}
            >
              Settings
            </button>
          </div>
        </div>

        <div className="statistics-summary">
          <h4>Your Progress</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{statistics.totalSessions}</div>
              <div className="stat-label">Sessions</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{statistics.totalRecordings}</div>
              <div className="stat-label">Recordings</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatTime(statistics.totalPracticeTime)}</div>
              <div className="stat-label">Practice Time</div>
            </div>
          </div>
        </div>

        <div className="keyboard-shortcuts">
          <h4>Keyboard Shortcuts</h4>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <kbd>Alt + L</kbd>
              <span>Set Loop Points</span>
            </div>
            <div className="shortcut-item">
              <kbd>Alt + R</kbd>
              <span>Start/Stop Recording</span>
            </div>
            <div className="shortcut-item">
              <kbd>Alt + C</kbd>
              <span>Compare Audio</span>
            </div>
            <div className="shortcut-item">
              <kbd>Alt + Shift + F</kbd>
              <span>Toggle Panel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// Side Panel Component - Extended UI for more complex interactions
// Provides more space and features than popup

import { useState, useEffect } from "react"
import { useFeatureProcessing } from "./hooks/use-feature-processing"
import { useStorageData } from "./hooks/use-storage-data"
import type { FeatureData, ProcessResult } from "./lib/types"

import "./styles/sidepanel.css"

export default function SidePanel() {
  const [inputText, setInputText] = useState("")
  const [history, setHistory] = useState<ProcessResult[]>([])
  const [activeTab, setActiveTab] = useState<'process' | 'history' | 'settings'>('process')

  const { 
    processFeature, 
    isLoading, 
    result, 
    error,
    clearResult 
  } = useFeatureProcessing()

  const {
    data: storageData,
    updateData: updateStorageData
  } = useStorageData()

  // Listen for messages from background script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === "SIDEPANEL_DATA" && message.selectedText) {
        setInputText(message.selectedText)
        setActiveTab('process')
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  // Load history from storage
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "STORAGE_OPERATION",
          operation: "get",
          key: "processing_history"
        })

        if (response.success && response.data.processing_history) {
          setHistory(response.data.processing_history)
        }
      } catch (error) {
        console.error("Failed to load history:", error)
      }
    }

    loadHistory()
  }, [])

  // Save result to history
  useEffect(() => {
    if (result) {
      const newHistory = [result, ...history.slice(0, 49)] // Keep last 50 items
      setHistory(newHistory)

      // Save to storage
      chrome.runtime.sendMessage({
        type: "STORAGE_OPERATION",
        operation: "set",
        key: "processing_history",
        value: newHistory
      }).catch(console.error)
    }
  }, [result])

  const handleProcess = async () => {
    if (!inputText.trim()) return

    const featureData: FeatureData = {
      input: inputText.trim(),
      options: {
        priority: 'normal',
        timeout: 30000
      }
    }

    await processFeature(featureData)
  }

  const handleClearHistory = async () => {
    setHistory([])
    try {
      await chrome.runtime.sendMessage({
        type: "STORAGE_OPERATION",
        operation: "remove",
        key: "processing_history"
      })
    } catch (error) {
      console.error("Failed to clear history:", error)
    }
  }

  const handleExportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `extension-history-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  const renderProcessTab = () => (
    <div className="tab-content">
      <div className="input-section">
        <label htmlFor="sidepanel-input" className="input-label">
          Enter text to process:
        </label>
        <textarea
          id="sidepanel-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste text here..."
          className="input-textarea large"
          rows={6}
          disabled={isLoading}
        />
      </div>

      <div className="actions-section">
        <button
          onClick={handleProcess}
          disabled={!inputText.trim() || isLoading}
          className="primary-button"
        >
          {isLoading ? (
            <>
              <span className="spinner-small"></span>
              Processing...
            </>
          ) : (
            'Process Text'
          )}
        </button>

        {result && (
          <button
            onClick={clearResult}
            className="secondary-button"
          >
            Clear Result
          </button>
        )}
      </div>

      {error && (
        <div className="error-section">
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {result && (
        <div className="result-section">
          <h3>Result:</h3>
          <div className="result-content">
            <div className="result-item">
              <label>Input:</label>
              <div className="result-text">{result.input}</div>
            </div>
            <div className="result-item">
              <label>Output:</label>
              <div className="result-text">{result.output.result}</div>
            </div>
            {result.output.metadata && (
              <div className="result-metadata">
                <small>
                  Processed at: {new Date(result.timestamp).toLocaleString()} • 
                  Processing time: {Math.round(result.output.metadata.processingTime)}ms
                </small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderHistoryTab = () => (
    <div className="tab-content">
      <div className="history-header">
        <h3>Processing History</h3>
        <div className="history-actions">
          <button onClick={handleExportHistory} className="secondary-button">
            Export
          </button>
          <button onClick={handleClearHistory} className="danger-button">
            Clear All
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>No processing history yet.</p>
          <p>Process some text to see results here.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item, index) => (
            <div key={item.id} className="history-item">
              <div className="history-item-header">
                <span className="history-index">#{history.length - index}</span>
                <span className="history-timestamp">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="history-item-content">
                <div className="history-input">
                  <label>Input:</label>
                  <p>{item.input}</p>
                </div>
                <div className="history-output">
                  <label>Output:</label>
                  <p>{item.output.result}</p>
                </div>
              </div>
              <div className="history-item-actions">
                <button
                  onClick={() => setInputText(item.input)}
                  className="small-button"
                >
                  Reuse Input
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSettingsTab = () => (
    <div className="tab-content">
      <h3>Settings</h3>
      
      <div className="settings-section">
        <h4>Processing Options</h4>
        <div className="setting-item">
          <label>
            <input type="checkbox" defaultChecked />
            Enable caching
          </label>
          <p className="setting-description">
            Cache results to improve performance
          </p>
        </div>
        <div className="setting-item">
          <label>
            <input type="checkbox" defaultChecked />
            Auto-save to history
          </label>
          <p className="setting-description">
            Automatically save all processed results
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h4>Storage</h4>
        <div className="setting-item">
          <button className="secondary-button">
            Clear All Data
          </button>
          <p className="setting-description">
            Remove all stored data and reset extension
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h4>About</h4>
        <div className="about-info">
          <p><strong>Chrome Extension Starter</strong></p>
          <p>Version: 1.0.0</p>
          <p>Clean architecture template for Chrome extensions</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="sidepanel-container">
      <header className="sidepanel-header">
        <h1>Extension Starter</h1>
      </header>

      <nav className="sidepanel-nav">
        <button
          className={`nav-button ${activeTab === 'process' ? 'active' : ''}`}
          onClick={() => setActiveTab('process')}
        >
          Process
        </button>
        <button
          className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({history.length})
        </button>
        <button
          className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      <main className="sidepanel-main">
        {activeTab === 'process' && renderProcessTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </main>
    </div>
  )
}
// Main Popup Component - Extension popup UI
// Clean React component following separation of concerns

import { useState, useEffect } from "react"
import { useFeatureProcessing } from "./hooks/use-feature-processing"
import { useExtensionConfig } from "./hooks/use-extension-config"
import type { FeatureData } from "./lib/types"

import "./styles/popup.css"

export default function Popup() {
  const [inputText, setInputText] = useState("")
  const [selectedText, setSelectedText] = useState("")
  
  const { 
    processFeature, 
    isLoading, 
    result, 
    error,
    clearResult 
  } = useFeatureProcessing()
  
  const { config, isLoading: configLoading } = useExtensionConfig()

  // Get selected text from active tab on popup open
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "GET_SELECTED_TEXT"
        }).then((response) => {
          if (response?.selectedText) {
            setSelectedText(response.selectedText)
            setInputText(response.selectedText)
          }
        }).catch(() => {
          // No content script or no response, that's ok
        })
      }
    })
  }, [])

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

  const handleOpenSidePanel = () => {
    chrome.runtime.sendMessage({
      type: "OPEN_SIDE_PANEL",
      selectedText: inputText || selectedText
    })
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  if (configLoading) {
    return (
      <div className="popup-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading extension...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Chrome Extension Starter</h1>
        <div className="header-actions">
          <button 
            className="icon-button" 
            onClick={handleOpenOptions}
            title="Open Options"
          >
            ⚙️
          </button>
          <button 
            className="icon-button" 
            onClick={handleOpenSidePanel}
            title="Open Side Panel"
          >
            📱
          </button>
        </div>
      </header>

      <main className="popup-main">
        {selectedText && (
          <div className="selected-text-info">
            <p className="info-label">Selected text:</p>
            <p className="selected-text">"{selectedText}"</p>
          </div>
        )}

        <div className="input-section">
          <label htmlFor="input-text" className="input-label">
            Enter text to process:
          </label>
          <textarea
            id="input-text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text here..."
            className="input-textarea"
            rows={4}
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
                <p>{result.input}</p>
              </div>
              <div className="result-item">
                <label>Output:</label>
                <p>{result.output.result}</p>
              </div>
              {result.output.metadata && (
                <div className="result-item">
                  <label>Processing Time:</label>
                  <p>{Math.round(result.output.metadata.processingTime)}ms</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="popup-footer">
        <div className="status-info">
          <span className="status-indicator success"></span>
          <span className="status-text">
            Extension v{config?.version || '1.0.0'} • Ready
          </span>
        </div>
      </footer>
    </div>
  )
}
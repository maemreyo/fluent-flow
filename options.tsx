// Options Page Component - Extension settings and configuration
// Full-page settings interface

import { useState, useEffect } from "react"
import { useStorageData } from "./hooks/use-storage-data"
import type { UserPreferences, ApiConfig } from "./lib/types"

import "./styles/options.css"

export default function OptionsPage() {
  const [activeSection, setActiveSection] = useState<'general' | 'api' | 'advanced' | 'about'>('general')
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    notifications: true,
    autoSave: true,
    language: 'en',
    shortcuts: {}
  })
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    baseUrl: 'https://jsonplaceholder.typicode.com',
    timeout: 30000
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "STORAGE_OPERATION",
          operation: "get",
          key: ["user_preferences", "api_config"]
        })

        if (response.success) {
          if (response.data.user_preferences) {
            setPreferences(response.data.user_preferences)
          }
          if (response.data.api_config) {
            setApiConfig(response.data.api_config)
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Save preferences
      await chrome.runtime.sendMessage({
        type: "STORAGE_OPERATION",
        operation: "set",
        key: "user_preferences",
        value: preferences
      })

      // Save API config
      await chrome.runtime.sendMessage({
        type: "STORAGE_OPERATION",
        operation: "set",
        key: "api_config",
        value: apiConfig
      })

      setSaveMessage("Settings saved successfully!")
      setTimeout(() => setSaveMessage(null), 3000)

    } catch (error) {
      console.error("Failed to save settings:", error)
      setSaveMessage("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) {
      return
    }

    const defaultPreferences: UserPreferences = {
      theme: 'light',
      notifications: true,
      autoSave: true,
      language: 'en',
      shortcuts: {}
    }

    const defaultApiConfig: ApiConfig = {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      timeout: 30000
    }

    setPreferences(defaultPreferences)
    setApiConfig(defaultApiConfig)
  }

  const handleTestApiConnection = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "API_CALL",
        endpoint: "example-api",
        data: {}
      })

      if (response.success) {
        alert("API connection test successful!")
      } else {
        alert(`API connection test failed: ${response.error}`)
      }
    } catch (error) {
      alert(`API connection test failed: ${error}`)
    }
  }

  const renderGeneralSection = () => (
    <div className="settings-section">
      <h2>General Settings</h2>
      
      <div className="setting-group">
        <h3>Appearance</h3>
        
        <div className="setting-item">
          <label htmlFor="theme-select">Theme:</label>
          <select
            id="theme-select"
            value={preferences.theme}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              theme: e.target.value as 'light' | 'dark' | 'auto'
            }))}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>

        <div className="setting-item">
          <label htmlFor="language-select">Language:</label>
          <select
            id="language-select"
            value={preferences.language}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              language: e.target.value
            }))}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>

      <div className="setting-group">
        <h3>Behavior</h3>
        
        <div className="setting-item checkbox-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                notifications: e.target.checked
              }))}
            />
            Enable notifications
          </label>
          <p className="setting-description">
            Show notifications for processing results and errors
          </p>
        </div>

        <div className="setting-item checkbox-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.autoSave}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                autoSave: e.target.checked
              }))}
            />
            Auto-save results
          </label>
          <p className="setting-description">
            Automatically save processing results to history
          </p>
        </div>
      </div>
    </div>
  )

  const renderApiSection = () => (
    <div className="settings-section">
      <h2>API Configuration</h2>
      
      <div className="setting-group">
        <h3>API Settings</h3>
        
        <div className="setting-item">
          <label htmlFor="api-base-url">Base URL:</label>
          <input
            id="api-base-url"
            type="url"
            value={apiConfig.baseUrl}
            onChange={(e) => setApiConfig(prev => ({
              ...prev,
              baseUrl: e.target.value
            }))}
            placeholder="https://api.example.com"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="api-timeout">Timeout (ms):</label>
          <input
            id="api-timeout"
            type="number"
            min="1000"
            max="300000"
            step="1000"
            value={apiConfig.timeout || 30000}
            onChange={(e) => setApiConfig(prev => ({
              ...prev,
              timeout: parseInt(e.target.value)
            }))}
          />
        </div>

        <div className="setting-item">
          <label htmlFor="api-key">API Key (optional):</label>
          <input
            id="api-key"
            type="password"
            value={apiConfig.apiKey || ''}
            onChange={(e) => setApiConfig(prev => ({
              ...prev,
              apiKey: e.target.value || undefined
            }))}
            placeholder="Enter your API key"
          />
          <p className="setting-description">
            API key will be stored securely in local storage
          </p>
        </div>

        <div className="setting-actions">
          <button
            onClick={handleTestApiConnection}
            className="secondary-button"
          >
            Test Connection
          </button>
        </div>
      </div>
    </div>
  )

  const renderAdvancedSection = () => (
    <div className="settings-section">
      <h2>Advanced Settings</h2>
      
      <div className="setting-group">
        <h3>Performance</h3>
        
        <div className="setting-item">
          <label htmlFor="cache-size">Max Cache Items:</label>
          <input
            id="cache-size"
            type="number"
            min="10"
            max="1000"
            defaultValue="100"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="batch-size">Batch Processing Size:</label>
          <input
            id="batch-size"
            type="number"
            min="1"
            max="50"
            defaultValue="5"
          />
        </div>
      </div>

      <div className="setting-group">
        <h3>Data Management</h3>
        
        <div className="setting-actions">
          <button className="secondary-button">
            Export All Data
          </button>
          <button className="secondary-button">
            Import Data
          </button>
          <button className="danger-button">
            Clear All Data
          </button>
        </div>
      </div>

      <div className="setting-group">
        <h3>Reset</h3>
        
        <div className="setting-actions">
          <button
            onClick={handleResetSettings}
            className="danger-button"
          >
            Reset All Settings
          </button>
        </div>
      </div>
    </div>
  )

  const renderAboutSection = () => (
    <div className="settings-section">
      <h2>About</h2>
      
      <div className="about-content">
        <div className="extension-info">
          <h3>Chrome Extension Starter</h3>
          <p className="version">Version 1.0.0</p>
          <p className="description">
            A clean architecture template for Chrome extensions with TypeScript, 
            React, and best practices for scalable development.
          </p>
        </div>

        <div className="features-list">
          <h4>Features:</h4>
          <ul>
            <li>Clean architecture with separation of concerns</li>
            <li>TypeScript for type safety</li>
            <li>React for modern UI development</li>
            <li>Background script with proper message routing</li>
            <li>Service layer for business logic</li>
            <li>Caching and rate limiting</li>
            <li>Input validation and sanitization</li>
            <li>Error handling and user feedback</li>
          </ul>
        </div>

        <div className="links">
          <h4>Links:</h4>
          <p>
            <a href="https://github.com/example/chrome-extension-starter" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
          </p>
          <p>
            <a href="https://developer.chrome.com/docs/extensions/" target="_blank" rel="noopener noreferrer">
              Chrome Extension Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Chrome Extension Starter - Settings</h1>
      </header>

      <div className="options-content">
        <nav className="options-nav">
          <button
            className={`nav-button ${activeSection === 'general' ? 'active' : ''}`}
            onClick={() => setActiveSection('general')}
          >
            General
          </button>
          <button
            className={`nav-button ${activeSection === 'api' ? 'active' : ''}`}
            onClick={() => setActiveSection('api')}
          >
            API
          </button>
          <button
            className={`nav-button ${activeSection === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveSection('advanced')}
          >
            Advanced
          </button>
          <button
            className={`nav-button ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            About
          </button>
        </nav>

        <main className="options-main">
          {activeSection === 'general' && renderGeneralSection()}
          {activeSection === 'api' && renderApiSection()}
          {activeSection === 'advanced' && renderAdvancedSection()}
          {activeSection === 'about' && renderAboutSection()}
        </main>
      </div>

      <footer className="options-footer">
        {activeSection !== 'about' && (
          <div className="save-section">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="primary-button"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            
            {saveMessage && (
              <span className={`save-message ${saveMessage.includes('successfully') ? 'success' : 'error'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        )}
      </footer>
    </div>
  )
}
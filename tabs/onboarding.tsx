import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/globals.css'
import { AuthComponent } from '../components/auth-component'

const Onboarding = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { getCurrentUser } = await import('../lib/supabase/client')
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setIsLoggedIn(true)
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuthStatus()
  }, [])

  const handleAuthSuccess = () => {
    // The auth component will handle setting the user state via the auth state change listener
    setIsLoggedIn(true)
  }

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setSaveStatus('API key cannot be empty.')
      return
    }

    try {
      // Save to both Chrome storage and Supabase
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ geminiApiKey: geminiApiKey.trim() }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(true)
          }
        })
      })

      // Also save to Supabase if user is logged in
      if (user) {
        const { getFluentFlowStore } = await import('../lib/stores/fluent-flow-supabase-store')
        const { supabaseService } = getFluentFlowStore()
        await supabaseService.updateApiConfig({
          baseUrl: 'https://generativelanguage.googleapis.com',
          gemini: { apiKey: geminiApiKey.trim() }
        })
      }

      setSaveStatus('API Key saved successfully! You can now close this tab.')
    } catch (error) {
      setSaveStatus(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans">
      <div className="max-w-md w-full mx-auto p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Welcome to FluentFlow!</h1>
          <p className="mt-2 text-lg text-gray-600">Let's get you set up for learning.</p>
        </div>

        {!isLoggedIn ? (
          // STEP 1: LOGIN / SIGN UP
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-semibold text-center text-gray-700">Step 1: Log In or Sign Up</h2>
            <p className="text-center text-gray-500 mt-2 mb-6">
              Your progress and data will be synced with your account.
            </p>
            <AuthComponent onAuthSuccess={handleAuthSuccess} />
          </div>
        ) : (
          // STEP 2: API KEY CONFIGURATION
          <div className="bg-white p-8 rounded-xl shadow-md transition-opacity duration-500">
            <h2 className="text-2xl font-semibold text-center text-gray-700">Step 2: Set Your Gemini API Key</h2>
            <p className="text-center text-gray-500 mt-2 mb-6">
              FluentFlow uses Google's Gemini for AI features. Please provide your API key to enable them.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Gemini API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your API key here"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                  Get your Gemini API key from Google AI Studio
                </a>
              </div>
              <button
                onClick={handleSaveApiKey}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save and Complete Setup
              </button>
              {saveStatus && (
                <p className={`text-center text-sm ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                  {saveStatus}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<Onboarding />)

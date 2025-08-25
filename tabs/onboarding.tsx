import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthComponent } from '../components/auth-component'
import { getFluentFlowStore } from '../lib/stores/fluent-flow-supabase-store'
import { getCurrentUser } from '../lib/supabase/client'
import '../styles/globals.css'

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 font-sans">
      <div className="mx-auto w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Welcome to FluentFlow!</h1>
          <p className="mt-2 text-lg text-gray-600">Let's get you set up for learning.</p>
        </div>

        {!isLoggedIn ? (
          // STEP 1: LOGIN / SIGN UP
          <div className="rounded-xl bg-white p-8 shadow-md">
            <h2 className="text-center text-2xl font-semibold text-gray-700">
              Step 1: Log In or Sign Up
            </h2>
            <p className="mb-6 mt-2 text-center text-gray-500">
              Your progress and data will be synced with your account.
            </p>
            <AuthComponent onAuthSuccess={handleAuthSuccess} />
          </div>
        ) : (
          // STEP 2: API KEY CONFIGURATION
          <div className="rounded-xl bg-white p-8 shadow-md transition-opacity duration-500">
            <h2 className="text-center text-2xl font-semibold text-gray-700">
              Step 2: Set Your Gemini API Key
            </h2>
            <p className="mb-6 mt-2 text-center text-gray-500">
              FluentFlow uses Google's Gemini for AI features. Please provide your API key to enable
              them.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="mb-1 block text-sm font-medium text-gray-700">
                  Gemini API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your API key here"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs text-blue-600 hover:underline"
                >
                  Get your Gemini API key from Google AI Studio
                </a>
              </div>
              <button
                onClick={handleSaveApiKey}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save and Complete Setup
              </button>
              {saveStatus && (
                <p
                  className={`text-center text-sm ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-600'}`}
                >
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

import { KeyRound, Loader2, LogIn, PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthComponent } from '../components/auth-component'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-lg text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="container mx-auto flex max-w-2xl flex-col items-center justify-center space-y-8 p-4 py-12 md:p-8">
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-3 text-4xl font-bold">
            <PartyPopper className="h-10 w-10 text-primary" />
            Welcome to FluentFlow!
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Let's get you set up for an enhanced learning experience.
          </p>
        </div>

        {!isLoggedIn ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Step 1: Log In or Sign Up
              </CardTitle>
              <CardDescription>
                Sync your progress and data across devices by creating an account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthComponent onAuthSuccess={handleAuthSuccess} />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Step 2: Set Your Gemini API Key
              </CardTitle>
              <CardDescription>
                FluentFlow uses Google's Gemini for AI features. Provide your API key to enable
                them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Gemini API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your API key here"
                />
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Get your Gemini API key from Google AI Studio
                </a>
              </div>
              <Button onClick={handleSaveApiKey} className="w-full">
                Save and Complete Setup
              </Button>
              {saveStatus && (
                <p
                  className={`text-center text-sm ${saveStatus.includes('Error') ? 'text-destructive' : 'text-green-600'}`}
                >
                  {saveStatus}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root')
  if (container) {
    const root = createRoot(container)
    root.render(<Onboarding />)
  } else {
    console.error('Root element not found. Ensure <div id="root"></div> exists in your HTML.')
  }
})
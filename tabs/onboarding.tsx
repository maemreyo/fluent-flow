import { CheckCircle2, KeyRound, Loader2, LogIn, PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import Joyride, { type Step } from 'react-joyride'
import { AuthComponent } from '../components/auth-component'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { getFluentFlowStore } from '../lib/stores/fluent-flow-supabase-store'
import { getCurrentUser } from '../lib/supabase/client'
import '../styles/globals.css'

const GeminiApiKeyGuide = () => (
  <div className="mt-6 space-y-6 rounded-lg border bg-muted/50 p-4 dark:bg-muted/20">
    <div className="space-y-4">
      <h3 className="text-center font-semibold">How to get your API Key in 30 seconds</h3>
      <ol className="space-y-3">
        <li className="flex items-start gap-3">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            1
          </div>
          <div>
            Go to{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline">
              Google AI Studio
            </a>{' '}
            and sign in.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            2
          </div>
          <div>
            Click on <span className="font-semibold">"Create API key"</span> in a new or existing
            project.
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            3
          </div>
          <div>Copy your new API key and paste it above.</div>
        </li>
      </ol>
    </div>
    <div className="space-y-4 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
      <h3 className="font-semibold text-green-800 dark:text-green-300">
        Unlock Powerful AI Features
      </h3>
      <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Deeper, more effective learning</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>AI-powered question generation</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Interactive practice sessions</span>
        </li>
      </ul>
    </div>
  </div>
)

export default function Onboarding() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [runTour, setRunTour] = useState(false)

  const tourSteps: Step[] = [
    {
      target: '#step-1-login',
      content: 'First, log in or sign up to sync your progress across devices.',
      disableBeacon: true
    },
    {
      target: '#step-2-api-key',
      content: 'Next, provide your Gemini API key to enable all the AI-powered features.'
    }
  ]

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
        // Start the tour once everything is loaded
        setRunTour(true)
      }
    }

    checkAuthStatus()
  }, [])

  const handleAuthSuccess = () => {
    setIsLoggedIn(true)
  }

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setSaveStatus('API key cannot be empty.')
      return
    }

    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ geminiApiKey: geminiApiKey.trim() }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(true)
          }
        })
      })

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
    <div className="min-h-screen font-sans text-foreground animated-gradient-background">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            primaryColor: '#3b82f6'
          }
        }}
      />
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
          <Card id="step-1-login" className="w-full max-w-md">
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
          <Card id="step-2-api-key" className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Step 2: Set Your Gemini API Key
              </CardTitle>
              <CardDescription>
                Provide your API key to unlock powerful AI-driven learning features.
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
              </div>
              <Button onClick={handleSaveApiKey} className="w-full">
                Save and Complete Setup
              </Button>
              {saveStatus && (
                <p
                  className={`text-center text-sm ${
                    saveStatus.includes('Error') ? 'text-destructive' : 'text-green-600'
                  }`}>
                  {saveStatus}
                </p>
              )}
              <GeminiApiKeyGuide />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
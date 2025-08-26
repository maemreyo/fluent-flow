import { CheckCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { getFluentFlowStore } from '../../lib/stores/fluent-flow-supabase-store'
import { getCurrentUser } from '../../lib/supabase/client'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { OnboardingLayout } from './OnboardingLayout'

const GeminiApiKeyGuide = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.5 }}
    className="mt-6 space-y-6 rounded-lg border bg-muted/50 p-4 dark:bg-muted/20">
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
  </motion.div>
)

interface ApiKeyStepProps {
  onNext: () => void
  onPrevious: () => void
}

export function ApiKeyStep({ onNext, onPrevious }: ApiKeyStepProps) {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setErrorMessage('API key cannot be empty.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    try {
      await new Promise<void>((resolve, reject) => {
        chrome.storage.sync.set({ geminiApiKey: geminiApiKey.trim() }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })

      const user = await getCurrentUser()
      if (user) {
        const { supabaseService } = getFluentFlowStore()
        await supabaseService.updateApiConfig({
          baseUrl: 'https://generativelanguage.googleapis.com',
          gemini: { apiKey: geminiApiKey.trim() }
        })
      }

      setStatus('success')
      setTimeout(onNext, 1000) // Go to next step after a short delay
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.')
    }
  }

  return (
    <OnboardingLayout
      title={
        <>
          <KeyRound className="h-7 w-7" />
          Set Your Gemini API Key
        </>
      }
      description="Provide your API key to unlock powerful AI-driven learning features.">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">Gemini API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={geminiApiKey}
            onChange={e => setGeminiApiKey(e.target.value)}
            placeholder="Enter your API key here"
            disabled={status === 'loading' || status === 'success'}
          />
        </div>

        {status === 'error' && <p className="text-sm text-destructive">{errorMessage}</p>}

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onPrevious} disabled={status === 'loading'}>
            Back
          </Button>
          <Button onClick={handleSaveApiKey} className="w-full" disabled={status !== 'idle'}>
            {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'success' && <CheckCircle className="mr-2 h-4 w-4" />}
            {status === 'success' ? 'Saved!' : 'Save and Continue'}
          </Button>
        </div>

        <GeminiApiKeyGuide />
      </div>
    </OnboardingLayout>
  )
}

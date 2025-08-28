import { Info, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '../ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { ApiConfig } from '../../lib/types'

interface APITabProps {
  apiConfig: ApiConfig
  setApiConfig: (config: ApiConfig | ((prev: ApiConfig) => ApiConfig)) => void
}

export function APITab({ apiConfig, setApiConfig }: APITabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Gemini AI Configuration
          </CardTitle>
          <CardDescription>
            Configure Gemini API for conversation analysis and question generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Gemini API enables:</strong> Automatic question generation from audio
              segments, conversation analysis, and interactive practice sessions. Get your API
              key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
              .
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="gemini-api-key">Gemini API Key</Label>
            <Input
              id="gemini-api-key"
              type="password"
              value={apiConfig.gemini?.apiKey || ''}
              onChange={e =>
                setApiConfig(prev => ({
                  ...prev,
                  gemini: {
                    ...prev.gemini,
                    apiKey: e.target.value || undefined
                  }
                }))
              }
              placeholder="Enter your Gemini API key"
            />
            <p className="text-sm text-muted-foreground">
              Required for AI-powered question generation and conversation analysis
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-model">Model</Label>
            <Select
              value={apiConfig.gemini?.model || 'gemini-2.5-flash-lite'}
              onValueChange={value =>
                setApiConfig(prev => ({
                  ...prev,
                  gemini: {
                    ...prev.gemini,
                    model: value
                  }
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</SelectItem>
                <SelectItem value="gemini-2.5-flash-live">Gemini 2.5 Flash Live</SelectItem>
                <SelectItem value="gemini-2.5-flash-native-audio">
                  Gemini 2.5 Flash Native Audio
                </SelectItem>
                <SelectItem value="gemini-2.5-flash-preview-text-to-speech">
                  Gemini 2.5 Flash Preview Text-to-Speech
                </SelectItem>
                <SelectItem value="gemini-2.5-pro-preview-text-to-speech">
                  Gemini 2.5 Pro Preview Text-to-Speech
                </SelectItem>
                <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                <SelectItem value="gemini-2.0-flash-preview-image-generation">
                  Gemini 2.0 Flash Preview Image Generation
                </SelectItem>
                <SelectItem value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</SelectItem>
                <SelectItem value="gemini-2.0-flash-live">Gemini 2.0 Flash Live</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</SelectItem>
                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Gemini 2.0 Flash supports native audio processing (recommended)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-base-url">Base URL (Optional)</Label>
            <Input
              id="gemini-base-url"
              type="url"
              value={apiConfig.gemini?.baseURL || ''}
              onChange={e =>
                setApiConfig(prev => ({
                  ...prev,
                  gemini: {
                    ...prev.gemini,
                    baseURL: e.target.value || undefined
                  }
                }))
              }
              placeholder="https://generativelanguage.googleapis.com/v1beta"
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to use default Google API endpoint
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`h-2 w-2 rounded-full ${apiConfig.gemini?.apiKey ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
              <span>
                {apiConfig.gemini?.apiKey
                  ? 'Gemini API configured'
                  : 'Gemini API not configured'}
              </span>
            </div>

            {apiConfig.gemini?.apiKey && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <strong>✓ Enabled Features:</strong>
                </p>
                <ul className="list-inside list-disc space-y-1 pl-4">
                  <li>Automatic question generation from audio loops</li>
                  <li>Interactive practice sessions with scoring</li>
                  <li>Conversation comprehension analysis</li>
                  <li>Multi-choice question practice</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
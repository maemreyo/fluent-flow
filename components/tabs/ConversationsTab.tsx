import { useState } from 'react'
import { Monitor, Repeat, Settings, Target } from 'lucide-react'
import type { ConversationLoopIntegrationService } from '../../lib/services/conversation-loop-integration-service'
import type { ConversationQuestions, SavedLoop } from '../../lib/types/fluent-flow-types'
import { ConversationQuestionsPanel } from '../conversation-questions-panel'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface ConversationsTabProps {
  integrationService: ConversationLoopIntegrationService | null
  activeQuestions: ConversationQuestions | null
  activeQuestionLoop: SavedLoop | null
  geminiConfigured: boolean
  onSetActiveTab: (tab: string) => void
  onSetActiveQuestions: (questions: ConversationQuestions | null) => void
  onSetActiveQuestionLoop: (loop: SavedLoop | null) => void
}

export function ConversationsTab({
  integrationService,
  activeQuestions,
  activeQuestionLoop,
  geminiConfigured,
  onSetActiveTab,
  onSetActiveQuestions,
  onSetActiveQuestionLoop
}: ConversationsTabProps) {
  const [showStoragePanel, setShowStoragePanel] = useState(false)
  const [overlayMode, setOverlayMode] = useState(false)

  const handleOverlayToggle = async () => {
    if (!activeQuestions) return

    const newMode = !overlayMode
    setOverlayMode(newMode)

    try {
      if (newMode) {
        // Send questions to overlay on YouTube tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const activeTab = tabs[0]

        if (activeTab && activeTab.url?.includes('youtube.com/watch')) {
          await chrome.tabs.sendMessage(activeTab.id!, {
            type: 'SHOW_QUESTION_OVERLAY',
            questions: activeQuestions
          })
          console.log('FluentFlow: Questions sent to overlay')
        } else {
          console.log('FluentFlow: No YouTube tab found for overlay')
          setOverlayMode(false) // Reset if no YouTube tab
        }
      } else {
        // Hide overlay and show in sidepanel
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const activeTab = tabs[0]

        if (activeTab && activeTab.url?.includes('youtube.com/watch')) {
          await chrome.tabs.sendMessage(activeTab.id!, {
            type: 'HIDE_QUESTION_OVERLAY'
          })
        }
      }
    } catch (error) {
      console.error('FluentFlow: Failed to toggle overlay mode:', error)
      setOverlayMode(!newMode) // Reset on error
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                AI Conversation Practice
              </CardTitle>
              <CardDescription>
                Create loops with audio and generate practice questions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStoragePanel(!showStoragePanel)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Storage
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Gemini Configuration Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${geminiConfigured ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-sm font-medium">
                {geminiConfigured ? 'Gemini API Configured' : 'Gemini API Not Configured'}
              </span>
            </div>
            {!geminiConfigured && (
              <Button variant="outline" size="sm" onClick={() => chrome.runtime.openOptionsPage()}>
                Configure API
              </Button>
            )}
          </div>

          {geminiConfigured && integrationService && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>✅ Audio capture enabled</p>
              <p>✅ Question generation ready</p>
              <p>✅ Storage management active</p>
            </div>
          )}

          {!geminiConfigured && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>Configure your Gemini API key in Options → API tab to enable:</p>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Audio-powered question generation</li>
                <li>Interactive practice sessions</li>
                <li>Automatic storage cleanup</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Management Panel */}
      {showStoragePanel && integrationService && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Storage Management</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowStoragePanel(false)}>
                ✕
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Display Mode Toggle */}
      {activeQuestions && activeQuestionLoop && geminiConfigured && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Question Display Mode</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={!overlayMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => overlayMode && handleOverlayToggle()}
                  disabled={!overlayMode}
                >
                  Sidepanel
                </Button>
                <Button
                  variant={overlayMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleOverlayToggle}
                  className="flex items-center gap-1"
                >
                  <Monitor className="h-3 w-3" />
                  Overlay
                </Button>
              </div>
            </div>
            <CardDescription className="text-sm">
              {overlayMode
                ? 'Questions are displayed on the YouTube tab (perfect for screen sharing)'
                : 'Questions are displayed here in the sidepanel'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Active Questions Panel */}
      {activeQuestions && activeQuestionLoop && geminiConfigured && !overlayMode && (
        <ConversationQuestionsPanel
          questions={activeQuestions}
          loop={activeQuestionLoop}
          onComplete={(results, score) => {
            console.log('Practice session completed:', { results, score })
            onSetActiveQuestions(null)
            onSetActiveQuestionLoop(null)
            setOverlayMode(false)
          }}
          onClose={() => {
            onSetActiveQuestions(null)
            onSetActiveQuestionLoop(null)
            setOverlayMode(false)
          }}
        />
      )}

      {/* Integration Instructions */}
      {!geminiConfigured && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <CardTitle className="mb-2 text-lg">Ready to Practice Conversations?</CardTitle>
            <CardDescription className="mb-6 max-w-md">
              Configure your Gemini API key to unlock conversation analysis and question generation.
            </CardDescription>

            <div className="max-w-lg space-y-3 text-left text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Badge className="mt-0.5">1</Badge>
                <span>Create loops on YouTube videos with audio capture enabled</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="mt-0.5">2</Badge>
                <span>AI analyzes audio and generates 10 practice questions</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="mt-0.5">3</Badge>
                <span>Interactive quiz with scoring and detailed feedback</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="mt-0.5">4</Badge>
                <span>Automatic storage cleanup and retention management</span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                onClick={() => chrome.runtime.openOptionsPage()}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configure Gemini API
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Summary for Configured Users */}
      {geminiConfigured && !activeQuestions && !showStoragePanel && (
        <Card>
          <CardContent className="py-8 text-center">
            <CardTitle className="mb-4 text-lg">🎉 Conversation Practice Ready!</CardTitle>
            <CardDescription className="mb-6">
              Go to the Loops tab to create conversation loops with audio capture, then return here
              to see generated practice questions.
            </CardDescription>

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => onSetActiveTab('loops')}>
                <Repeat className="mr-2 h-4 w-4" />
                Create Loops
              </Button>
              <Button variant="outline" onClick={() => setShowStoragePanel(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Storage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

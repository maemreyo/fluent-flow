import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  FileAudio,
  Loader2,
  Mic,
  Music,
  RefreshCw,
  Repeat,
  Search,
  Settings,
  Target,
  User,
  UserX
} from 'lucide-react'
import { AudioPlayer } from './components/audio-player'
import { ConversationQuestionsPanel } from './components/conversation-questions-panel'
import { EnhancedLoopCardWithIntegration } from './components/enhanced-loop-card-with-integration'
import { StorageManagementPanel } from './components/storage-management-panel'
import { QueryProvider } from './components/providers/query-provider'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { ConversationLoopIntegrationService } from './lib/services/conversation-loop-integration-service'
import { useFluentFlowSupabaseStore as useFluentFlowStore, getFluentFlowStore } from './lib/stores/fluent-flow-supabase-store'
import { useLoopsQuery } from './lib/hooks/use-loop-query'
import { getCurrentUser } from './lib/supabase/client'
import type { SavedLoop, ConversationQuestions } from './lib/types/fluent-flow-types'
import './styles/react-h5-audio-player.css'
import './styles/sidepanel.css'

function FluentFlowSidePanelContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loops' | 'recordings' | 'conversations'>('dashboard')
  const [applyingLoopId, setApplyingLoopId] = useState<string | null>(null)
  const [savedRecordings, setSavedRecordings] = useState<any[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loopFilter, setLoopFilter] = useState('')
  const [deletingAllLoops, setDeletingAllLoops] = useState(false)

  // Use React Query for loops instead of manual state management
  const { 
    data: savedLoops = [], 
    isLoading: loadingLoops, 
    error: loopsError,
    refetch: refetchLoops 
  } = useLoopsQuery()
  
  // Conversation loop integration state
  const [integrationService, setIntegrationService] = useState<ConversationLoopIntegrationService | null>(null)
  const [activeQuestions, setActiveQuestions] = useState<ConversationQuestions | null>(null)
  const [activeQuestionLoop, setActiveQuestionLoop] = useState<SavedLoop | null>(null)
  const [showStoragePanel, setShowStoragePanel] = useState(false)
  const [geminiConfigured, setGeminiConfigured] = useState(false)

  const {
    allSessions,
    statistics,
    currentSession,
    currentVideo,
    deleteLoop: deleteLoopFromStore,
    deleteAllUserLoops: deleteAllLoopsFromStore,
    getAllUserRecordings,
    deleteUserRecording
  } = useFluentFlowStore()

  // Load saved recordings and initialize on component mount  
  useEffect(() => {
    checkAuthStatus()
    loadSavedRecordings()
    initializeIntegration()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setCheckingAuth(false)
    }
  }

  const initializeIntegration = async () => {
    try {
      let geminiConfig = null
      
      try {
        // First try to get config from Supabase
        const { supabaseService } = getFluentFlowStore()
        const apiConfig = await supabaseService.getApiConfig()
        geminiConfig = apiConfig?.gemini
        console.log('FluentFlow: Loaded Gemini config from Supabase:', !!geminiConfig?.apiKey)
      } catch (supabaseError) {
        console.log('FluentFlow: Failed to load from Supabase, trying Chrome storage:', supabaseError)
        
        // Fallback to Chrome storage
        try {
          const response = await chrome.runtime.sendMessage({
            type: "STORAGE_OPERATION",
            operation: "get",
            key: "api_config"
          })
          geminiConfig = response.data?.gemini
          console.log('FluentFlow: Loaded Gemini config from Chrome storage:', !!geminiConfig?.apiKey)
        } catch (chromeError) {
          console.log('FluentFlow: Failed to load from Chrome storage:', chromeError)
        }
      }
      
      if (geminiConfig?.apiKey) {
        console.log('FluentFlow: Initializing conversation loop integration')
        const service = new ConversationLoopIntegrationService(
          useFluentFlowStore.getState(), // storage service
          geminiConfig
        )
        setIntegrationService(service)
        setGeminiConfigured(true)
        console.log('FluentFlow: Conversation loop integration ready')
      } else {
        console.log('FluentFlow: Gemini API not configured')
        setGeminiConfigured(false)
      }
    } catch (error) {
      console.error('Failed to initialize conversation integration:', error)
      setGeminiConfigured(false)
    }
  }


  const loadSavedRecordings = async () => {
    setLoadingRecordings(true)
    try {
      // Use Supabase store instead of chrome.runtime.sendMessage
      const recordings = await getAllUserRecordings()
      setSavedRecordings(recordings)
    } catch (error) {
      console.error('Error loading recordings:', error)
    } finally {
      setLoadingRecordings(false)
    }
  }
  // Utility function to convert Base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const deleteLoop = async (loopId: string) => {
    try {
      // Use Supabase store instead of chrome.runtime.sendMessage
      const success = await deleteLoopFromStore(loopId)

      if (success) {
        // React Query will automatically refetch the loops data
        refetchLoops()
      } else {
        console.error('Failed to delete loop: Loop not found or user not authenticated')
      }
    } catch (error) {
      console.error('Error deleting loop:', error)
    }
  }

  const deleteAllLoops = async () => {
    if (!savedLoops.length) return

    const confirmed = confirm(
      `Are you sure you want to delete all ${savedLoops.length} loops? This action cannot be undone.`
    )
    if (!confirmed) return

    setDeletingAllLoops(true)
    try {
      const success = await deleteAllLoopsFromStore()

      if (success) {
        // React Query will automatically refetch the loops data
        refetchLoops()
        console.log('All loops deleted successfully')
      } else {
        console.error('Failed to delete all loops: User not authenticated or no loops found')
      }
    } catch (error) {
      console.error('Error deleting all loops:', error)
    } finally {
      setDeletingAllLoops(false)
    }
  }

  const applyLoop = async (loop: SavedLoop) => {
    setApplyingLoopId(loop.id)

    try {
      // Check if we need to navigate to the video
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]

      if (currentTab && currentTab.url && currentTab.url.includes(loop.videoId)) {
        // Same video - apply directly
        chrome.tabs.sendMessage(currentTab.id!, {
          type: 'APPLY_LOOP',
          data: loop,
          isApplyingLoop: true
        })
        setApplyingLoopId(null) // Clear immediately for same tab
      } else {
        // Different video - open new tab and apply with proper waiting
        const newTab = await chrome.tabs.create({ url: loop.videoUrl })

        // Wait for tab to load then apply loop with retry mechanism
        const applyWithRetry = async (attempts = 0) => {
          if (attempts > 10) {
            console.error('FluentFlow: Failed to apply loop after multiple attempts')
            setApplyingLoopId(null)
            return
          }

          try {
            await chrome.tabs.sendMessage(newTab.id!, {
              type: 'APPLY_LOOP',
              data: loop,
              isApplyingLoop: true
            })
            setApplyingLoopId(null)
          } catch (error) {
            setTimeout(() => applyWithRetry(attempts + 1), 2000)
          }
        }

        // Start applying after initial delay
        setTimeout(() => applyWithRetry(), 4000)
      }
    } catch (error) {
      console.error('Error applying loop:', error)
      setApplyingLoopId(null)
    }
  }

  const exportLoop = async (loop: SavedLoop) => {
    try {
      const data = JSON.stringify(loop, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `fluent-flow-loop-${loop.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export loop:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const deleteRecording = async (recordingId: string) => {
    try {
      // Use Supabase store instead of chrome.runtime.sendMessage
      const success = await deleteUserRecording(recordingId)

      if (success) {
        setSavedRecordings(recordings => recordings.filter(rec => rec.id !== recordingId))
      } else {
        console.error('Failed to delete recording: Recording not found or user not authenticated')
      }
    } catch (error) {
      console.error('Error deleting recording:', error)
    }
  }

  const exportRecording = async (recording: any) => {
    try {
      // Convert Base64 to Blob for export
      if (!recording.audioDataBase64) {
        throw new Error('No audio data available for export')
      }

      const audioBlob = base64ToBlob(recording.audioDataBase64, 'audio/webm')
      const audioURL = URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.href = audioURL
      a.download = `fluent-flow-recording-${recording.id}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(audioURL)
    } catch (error) {
      console.error('Failed to export recording:', error)
    }
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {currentVideo && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
              <CardTitle className="text-sm">Currently Practicing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium">{currentVideo.title}</p>
              <p className="text-xs text-muted-foreground">{currentVideo.channel}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <CardDescription className="text-xs">Total Sessions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{statistics.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <CardDescription className="text-xs">Practice Time</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatTime(statistics.totalPracticeTime)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-purple-500" />
              <CardDescription className="text-xs">Recordings</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{statistics.totalRecordings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              <CardDescription className="text-xs">Avg Session</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatTime(statistics.averageSessionDuration)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Recent Practice Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allSessions.slice(0, 5).map(session => (
            <div
              key={session.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                currentSession?.id === session.id ? 'border-blue-200 bg-blue-50' : ''
              }`}
              onClick={() => {}}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session.videoTitle}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(session.createdAt)}</span>
                  <span>•</span>
                  <span>{session.segments.length} segments</span>
                  <span>•</span>
                  <span>{session.recordings.length} recordings</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formatTime(session.totalPracticeTime)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => setActiveTab('recordings')}
          >
            <FileAudio className="mr-2 h-4 w-4" />
            View All Recordings
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            View Analytics & Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderConversations = () => (
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
                Create loops with audio and generate AI-powered practice questions
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
              <div className={`h-2 w-2 rounded-full ${geminiConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {geminiConfigured ? 'Gemini API Configured' : 'Gemini API Not Configured'}
              </span>
            </div>
            {!geminiConfigured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => chrome.runtime.openOptionsPage()}
              >
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
              <ul className="mt-2 ml-4 list-disc space-y-1">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStoragePanel(false)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <StorageManagementPanel
              onGetStorageStats={() => integrationService.getStorageStats()}
              onCleanupNow={() => integrationService.runStorageCleanup()}
              onEmergencyCleanup={() => integrationService.emergencyCleanup()}
              onGetScheduledCleanups={() => integrationService.getScheduledCleanups()}
              onBulkSetRetentionPolicy={(loopIds, policy) => integrationService.bulkUpdateRetentionPolicies(loopIds, policy)}
            />
          </CardContent>
        </Card>
      )}

      {/* Active Questions Panel */}
      {activeQuestions && activeQuestionLoop && geminiConfigured && (
        <ConversationQuestionsPanel
          questions={activeQuestions}
          loop={activeQuestionLoop}
          onComplete={(results, score) => {
            console.log('Practice session completed:', { results, score })
            setActiveQuestions(null)
            setActiveQuestionLoop(null)
          }}
          onClose={() => {
            setActiveQuestions(null)
            setActiveQuestionLoop(null)
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
              Configure your Gemini API key to unlock AI-powered conversation analysis and question generation.
            </CardDescription>
            
            <div className="space-y-3 text-left text-sm text-muted-foreground max-w-lg">
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
              Go to the Loops tab to create conversation loops with audio capture, then return here to see generated practice questions.
            </CardDescription>
            
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveTab('loops')}
              >
                <Repeat className="mr-2 h-4 w-4" />
                Create Loops
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowStoragePanel(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Storage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderRecordings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                Recording Library
              </CardTitle>
              <CardDescription>{savedRecordings.length} saved recordings</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSavedRecordings}
              disabled={loadingRecordings}
            >
              {loadingRecordings ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {loadingRecordings ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {loadingRecordings && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading recordings...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!loadingRecordings && savedRecordings.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No recordings saved yet</CardTitle>
              <CardDescription>
                Record audio on YouTube videos to save them here for practice
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingRecordings &&
          savedRecordings.map(recording => (
            <div key={recording.id}>
              <AudioPlayer
                recording={recording}
                onDelete={deleteRecording}
                onExport={exportRecording}
                base64ToBlob={base64ToBlob}
              />
            </div>
          ))}
      </div>
    </div>
  )

  // Filter loops based on search query
  const filteredLoops = savedLoops.filter(
    loop =>
      loopFilter === '' ||
      loop.title.toLowerCase().includes(loopFilter.toLowerCase()) ||
      loop.videoTitle.toLowerCase().includes(loopFilter.toLowerCase()) ||
      loop.description?.toLowerCase().includes(loopFilter.toLowerCase())
  )

  const renderLoops = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>
                {filteredLoops.length} of {savedLoops.length} loops
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchLoops()} disabled={loadingLoops}>
                {loadingLoops ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {loadingLoops ? 'Loading...' : 'Refresh'}
              </Button>
              {savedLoops.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteAllLoops}
                  disabled={deletingAllLoops || loadingLoops}
                >
                  {deletingAllLoops ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="mr-2 h-4 w-4" />
                  )}
                  {deletingAllLoops ? 'Deleting...' : 'Delete All'}
                </Button>
              )}
            </div>
          </div>
          {/* Search/Filter Input */}
          {savedLoops.length > 0 && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search loops by title, video, or description..."
                value={loopFilter}
                onChange={e => setLoopFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="flex-1 space-y-4 pr-1">
        {loadingLoops && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading loops...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!loadingLoops && savedLoops.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Repeat className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No loops saved yet</CardTitle>
              <CardDescription>
                Create loops on YouTube videos to save them here for later use
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingLoops && savedLoops.length > 0 && filteredLoops.length === 0 && loopFilter && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No loops found</CardTitle>
              <CardDescription>
                No loops match your search criteria. Try different keywords.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingLoops &&
          filteredLoops.map(loop => (
            <EnhancedLoopCardWithIntegration
              key={loop.id}
              loop={loop}
              integrationService={integrationService}
              onApply={() => applyLoop(loop)}
              onDelete={(loopId) => deleteLoop(loopId)}
              onExport={() => exportLoop(loop)}
              isApplying={applyingLoopId === loop.id}
            />
          ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col bg-background">
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">FluentFlow</h1>
            <p className="text-sm text-muted-foreground">YouTube Language Learning</p>
          </div>
          <div className="flex items-center gap-2">
            {checkingAuth ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <div className="flex items-center gap-2 text-green-600">
                <User className="h-4 w-4" />
                <span className="text-xs">Synced</span>
              </div>
            ) : (
              <div
                className="flex cursor-pointer items-center gap-2 text-orange-600 hover:text-orange-700"
                onClick={() => chrome.runtime.openOptionsPage()}
                title="Click to sign in for cloud sync"
              >
                <UserX className="h-4 w-4" />
                <span className="text-xs">Sign in</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as any)}
        className="flex flex-1 flex-col"
      >
        <TabsList className="m-4 grid w-full flex-shrink-0 grid-cols-4">
          <TabsTrigger value="dashboard" className="text-xs">
            <BarChart3 className="mr-1 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="loops" className="text-xs">
            <Repeat className="mr-1 h-4 w-4" />
            Loop
          </TabsTrigger>
          <TabsTrigger value="conversations" className="text-xs">
            <Target className="mr-1 h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="recordings" className="text-xs">
            <Music className="mr-1 h-4 w-4" />
            Records
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 px-4 pb-4">
          <TabsContent value="dashboard" className="mt-0 h-full">
            {renderDashboard()}
          </TabsContent>
          <TabsContent value="loops" className="mt-0 h-full">
            {renderLoops()}
          </TabsContent>
          <TabsContent value="conversations" className="mt-0 h-full">
            {renderConversations()}
          </TabsContent>
          <TabsContent value="recordings" className="mt-0 h-full">
            {renderRecordings()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default function FluentFlowSidePanel() {
  return (
    <QueryProvider>
      <FluentFlowSidePanelContent />
    </QueryProvider>
  )
}

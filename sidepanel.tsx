import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  FileAudio,
  Loader2,
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
import { Dashboard } from './components/dashboard'
import { EnhancedLoopCardWithIntegration } from './components/enhanced-loop-card-with-integration'
import { QueryProvider } from './components/providers/query-provider'
import { StorageManagementPanel } from './components/storage-management-panel'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { useLoopsQuery } from './lib/hooks/use-loop-query'
import { ConversationLoopIntegrationService } from './lib/services/conversation-loop-integration-service'
import {
  getFluentFlowStore,
  useFluentFlowSupabaseStore as useFluentFlowStore
} from './lib/stores/fluent-flow-supabase-store'
import { getCurrentUser } from './lib/supabase/client'
import type { ConversationQuestions, SavedLoop } from './lib/types/fluent-flow-types'
import './styles/react-h5-audio-player.css'
import './styles/sidepanel.css'

function FluentFlowSidePanelContent() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'loops' | 'recordings' | 'conversations'
  >('dashboard')
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
  const [integrationService, setIntegrationService] =
    useState<ConversationLoopIntegrationService | null>(null)
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
    initializeVideoInformation()
    const messageCleanup = setupMessageHandlers()
    const videoTrackingCleanup = setupVideoTracking()
    
    // Cleanup function
    return () => {
      messageCleanup()
      videoTrackingCleanup()
    }
  }, [])

  // Setup video tracking for tab changes and navigation
  const setupVideoTracking = () => {
    let currentTabId: number | null = null
    let trackingInterval: NodeJS.Timeout | null = null

    // Track active tab changes
    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      currentTabId = activeInfo.tabId
      await updateVideoInformation()
    }

    // Track tab updates (URL changes within same tab)
    const handleTabUpdated = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url && tabId === currentTabId) {
        await updateVideoInformation()
      }
    }

    // Periodic check for video changes (fallback for SPA navigation)
    const startPeriodicCheck = () => {
      trackingInterval = setInterval(async () => {
        await updateVideoInformation()
      }, 2000) // Check every 2 seconds
    }

    // Setup Chrome API listeners
    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)
    
    // Start periodic checking
    startPeriodicCheck()

    // Cleanup function
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
      if (trackingInterval) {
        clearInterval(trackingInterval)
      }
    }
  }

  // Update video information (reusable function)
  const updateVideoInformation = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]
      
      if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, {
            type: 'GET_VIDEO_INFO'
          })
          
          if (response?.success && response.videoInfo) {
            const { currentVideo: currentStoreVideo, initializePlayer } = useFluentFlowStore.getState()
            
            // Only update if video actually changed
            if (!currentStoreVideo || currentStoreVideo.videoId !== response.videoInfo.videoId) {
              initializePlayer(response.videoInfo)
              console.log('FluentFlow: Video updated in sidepanel:', response.videoInfo)
            }
          }
        } catch (error) {
          // Content script not available or no response - clear current video
          const { currentVideo: currentStoreVideo, updatePlayerState } = useFluentFlowStore.getState()
          if (currentStoreVideo) {
            // Clear current video if we can't get info anymore
            updatePlayerState({ isReady: false })
            console.log('FluentFlow: Content script not available - video info may be stale')
          }
        }
      } else {
        // Not on YouTube - clear current video
        const { currentVideo: currentStoreVideo } = useFluentFlowStore.getState()
        if (currentStoreVideo) {
          // Use store's setState to clear currentVideo
          useFluentFlowStore.setState({ 
            currentVideo: null,
            playerState: { ...useFluentFlowStore.getState().playerState, isReady: false }
          })
          console.log('FluentFlow: Cleared video info - not on YouTube')
        }
      }
    } catch (error) {
      console.error('FluentFlow: Failed to update video information:', error)
    }
  }

  // Initialize video information from active tab
  const initializeVideoInformation = async () => {
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]
      
      if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
        // Send message to content script to get video information
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, {
            type: 'GET_VIDEO_INFO'
          })
          
          if (response?.success && response.videoInfo) {
            // Initialize the store with video information
            const { initializePlayer } = useFluentFlowStore.getState()
            initializePlayer(response.videoInfo)
            console.log('FluentFlow: Video information initialized in sidepanel:', response.videoInfo)
          }
        } catch (error) {
          console.log('FluentFlow: Content script not available or no video info:', error)
        }
      }
    } catch (error) {
      console.error('FluentFlow: Failed to initialize video information:', error)
    }
  }

  // Setup message handlers for receiving data from content script
  const setupMessageHandlers = () => {
    const messageHandler = (message: any) => {
      switch (message.type) {
        case 'OPEN_SIDE_PANEL':
          // Handle video info and notes from content script
          if (message.videoInfo) {
            const { initializePlayer } = useFluentFlowStore.getState()
            initializePlayer(message.videoInfo)
            console.log('FluentFlow: Updated video information from content script')
          }
          break
        case 'SIDEPANEL_DATA':
          // Handle any additional data from background script
          console.log('FluentFlow: Received sidepanel data:', message)
          break
        default:
          break
      }
    }

    chrome.runtime.onMessage.addListener(messageHandler)
    
    // Cleanup function
    return () => {
      chrome.runtime.onMessage.removeListener(messageHandler)
    }
  }

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
        console.log(
          'FluentFlow: Failed to load from Supabase, trying Chrome storage:',
          supabaseError
        )

        // Fallback to Chrome storage
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'STORAGE_OPERATION',
            operation: 'get',
            key: 'api_config'
          })
          geminiConfig = response.data?.gemini
          console.log(
            'FluentFlow: Loaded Gemini config from Chrome storage:',
            !!geminiConfig?.apiKey
          )
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

  // Compute real statistics from session data
  const computeRealStatistics = () => {
    if (!allSessions || allSessions.length === 0) {
      return statistics // Return default statistics if no sessions
    }

    const totalSessions = allSessions.length
    const totalRecordings = allSessions.reduce((acc, session) => acc + session.recordings.length, 0)
    const totalPracticeTime = allSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0)
    const avgSessionTime = totalSessions > 0 ? totalPracticeTime / totalSessions : 0

    return {
      ...statistics,
      totalSessions,
      totalRecordings,
      totalPracticeTime,
      avgSessionTime
    }
  }

  // Get computed statistics
  const realStatistics = computeRealStatistics()

  // Analytics calculations for time-based trends
  const calculateAnalytics = () => {
    if (!allSessions || allSessions.length === 0) {
      return {
        weeklyTrend: [],
        monthlyTrend: [],
        dailyAverages: { thisWeek: 0, lastWeek: 0, thisMonth: 0 },
        practiceStreak: 0,
        mostActiveDay: null,
        improvementRate: 0
      }
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Weekly trend (last 7 days)
    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      
      const daySessions = allSessions.filter(session => 
        session.createdAt >= dayStart && session.createdAt < dayEnd
      )
      
      return {
        date: dayStart,
        sessions: daySessions.length,
        practiceTime: daySessions.reduce((acc, session) => acc + session.totalPracticeTime, 0),
        recordings: daySessions.reduce((acc, session) => acc + session.recordings.length, 0)
      }
    }).reverse()

    // Monthly trend (last 30 days by week)
    const monthlyTrend = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const weekSessions = allSessions.filter(session => 
        session.createdAt >= weekStart && session.createdAt < weekEnd
      )
      
      return {
        weekStart,
        sessions: weekSessions.length,
        practiceTime: weekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0),
        recordings: weekSessions.reduce((acc, session) => acc + session.recordings.length, 0)
      }
    }).reverse()

    // Daily averages
    const thisWeekSessions = allSessions.filter(session => session.createdAt >= oneWeekAgo)
    const lastWeekSessions = allSessions.filter(session => 
      session.createdAt >= twoWeeksAgo && session.createdAt < oneWeekAgo
    )
    const thisMonthSessions = allSessions.filter(session => session.createdAt >= oneMonthAgo)

    const dailyAverages = {
      thisWeek: thisWeekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0) / 7,
      lastWeek: lastWeekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0) / 7,
      thisMonth: thisMonthSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0) / 30
    }

    // Practice streak (consecutive days with sessions)
    let practiceStreak = 0
    for (let i = 0; i < 365; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      
      const hasSession = allSessions.some(session => 
        session.createdAt >= dayStart && session.createdAt < dayEnd
      )
      
      if (hasSession) {
        practiceStreak++
      } else {
        break
      }
    }

    // Most active day of week
    const dayActivity = Array.from({ length: 7 }, () => 0)
    allSessions.forEach(session => {
      const dayOfWeek = session.createdAt.getDay()
      dayActivity[dayOfWeek] += session.totalPracticeTime
    })
    const mostActiveDay = dayActivity.indexOf(Math.max(...dayActivity))

    // Improvement rate (this week vs last week)
    const thisWeekTime = thisWeekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0)
    const lastWeekTime = lastWeekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0)
    const improvementRate = lastWeekTime > 0 ? ((thisWeekTime - lastWeekTime) / lastWeekTime) * 100 : 0

    return {
      weeklyTrend,
      monthlyTrend,
      dailyAverages,
      practiceStreak,
      mostActiveDay,
      improvementRate
    }
  }

  // Get computed analytics
  const analytics = calculateAnalytics()

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
    <Dashboard
      currentVideo={currentVideo}
      statistics={realStatistics}
      allSessions={allSessions}
      currentSession={currentSession}
      savedLoops={savedLoops}
      analytics={analytics}
      formatTime={formatTime}
      formatDate={formatDate}
      onViewLoops={() => setActiveTab('loops')}
    />
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
          <CardContent>
            <StorageManagementPanel
              onGetStorageStats={() => integrationService.getStorageStats()}
              onCleanupNow={() => integrationService.runStorageCleanup()}
              onEmergencyCleanup={() => integrationService.emergencyCleanup()}
              onGetScheduledCleanups={() => integrationService.getScheduledCleanups()}
              onBulkSetRetentionPolicy={(loopIds, policy) =>
                integrationService.bulkUpdateRetentionPolicies(loopIds, policy)
              }
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
              Configure your Gemini API key to unlock AI-powered conversation analysis and question
              generation.
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
              <Button variant="outline" onClick={() => setActiveTab('loops')}>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLoops()}
                disabled={loadingLoops}
              >
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

      <div
        className="flex-1 space-y-4 overflow-y-scroll pr-1"
        style={{ height: `calc(100vh - 222px)` }}
      >
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
              onDelete={loopId => deleteLoop(loopId)}
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
        <TabsList className="m-4 grid w-full flex-shrink-0 grid-cols-2">
          <TabsTrigger value="dashboard" className="text-xs">
            <BarChart3 className="mr-1 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="loops" className="text-xs">
            <Repeat className="mr-1 h-4 w-4" />
            Loops
          </TabsTrigger>
          {/* TODO: Re-enable these tabs when ready to implement */}
          {/* <TabsTrigger value="conversations" className="text-xs">
            <Target className="mr-1 h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="recordings" className="text-xs">
            <Music className="mr-1 h-4 w-4" />
            Records
          </TabsTrigger> */}
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <TabsContent value="dashboard" className="mt-0 h-full overflow-y-auto">
            {renderDashboard()}
          </TabsContent>
          <TabsContent value="loops" className="mt-0 h-full overflow-y-auto">
            {renderLoops()}
          </TabsContent>
          <TabsContent value="conversations" className="mt-0 h-full overflow-y-auto">
            {renderConversations()}
          </TabsContent>
          <TabsContent value="recordings" className="mt-0 h-full overflow-y-auto">
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

import { useEffect, useState } from 'react'
import { QueryProvider } from './components/providers/query-provider'
import { AuthStatus } from './components/shared/AuthStatus'
import { LoopsTab } from './components/tabs/LoopsTab'
import { Tabs, TabsContent } from './components/ui/tabs'
import { useAuthentication } from './lib/hooks/use-authentication'
import { useLoopsQuery } from './lib/hooks/use-loop-query'
import { useVideoTracking } from './lib/hooks/use-video-tracking'
import { ConversationLoopIntegrationService } from './lib/services/conversation-loop-integration-service'
import {
  getFluentFlowStore,
  useFluentFlowSupabaseStore as useFluentFlowStore
} from './lib/stores/fluent-flow-supabase-store'
import type { ConversationQuestions, SavedLoop } from './lib/types/fluent-flow-types'
import './styles/sidepanel.css'

function FluentFlowSidePanelContent() {
  const [activeTab, setActiveTab] = useState<'loops'>(
    'loops'
  )
  const [applyingLoopId, setApplyingLoopId] = useState<string | null>(null)
  const [deletingAllLoops, setDeletingAllLoops] = useState(false)

  // Use React Query for loops instead of manual state management
  const { data: savedLoops = [], isLoading: loadingLoops, refetch: refetchLoops } = useLoopsQuery()

  // Conversation loop integration state
  const [integrationService, setIntegrationService] =
    useState<ConversationLoopIntegrationService | null>(null)
  const [_activeQuestions, _setActiveQuestions] = useState<ConversationQuestions | null>(null)
  const [_activeQuestionLoop, _setActiveQuestionLoop] = useState<SavedLoop | null>(null)
  const [_geminiConfigured, setGeminiConfigured] = useState(false)

  const {
    currentSession,
    currentVideo,
    deleteLoop: deleteLoopFromStore,
    deleteAllUserLoops: deleteAllLoopsFromStore
  } = useFluentFlowStore()

  // Custom hooks for extracted functionality
  const { user, checkingAuth, signOut } = useAuthentication()
  useVideoTracking()

  // Sync pending loops from content script when sidepanel opens
  useEffect(() => {
    const syncPendingLoops = async () => {
      if (!user || checkingAuth) return

      try {
        const pendingLoopsKey = 'fluent-flow-pending-loops'
        const pendingLoops = JSON.parse(localStorage.getItem(pendingLoopsKey) || '[]')
        
        if (pendingLoops.length > 0) {
          console.log(`🔄 FluentFlow: Syncing ${pendingLoops.length} pending loops from content script`)
          
          // Save each pending loop to database
          const { supabaseService } = getFluentFlowStore()
          for (const loop of pendingLoops) {
            try {
              await supabaseService.saveLoop(user.id, loop)
              console.log(`✅ FluentFlow: Synced loop: ${loop.title}`)
            } catch (error) {
              console.error(`❌ FluentFlow: Failed to sync loop ${loop.title}:`, error)
            }
          }
          
          // Clear pending loops after successful sync
          localStorage.removeItem(pendingLoopsKey)
          
          // Refetch loops to update UI
          refetchLoops()
          
          console.log(`✅ FluentFlow: Completed syncing ${pendingLoops.length} loops`)
        }
      } catch (error) {
        console.error('❌ FluentFlow: Failed to sync pending loops:', error)
      }
    }

    syncPendingLoops()
  }, [user, checkingAuth, refetchLoops])

  // Initialize integration service
  useEffect(() => {
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

    initializeIntegration()
  }, [])

  // Loop management functions
  const deleteLoop = async (loopId: string) => {
    try {
      const success = await deleteLoopFromStore(loopId)
      if (success) {
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

  const openInApp = async (loop: SavedLoop) => {
    try {
      console.log('🚀 FluentFlow: Opening loop in web app:', loop.id, loop.title)
      
      if (!user) {
        console.error('User not authenticated')
        return
      }

      // Construct URL to NextJS app with loop ID to highlight it
      // The app should detect the highlight parameter and scroll to/highlight that loop
      const appUrl = `https://fluent-flow.vercel.app/groups?highlight=${loop.id}`
      
      // Open in new tab
      window.open(appUrl, '_blank')
      
      console.log('✅ FluentFlow: Loop opened in web app with highlight:', loop.id)
      
    } catch (error) {
      console.error('Failed to open loop in web app:', error)
    }
  }

  return (
    <div className="flex flex-col bg-background">
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">FluentFlow</h1>
            <p className="text-sm text-muted-foreground">Learning via Youtube</p>
          </div>
          <div className="flex items-center gap-2">
            <AuthStatus user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
          </div>
        </div>
      </div>

      {/* Current Playing Status */}
      {currentVideo && (
        <div className="border-b bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentVideo.title}</p>
              <p className="text-xs text-muted-foreground">Currently Playing</p>
            </div>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as any)}
        className="flex flex-1 flex-col mt-6"
      >

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <TabsContent value="loops" className="mt-0 h-full overflow-y-auto">
            <LoopsTab
              savedLoops={savedLoops}
              loadingLoops={loadingLoops}
              integrationService={integrationService}
              onRefetch={refetchLoops}
              onDeleteAll={deleteAllLoops}
              onApplyLoop={applyLoop}
              onDeleteLoop={deleteLoop}
              onExportLoop={exportLoop}
              onOpenInApp={openInApp}
              applyingLoopId={applyingLoopId}
              deletingAllLoops={deletingAllLoops}
            />
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
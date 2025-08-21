import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Download,
  FileAudio,
  Loader2,
  Mic,
  Music,
  Play,
  RefreshCw,
  Repeat,
  Search,
  Target,
  Trash2,
  User,
  UserX
} from 'lucide-react'
import { AudioPlayer } from './components/audio-player'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { useFluentFlowSupabaseStore as useFluentFlowStore } from './lib/stores/fluent-flow-supabase-store'
import { getCurrentUser } from './lib/supabase/client'
import type { SavedLoop } from './lib/types/fluent-flow-types'
import './styles/react-h5-audio-player.css'
import './styles/sidepanel.css'

export default function FluentFlowSidePanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loops' | 'recordings'>('dashboard')
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([])
  const [loadingLoops, setLoadingLoops] = useState(false)
  const [applyingLoopId, setApplyingLoopId] = useState<string | null>(null)
  const [savedRecordings, setSavedRecordings] = useState<any[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loopFilter, setLoopFilter] = useState('')
  const [deletingAllLoops, setDeletingAllLoops] = useState(false)

  const {
    allSessions,
    statistics,
    currentSession,
    currentVideo,
    getAllUserLoops,
    deleteLoop: deleteLoopFromStore,
    deleteAllUserLoops: deleteAllLoopsFromStore,
    getAllUserRecordings,
    deleteUserRecording
  } = useFluentFlowStore()

  // Load saved loops and recordings on component mount
  useEffect(() => {
    checkAuthStatus()
    loadSavedLoops()
    loadSavedRecordings()
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

  const loadSavedLoops = async () => {
    setLoadingLoops(true)
    try {
      // Use Supabase store instead of chrome.runtime.sendMessage
      const loops = await getAllUserLoops()
      setSavedLoops(loops)
    } catch (error) {
      console.error('Error loading loops:', error)
    } finally {
      setLoadingLoops(false)
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
        setSavedLoops(loops => loops.filter(loop => loop.id !== loopId))
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
        setSavedLoops([])
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
              <Button variant="outline" size="sm" onClick={loadSavedLoops} disabled={loadingLoops}>
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
            <Card key={loop.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">{loop.title}</CardTitle>
                    <CardDescription className="text-sm">{loop.videoTitle}</CardDescription>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatTime(loop.startTime)} - {formatTime(loop.endTime)}
                      </span>
                      <span>•</span>
                      <span>Duration: {formatTime(loop.endTime - loop.startTime)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(new Date(loop.createdAt))}
                    </div>
                    {loop.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{loop.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => applyLoop(loop)}
                    disabled={applyingLoopId === loop.id}
                    className="flex-1"
                  >
                    {applyingLoopId === loop.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    {applyingLoopId === loop.id ? 'Applying...' : 'Apply'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportLoop(loop)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteLoop(loop.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
        <TabsList className="m-4 grid w-full flex-shrink-0 grid-cols-3">
          <TabsTrigger value="dashboard" className="text-xs">
            <BarChart3 className="mr-1 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="loops" className="text-xs">
            <Repeat className="mr-1 h-4 w-4" />
            Loop
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
          <TabsContent value="recordings" className="mt-0 h-full">
            {renderRecordings()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

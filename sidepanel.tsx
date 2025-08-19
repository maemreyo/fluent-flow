import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Download,
  Eye,
  FileAudio,
  Headphones,
  Loader2,
  Mic,
  Music,
  Play,
  PlayCircle,
  RefreshCw,
  Repeat,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Volume2
} from "lucide-react"
import { useEffect, useState } from "react"
import { AudioPlayer } from "./components/audio-player"
import { Badge } from "./components/ui/badge"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { useFluentFlowSupabaseStore as useFluentFlowStore } from "./lib/stores/fluent-flow-supabase-store"
import type {
  SavedLoop
} from "./lib/types/fluent-flow-types"

import "./styles/react-h5-audio-player.css"
import "./styles/sidepanel.css"
import globalCssText from "data-text:~styles/globals.css"

export const getStyle = () => {
  const style = document.createElement("style")
  // Replace :root with :host for Shadow DOM compatibility
  style.textContent = globalCssText.replace(/:root/g, ":host")
  return style
}

export default function FluentFlowSidePanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loops' | 'recordings' | 'analytics' | 'settings'>('dashboard')
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([])
  const [loadingLoops, setLoadingLoops] = useState(false)
  const [applyingLoopId, setApplyingLoopId] = useState<string | null>(null)
  const [savedRecordings, setSavedRecordings] = useState<any[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(false)

  const {
    allSessions,
    statistics,
    settings,
    updateSettings,
    currentSession,
    currentVideo
  } = useFluentFlowStore()

  // Load saved loops and recordings on component mount
  useEffect(() => {
    loadSavedLoops()
    loadSavedRecordings()
  }, [])

  const loadSavedLoops = async () => {
    setLoadingLoops(true)
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LIST_LOOPS'
      })
      
      if (response.success) {
        setSavedLoops(response.data)
      } else {
        console.error('Failed to load loops:', response.error)
      }
    } catch (error) {
      console.error('Error loading loops:', error)
    } finally {
      setLoadingLoops(false)
    }
  }

  const loadSavedRecordings = async () => {
    setLoadingRecordings(true)
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LIST_RECORDINGS'
      })
      
      if (response.success) {
        setSavedRecordings(response.data)
      } else {
        console.error('Failed to load recordings:', response.error)
      }
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
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_LOOP',
        data: { id: loopId }
      })
      
      if (response.success) {
        setSavedLoops(loops => loops.filter(loop => loop.id !== loopId))
      } else {
        console.error('Failed to delete loop:', response.error)
      }
    } catch (error) {
      console.error('Error deleting loop:', error)
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
            console.log('FluentFlow: Loop applied successfully')
            setApplyingLoopId(null)
          } catch (error) {
            console.log(`FluentFlow: Apply attempt ${attempts + 1} failed, retrying...`)
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
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_RECORDING',
        data: { id: recordingId }
      })
      
      if (response.success) {
        setSavedRecordings(recordings => recordings.filter(rec => rec.id !== recordingId))
      } else {
        console.error('Failed to delete recording:', response.error)
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
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <CardTitle className="text-sm">Currently Practicing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium text-sm">{currentVideo.title}</p>
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
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Practice Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allSessions.slice(0, 5).map(session => (
            <div 
              key={session.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                currentSession?.id === session.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => {}}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.videoTitle}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
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
            <FileAudio className="h-4 w-4 mr-2" />
            View All Recordings
          </Button>
          <Button 
            className="w-full justify-start"
            variant="outline"
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
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
              <CardDescription>
                {savedRecordings.length} saved recordings
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={loadSavedRecordings}
              disabled={loadingRecordings}
            >
              {loadingRecordings ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
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
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No recordings saved yet</CardTitle>
              <CardDescription>
                Record audio on YouTube videos to save them here for practice
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingRecordings && savedRecordings.map(recording => (
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

  const renderLoops = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Saved Loops
              </CardTitle>
              <CardDescription>
                {savedLoops.length} saved loops
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={loadSavedLoops}
              disabled={loadingLoops}
            >
              {loadingLoops ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loadingLoops ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
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
              <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No loops saved yet</CardTitle>
              <CardDescription>
                Create loops on YouTube videos to save them here for later use
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingLoops && savedLoops.map(loop => (
          <Card key={loop.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base">{loop.title}</CardTitle>
                  <CardDescription className="text-sm">{loop.videoTitle}</CardDescription>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(loop.startTime)} - {formatTime(loop.endTime)}</span>
                    <span>•</span>
                    <span>Duration: {formatTime(loop.endTime - loop.startTime)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {formatDate(new Date(loop.createdAt))}
                  </div>
                  {loop.description && (
                    <p className="text-sm text-muted-foreground mt-2">{loop.description}</p>
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
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {applyingLoopId === loop.id ? 'Applying...' : 'Apply'}
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => exportLoop(loop)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteLoop(loop.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-2">
              {statistics.weeklyProgress.slice(-7).map(day => (
                <div key={day.date} className="flex flex-col items-center flex-1">
                  <div className="bg-blue-500 rounded-t" style={{ 
                    height: `${Math.min(100, (day.practiceTime / 3600) * 100)}%`,
                    minHeight: '4px',
                    width: '100%'
                  }}></div>
                  <span className="text-xs text-muted-foreground mt-2">{day.date.slice(-2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Most Practiced Videos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statistics.mostPracticedVideos.slice(0, 5).map(video => (
              <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg border">
                <PlayCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{video.channel}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Practice Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50 border-green-200 border">
                <div className="text-2xl font-bold text-green-600">7</div>
                <div className="text-sm text-green-700">Day Streak</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 border-blue-200 border">
                <div className="text-2xl font-bold text-blue-600">21</div>
                <div className="text-sm text-blue-700">Best Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recording Quality</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              value={settings.audioQuality}
              onChange={(e) => updateSettings({ audioQuality: e.target.value as 'low' | 'medium' | 'high' })}
            >
              <option value="low">Low (32kbps)</option>
              <option value="medium">Medium (64kbps)</option>
              <option value="high">High (128kbps)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Recording Duration</label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={settings.maxRecordingDuration}
              onChange={(e) => updateSettings({ maxRecordingDuration: parseInt(e.target.value) })}
            >
              <option value="60">1 minute</option>
              <option value="180">3 minutes</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            UI Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Panel Position</label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={settings.panelPosition}
              onChange={(e) => updateSettings({ panelPosition: e.target.value as any })}
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoSave"
              className="rounded border border-input"
              checked={settings.autoSaveRecordings}
              onChange={(e) => updateSettings({ autoSaveRecordings: e.target.checked })}
            />
            <label htmlFor="autoSave" className="text-sm font-medium cursor-pointer">Auto-save recordings</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="visualFeedback"
              className="rounded border border-input"
              checked={settings.showVisualFeedback}
              onChange={(e) => updateSettings({ showVisualFeedback: e.target.checked })}
            />
            <label htmlFor="visualFeedback" className="text-sm font-medium cursor-pointer">Show visual feedback</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Set Loop Points</span>
            <Badge variant="secondary" className="font-mono text-xs">{settings.keyboardShortcuts.toggleLoop}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Start/Stop Recording</span>
            <Badge variant="secondary" className="font-mono text-xs">{settings.keyboardShortcuts.toggleRecording}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Compare Audio</span>
            <Badge variant="secondary" className="font-mono text-xs">{settings.keyboardShortcuts.compareAudio}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Toggle Panel</span>
            <Badge variant="secondary" className="font-mono text-xs">{settings.keyboardShortcuts.togglePanel}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Import Data
          </Button>
          <Button variant="destructive" className="w-full justify-start">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="h-full bg-background">
      <div className="border-b p-4">
        <h1 className="text-xl font-bold">FluentFlow</h1>
        <p className="text-sm text-muted-foreground">YouTube Language Learning</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1">
        <TabsList className="grid w-full grid-cols-5 m-4">
          <TabsTrigger value="dashboard" className="text-xs">
            <BarChart3 className="h-4 w-4 mr-1" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="loops" className="text-xs">
            <Repeat className="h-4 w-4 mr-1" />
            Loops
          </TabsTrigger>
          <TabsTrigger value="recordings" className="text-xs">
            <Music className="h-4 w-4 mr-1" />
            Records
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            <TrendingUp className="h-4 w-4 mr-1" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>

        <div className="px-4 pb-4">
          <TabsContent value="dashboard" className="mt-0">{renderDashboard()}</TabsContent>
          <TabsContent value="loops" className="mt-0">{renderLoops()}</TabsContent>
          <TabsContent value="recordings" className="mt-0">{renderRecordings()}</TabsContent>
          <TabsContent value="analytics" className="mt-0">{renderAnalytics()}</TabsContent>
          <TabsContent value="settings" className="mt-0">{renderSettings()}</TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
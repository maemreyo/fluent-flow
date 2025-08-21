import { useEffect, useState } from 'react'
import { Activity, Clock, History, Keyboard, Pause, Play, Settings, Tv } from 'lucide-react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Separator } from './components/ui/separator'
import { useFluentFlowSupabaseStore as useFluentFlowStore } from './lib/stores/fluent-flow-supabase-store'
import type { YouTubeVideoInfo } from './lib/types/fluent-flow-types'
import './styles/popup.css'

export default function FluentFlowPopup() {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null)
  const [isYouTubePage, setIsYouTubePage] = useState(false)
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null)

  const { currentSession, statistics, uiState, togglePanel } = useFluentFlowStore()

  useEffect(() => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0]
      setCurrentTab(tab)

      if (tab?.url) {
        const isYT = tab.url.includes('youtube.com/watch')
        setIsYouTubePage(isYT)

        if (isYT && tab.id) {
          // Try to get video info from content script
          chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' }, response => {
            if (response?.success && response.videoInfo) {
              setVideoInfo(response.videoInfo)
            }
          })
        }
      }
    })
  }, [])

  const handleTogglePanel = () => {
    if (currentTab?.id && isYouTubePage) {
      chrome.tabs.sendMessage(currentTab.id, { type: 'TOGGLE_PANEL' })
      togglePanel()
      window.close() // Close popup after action
    }
  }

  const handleOpenSidePanel = () => {
    chrome.sidePanel.open({ windowId: currentTab?.windowId })
    window.close()
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
    window.close()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isYouTubePage) {
    return (
      <div className="w-80 p-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              FluentFlow
            </CardTitle>
            <CardDescription>YouTube Language Learning</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <Tv className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Not on YouTube</h3>
                <p className="text-sm text-muted-foreground">
                  FluentFlow works on YouTube watch pages. Navigate to a YouTube video to start
                  practicing!
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleOpenSidePanel}
                >
                  <History className="mr-2 h-4 w-4" />
                  Open Practice History
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={handleOpenOptions}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-80 space-y-4 p-4">
      <Card>
        <CardHeader className="pb-3 text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            FluentFlow
          </CardTitle>
          <CardDescription>YouTube Language Learning</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {videoInfo && (
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <h3 className="mb-1 line-clamp-2 text-sm font-medium">{videoInfo.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{videoInfo.channel}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatTime(videoInfo.duration)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {currentSession ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-800">Practice Session Active</div>
                  <div className="text-xs text-green-600">
                    {currentSession.segments.length} segments • {currentSession.recordings.length}{' '}
                    recordings
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Ready to Practice</div>
                  <div className="text-xs text-muted-foreground">
                    Open panel to start practicing
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={handleTogglePanel}>
              {uiState.isPanelVisible ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Hide Panel
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Show Panel
                </>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenSidePanel}>
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenOptions}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Your Progress</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold">{statistics.totalSessions}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{statistics.totalRecordings}</div>
                <div className="text-xs text-muted-foreground">Recordings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {formatTime(statistics.totalPracticeTime)}
                </div>
                <div className="text-xs text-muted-foreground">Practice Time</div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Alt</kbd>
                  <span>+</span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">L</kbd>
                </div>
                <span className="text-muted-foreground">Set Loop Points</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Alt</kbd>
                  <span>+</span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">R</kbd>
                </div>
                <span className="text-muted-foreground">Start/Stop Recording</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Alt</kbd>
                  <span>+</span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">C</kbd>
                </div>
                <span className="text-muted-foreground">Compare Audio</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Alt</kbd>
                  <span>+</span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">F</kbd>
                </div>
                <span className="text-muted-foreground">Toggle Panel</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

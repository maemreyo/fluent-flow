// Options Page Component - Extension settings and configuration
// Full-page settings interface

import { useState, useEffect } from "react"
import type { UserPreferences, ApiConfig } from "./lib/types"
import { useFluentFlowSupabaseStore as useFluentFlowStore, getFluentFlowStore } from "./lib/stores/fluent-flow-supabase-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Switch } from "./components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Badge } from "./components/ui/badge"
import { Separator } from "./components/ui/separator"
import { Alert, AlertDescription } from "./components/ui/alert"
import { AuthComponent } from "./components/auth-component"
import { 
  Settings,
  Palette,
  Bell,
  Save,
  TestTube,
  Download,
  Upload,
  Trash,
  RotateCcw,
  ExternalLink,
  Info,
  Zap,
  Database,
  TrendingUp,
  Activity,
  Eye,
  PlayCircle,
  Volume2,
  Headphones,
  Shield
} from "lucide-react"

import "./styles/options.css"

export default function OptionsPage() {
  const [activeTab, setActiveTab] = useState('account')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const {
    statistics,
    settings: fluentFlowSettings,
    updateSettings: updateFluentFlowSettings
  } = useFluentFlowStore()
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    notifications: true,
    autoSave: true,
    language: 'en',
    shortcuts: {}
  })
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    baseUrl: 'https://jsonplaceholder.typicode.com',
    timeout: 30000
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Check authentication status first
        const store = getFluentFlowStore()
        const currentUser = await store.supabaseService.getUserProfile()
        
        setIsAuthenticated(!!currentUser)
        setUser(currentUser)
        
        // Load settings from Supabase for authenticated users
        if (currentUser) {
          console.log('FluentFlow: Loading settings from Supabase for user:', currentUser.id)
          
          // Load user preferences
          const userPrefs = await store.supabaseService.getUserPreferences()
          if (userPrefs) {
            setPreferences(userPrefs)
          }

          // Load API config
          const apiConf = await store.supabaseService.getApiConfig()
          if (apiConf) {
            setApiConfig(apiConf)
          }
        } else {
          console.log('FluentFlow: User not authenticated, loading settings from local storage')
          
          // Fallback to chrome storage for unauthenticated users
          const response = await chrome.runtime.sendMessage({
            type: "STORAGE_OPERATION",
            operation: "get",
            key: ["user_preferences", "api_config"]
          })
          
          if (response.success) {
            if (response.data.user_preferences) {
              setPreferences(response.data.user_preferences)
            }
            if (response.data.api_config) {
              setApiConfig(response.data.api_config)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()
  }, [])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const store = getFluentFlowStore()
      
      try {
        // Try to save to Supabase for authenticated users
        await Promise.all([
          store.supabaseService.updateUserPreferences(preferences),
          store.supabaseService.updateApiConfig(apiConfig)
        ])
        
        setSaveMessage("Settings saved to cloud successfully!")
        console.log('FluentFlow: Settings saved to Supabase successfully')
        
      } catch (supabaseError) {
        console.warn('FluentFlow: Failed to save to Supabase, falling back to local storage:', supabaseError)
        
        // Fallback to chrome storage for unauthenticated users or when Supabase fails
        await Promise.all([
          chrome.runtime.sendMessage({
            type: "STORAGE_OPERATION",
            operation: "set",
            key: "user_preferences",
            value: preferences
          }),
          chrome.runtime.sendMessage({
            type: "STORAGE_OPERATION",
            operation: "set",
            key: "api_config",
            value: apiConfig
          })
        ])
        
        setSaveMessage("Settings saved locally!")
      }
      
      setTimeout(() => setSaveMessage(null), 3000)

    } catch (error) {
      console.error("Failed to save settings:", error)
      setSaveMessage("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) {
      return
    }

    const defaultPreferences: UserPreferences = {
      theme: 'light',
      notifications: true,
      autoSave: true,
      language: 'en',
      shortcuts: {}
    }

    const defaultApiConfig: ApiConfig = {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      timeout: 30000
    }

    setPreferences(defaultPreferences)
    setApiConfig(defaultApiConfig)
  }

  const handleTestApiConnection = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "API_CALL",
        endpoint: "example-api",
        data: {}
      })

      if (response.success) {
        alert("API connection test successful!")
      } else {
        alert(`API connection test failed: ${response.error}`)
      }
    } catch (error) {
      alert(`API connection test failed: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            FluentFlow Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your YouTube language learning experience
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="fluent-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              FluentFlow
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <AuthComponent onAuthSuccess={() => {}} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Sync Status
                </CardTitle>
                <CardDescription>
                  FluentFlow uses Supabase to sync your data across devices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sync Status</Label>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm">
                      {isAuthenticated ? 'Connected to cloud storage' : 'Using local storage only'}
                    </span>
                  </div>
                  {user && (
                    <p className="text-xs text-muted-foreground">
                      Signed in as: {user.email || user.full_name || 'User'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Features Available</Label>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Practice sessions sync across devices</li>
                    <li>• Audio recordings stored securely</li>
                    <li>• Progress analytics and statistics</li>
                    <li>• Loop segments and practice data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of FluentFlow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-select">Theme</Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) => setPreferences(prev => ({
                      ...prev,
                      theme: value as 'light' | 'dark' | 'auto'
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language-select">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => setPreferences(prev => ({
                      ...prev,
                      language: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="es">🇪🇸 Español</SelectItem>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Behavior
                </CardTitle>
                <CardDescription>
                  Configure how FluentFlow behaves
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications for processing results and errors
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({
                      ...prev,
                      notifications: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save results</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save processing results to history
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoSave}
                    onCheckedChange={(checked) => setPreferences(prev => ({
                      ...prev,
                      autoSave: checked
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  API Configuration
                </CardTitle>
                <CardDescription>
                  Configure API endpoints and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-base-url">Base URL</Label>
                  <Input
                    id="api-base-url"
                    type="url"
                    value={apiConfig.baseUrl}
                    onChange={(e) => setApiConfig(prev => ({
                      ...prev,
                      baseUrl: e.target.value
                    }))}
                    placeholder="https://api.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-timeout">Timeout (ms)</Label>
                  <Input
                    id="api-timeout"
                    type="number"
                    min="1000"
                    max="300000"
                    step="1000"
                    value={apiConfig.timeout || 30000}
                    onChange={(e) => setApiConfig(prev => ({
                      ...prev,
                      timeout: parseInt(e.target.value)
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key (optional)</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiConfig.apiKey || ''}
                    onChange={(e) => setApiConfig(prev => ({
                      ...prev,
                      apiKey: e.target.value || undefined
                    }))}
                    placeholder="Enter your API key"
                  />
                  <p className="text-sm text-muted-foreground">
                    API key will be stored securely in local storage
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={handleTestApiConnection}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fluent-settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Audio Settings
                </CardTitle>
                <CardDescription>
                  Configure audio recording and playback settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-quality">Recording Quality</Label>
                  <Select 
                    value={fluentFlowSettings.audioQuality}
                    onValueChange={(value) => updateFluentFlowSettings({ audioQuality: value as 'low' | 'medium' | 'high' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (32kbps)</SelectItem>
                      <SelectItem value="medium">Medium (64kbps)</SelectItem>
                      <SelectItem value="high">High (128kbps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-duration">Max Recording Duration</Label>
                  <Select 
                    value={fluentFlowSettings.maxRecordingDuration.toString()}
                    onValueChange={(value) => updateFluentFlowSettings({ maxRecordingDuration: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="180">3 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  UI Preferences
                </CardTitle>
                <CardDescription>
                  Customize the FluentFlow user interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="panel-position">Panel Position</Label>
                  <Select 
                    value={fluentFlowSettings.panelPosition}
                    onValueChange={(value) => updateFluentFlowSettings({ panelPosition: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save recordings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save recordings to your library
                    </p>
                  </div>
                  <Switch
                    checked={fluentFlowSettings.autoSaveRecordings}
                    onCheckedChange={(checked) => updateFluentFlowSettings({ autoSaveRecordings: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show visual feedback</Label>
                    <p className="text-sm text-muted-foreground">
                      Display visual indicators during recording
                    </p>
                  </div>
                  <Switch
                    checked={fluentFlowSettings.showVisualFeedback}
                    onCheckedChange={(checked) => updateFluentFlowSettings({ showVisualFeedback: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  Keyboard Shortcuts
                </CardTitle>
                <CardDescription>
                  Current keyboard shortcuts for FluentFlow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Set Loop Points</span>
                  <Badge variant="secondary" className="font-mono text-xs">{fluentFlowSettings.keyboardShortcuts.toggleLoop}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Start/Stop Recording</span>
                  <Badge variant="secondary" className="font-mono text-xs">{fluentFlowSettings.keyboardShortcuts.toggleRecording}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compare Audio</span>
                  <Badge variant="secondary" className="font-mono text-xs">{fluentFlowSettings.keyboardShortcuts.compareAudio}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Toggle Panel</span>
                  <Badge variant="secondary" className="font-mono text-xs">{fluentFlowSettings.keyboardShortcuts.togglePanel}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Progress
                </CardTitle>
                <CardDescription>
                  Your practice activity over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between h-32 gap-2">
                  {statistics.weeklyProgress.slice(-7).map((day) => (
                    <div key={day.date} className="flex flex-col items-center flex-1">
                      <div className="bg-primary rounded-t" style={{ 
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
                <CardDescription>
                  Your top 5 most practiced YouTube videos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {statistics.mostPracticedVideos.slice(0, 5).map((video, index) => (
                  <div key={video.videoId} className="flex items-center gap-3 p-3 rounded-lg border">
                    <PlayCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{video.channel}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
                {statistics.mostPracticedVideos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Start practicing to see your most practiced videos here
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Practice Streaks
                </CardTitle>
                <CardDescription>
                  Track your practice consistency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 border-green-200 border">
                    <div className="text-2xl font-bold text-green-600">7</div>
                    <div className="text-sm text-green-700">Current Streak</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 border-blue-200 border">
                    <div className="text-2xl font-bold text-blue-600">21</div>
                    <div className="text-sm text-blue-700">Best Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance
                </CardTitle>
                <CardDescription>
                  Optimize FluentFlow performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cache-size">Max Cache Items</Label>
                  <Input
                    id="cache-size"
                    type="number"
                    min="10"
                    max="1000"
                    defaultValue="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Processing Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="1"
                    max="50"
                    defaultValue="5"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Manage your FluentFlow data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export All Data
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Button>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash className="h-4 w-4" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reset Settings</CardTitle>
                <CardDescription>
                  Reset all settings to their default values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleResetSettings}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset All Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  About FluentFlow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">FluentFlow</h3>
                    <Badge variant="secondary">Version 1.0.0</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    A powerful YouTube language learning tool that helps you practice pronunciation 
                    by recording and comparing your voice with native speakers.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Audio recording and playback</li>
                    <li>• Professional audio player interface</li>
                    <li>• Practice session management</li>
                    <li>• Keyboard shortcuts for efficiency</li>
                    <li>• Export audio for further practice</li>
                    <li>• Modern UI with shadcn/ui components</li>
                    <li>• Clean architecture with TypeScript</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Links:</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="https://github.com/example/fluent-flow" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        GitHub Repository
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="https://developer.chrome.com/docs/extensions/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Chrome Extension Documentation
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {activeTab !== 'about' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Save your changes</p>
                  <p className="text-sm text-muted-foreground">
                    Changes will be applied immediately across all FluentFlow components
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {saveMessage && (
                    <Alert className={`${saveMessage.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} max-w-xs`}>
                      <AlertDescription className={saveMessage.includes('successfully') ? 'text-green-800' : 'text-red-800'}>
                        {saveMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
// Options Page Component - Extension settings and configuration
// Full-page settings interface

import { useState, useEffect } from "react"
import type { UserPreferences, ApiConfig } from "./lib/types"
import { useFluentFlowSupabaseStore as useFluentFlowStore } from "./lib/stores/fluent-flow-supabase-store"
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
  Headphones
} from "lucide-react"

import "./styles/options.css"

export default function OptionsPage() {
  const [activeTab, setActiveTab] = useState('general')
  
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
      // Save preferences
      await chrome.runtime.sendMessage({
        type: "STORAGE_OPERATION",
        operation: "set",
        key: "user_preferences",
        value: preferences
      })

      // Save API config
      await chrome.runtime.sendMessage({
        type: "STORAGE_OPERATION",
        operation: "set",
        key: "api_config",
        value: apiConfig
      })

      setSaveMessage("Settings saved successfully!")
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="fluent-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              FluentFlow
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
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
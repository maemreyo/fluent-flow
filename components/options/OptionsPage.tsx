// Options Page Component - Extension settings and configuration
// Refactored into modular components with payment integration

import { useEffect, useState } from 'react'
import { Database, Info, Save, Settings, Shield, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { LayoutProvider } from '../../lib/contexts/layout-context'
import {
  getFluentFlowStore,
  useFluentFlowSupabaseStore as useFluentFlowStore
} from '../../lib/stores/fluent-flow-supabase-store'
import type { ApiConfig, UserPreferences } from '../../lib/types'
import { AccountTab } from './AccountTab'
import { APITab } from './APITab'
import { AdvancedTab } from './AdvancedTab'
import { AboutTab } from './AboutTab'

export function OptionsPage() {
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
            type: 'STORAGE_OPERATION',
            operation: 'get',
            key: ['user_preferences', 'api_config']
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
        console.error('Failed to load settings:', error)
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

        setSaveMessage('Settings saved to cloud successfully!')
        console.log('FluentFlow: Settings saved to Supabase successfully')
      } catch (supabaseError) {
        console.warn(
          'FluentFlow: Failed to save to Supabase, falling back to local storage:',
          supabaseError
        )

        // Fallback to chrome storage for unauthenticated users or when Supabase fails
        await Promise.all([
          chrome.runtime.sendMessage({
            type: 'STORAGE_OPERATION',
            operation: 'set',
            key: 'user_preferences',
            value: preferences
          }),
          chrome.runtime.sendMessage({
            type: 'STORAGE_OPERATION',
            operation: 'set',
            key: 'api_config',
            value: apiConfig
          })
        ])

        setSaveMessage('Settings saved locally!')
      }

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
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

  return (
    <LayoutProvider forceMode="options">
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl space-y-6 p-6">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Settings className="h-8 w-8" />
              FluentFlow Settings
            </h1>
            <p className="text-muted-foreground">
              Configure your YouTube language learning experience
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Account
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
              <AccountTab isAuthenticated={isAuthenticated} user={user} />
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <APITab apiConfig={apiConfig} setApiConfig={setApiConfig} />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <AdvancedTab handleResetSettings={handleResetSettings} />
            </TabsContent>

            <TabsContent value="about" className="space-y-6">
              <AboutTab />
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
                      <Alert
                        className={`${saveMessage.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} max-w-xs`}
                      >
                        <AlertDescription
                          className={
                            saveMessage.includes('successfully') ? 'text-green-800' : 'text-red-800'
                          }
                        >
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
    </LayoutProvider>
  )
}
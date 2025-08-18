// Type Definitions - All TypeScript types used throughout the extension
// Centralized type definitions for better maintainability

// Core data types
export interface FeatureData {
  input: string
  options?: {
    timeout?: number
    retries?: number
    priority?: 'low' | 'normal' | 'high'
  }
}

export interface ProcessResult {
  id: string
  input: string
  output: {
    processed: boolean
    result: string
    error?: string
    metadata?: Record<string, any>
  }
  success: boolean
  timestamp: number
}

// API types
export interface ApiConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
  retryCount?: number
  retryDelay?: number
}

export interface ApiResponse {
  data: any
  status: number
  statusText: string
  headers: Record<string, string>
}

// Storage types
export interface StorageResult {
  operation: 'get' | 'set' | 'remove' | 'clear'
  success: boolean
  key: string[]
  value?: any
  data?: any
}

// Cache types
export interface CacheItem {
  data: any
  timestamp: number
  ttl: number
  accessCount?: number
  lastAccessed?: number
}

export interface CacheStats {
  memoryItems: number
  storageItems: number
  validItems: number
  expiredItems: number
  totalSizeBytes: number
  hitRate: number
  lastCleanup: number
}

// Rate limiting types
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

// Validation types
export interface ValidationResult {
  isValid: boolean
  error?: string
  details?: any[]
  data?: any
}

// Message types
export interface ExtensionMessage {
  type: string
  data?: any
  timestamp?: number
  requestId?: string
}

export interface ExtensionResponse {
  success: boolean
  data?: any
  error?: string
  code?: string
  timestamp: number
  cached?: boolean
}

// Configuration types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
  autoSave: boolean
  language: string
  shortcuts: Record<string, string>
}

export interface ExtensionConfig {
  version: string
  environment: 'development' | 'staging' | 'production'
  features: {
    caching: boolean
    rateLimiting: boolean
    analytics: boolean
    debugMode: boolean
  }
  api: ApiConfig
  storage: {
    maxItems: number
    maxSize: number
    cleanupInterval: number
  }
}

// UI Component types
export interface PopupProps {
  selectedText?: string
  onClose?: () => void
  onProcess?: (data: FeatureData) => void
}

export interface SidePanelProps {
  data?: any
  onUpdate?: (data: any) => void
}

export interface NotificationData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

// Error types
export interface ExtensionError extends Error {
  code: string
  context?: Record<string, any>
  timestamp: number
}

// Service types
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable'
  responseTime: number
  lastChecked: number
  error?: string
}

export interface BatchProcessResult {
  total: number
  processed: number
  failed: number
  results: ProcessResult[]
  errors: string[]
}

// Content Script types
export interface TextSelection {
  text: string
  range: Range
  context: string
  position: {
    x: number
    y: number
  }
}

export interface HighlightData {
  text: string
  color: string
  note?: string
  timestamp: number
}

// Context Menu types
export interface ContextMenuAction {
  id: string
  title: string
  contexts: chrome.contextMenus.ContextType[]
  handler: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void
}

// Analytics types
export interface AnalyticsEvent {
  name: string
  parameters: Record<string, any>
  timestamp: number
  userId?: string
  sessionId: string
}

export interface UsageStats {
  dailyActiveUsers: number
  featuresUsed: Record<string, number>
  errorRate: number
  averageResponseTime: number
  cacheHitRate: number
}

// Sync types
export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: string
  data: any
  timestamp: number
  retryCount: number
}

export interface SyncResult {
  operationId: string
  success: boolean
  data?: any
  error?: string
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Generic types for better type safety
export type EventHandler<T = any> = (data: T) => void | Promise<void>
export type AsyncHandler<T = any, R = any> = (data: T) => Promise<R>

// Chrome API wrapper types
export interface ChromeStorageWrapper {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  getAll(): Promise<Record<string, any>>
}

export interface ChromeTabsWrapper {
  getCurrent(): Promise<chrome.tabs.Tab | undefined>
  sendMessage<T>(tabId: number, message: any): Promise<T>
  create(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>
  update(tabId: number, updateProperties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab>
}

// Feature flag types
export interface FeatureFlags {
  enableCaching: boolean
  enableRateLimiting: boolean
  enableAnalytics: boolean
  enableDebugMode: boolean
  enableOfflineMode: boolean
  enableBatchProcessing: boolean
  experimentalFeatures: string[]
}

// Plugin/Extension types for modularity
export interface ExtensionPlugin {
  name: string
  version: string
  initialize: (context: ExtensionContext) => Promise<void>
  destroy: () => Promise<void>
  handlers?: Record<string, Function>
}

export interface ExtensionContext {
  config: ExtensionConfig
  storage: ChromeStorageWrapper
  tabs: ChromeTabsWrapper
  sendMessage: (message: ExtensionMessage) => Promise<ExtensionResponse>
  on: (event: string, handler: EventHandler) => void
  off: (event: string, handler: EventHandler) => void
}

// Testing types
export interface MockData {
  featureData: FeatureData
  processResult: ProcessResult
  apiResponse: ApiResponse
  storageData: Record<string, any>
}

export interface TestContext {
  mocks: MockData
  helpers: {
    createMessage: (type: string, data?: any) => ExtensionMessage
    createResponse: (success: boolean, data?: any, error?: string) => ExtensionResponse
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>
  }
}

// Environment-specific types
export interface DevelopmentConfig extends ExtensionConfig {
  debugMode: true
  mockApis: boolean
  verboseLogging: boolean
}

export interface ProductionConfig extends ExtensionConfig {
  debugMode: false
  analytics: {
    trackingId: string
    enableErrorReporting: boolean
    sampleRate: number
  }
  performance: {
    enableMetrics: boolean
    reportingInterval: number
  }
}

// AI Integration Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface AIRequest {
  messages: ChatMessage[]
  provider: AIProvider
  model: string
  options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
}

export interface AIResponse {
  content: string
  usage: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }
  model: string
  provider: AIProvider
  finishReason: string
  stream?: any
}

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens: number
  temperature: number
  stream: boolean
}

export interface AIConversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  provider: AIProvider
  model: string
}

// AI Features
export interface AIFeature {
  id: string
  name: string
  description: string
  category: 'text-processing' | 'analysis' | 'generation' | 'translation'
  requiredCapabilities: AICapability[]
  enabled: boolean
}

export interface AIProcessingResult {
  id: string
  input: string
  output: string
  feature: string
  provider: AIProvider
  model: string
  usage: AIResponse['usage']
  timestamp: number
  success: boolean
  error?: string
}

// Enhanced Store Types for AI
export interface AIStore {
  // AI Configuration
  providers: Record<AIProvider, AIConfig>
  activeProvider: AIProvider
  availableModels: Record<AIProvider, string[]>
  
  // Conversations
  conversations: AIConversation[]
  activeConversation: string | null
  
  // Processing
  isProcessing: boolean
  processingHistory: AIProcessingResult[]
  
  // Features
  availableFeatures: AIFeature[]
  enabledFeatures: string[]
}

// Export commonly used type unions
export type Theme = 'light' | 'dark' | 'auto'
export type Environment = 'development' | 'staging' | 'production'
export type MessageType = 'PROCESS_FEATURE' | 'API_CALL' | 'STORAGE_OPERATION' | 'OPEN_SIDE_PANEL' | 'AI_CHAT' | 'AI_PROCESS' | string
export type ErrorCode = 'UNKNOWN_ERROR' | 'VALIDATION_ERROR' | 'API_ERROR' | 'STORAGE_ERROR' | 'AI_ERROR' | string
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
// Logger Service Types
export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  context?: string
  data?: any
  source?: 'background' | 'content' | 'popup' | 'sidepanel' | 'options'
  userId?: string
  sessionId?: string
}

export interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  maxEntries: number
  persistToDisk: boolean
  includeStackTrace: boolean
  enableConsole: boolean
}

// Error Service Types
export interface ErrorReport {
  id: string
  timestamp: number
  message: string
  stack?: string
  context?: string
  source?: 'background' | 'content' | 'popup' | 'sidepanel' | 'options'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
  data?: any
  resolved?: boolean
  reportedToServer?: boolean
}

export interface ErrorServiceConfig {
  enabled: boolean
  reportToServer: boolean
  maxReports: number
  serverEndpoint?: string
  enableAutoReporting: boolean
  criticalErrorThreshold: number
}

// Notification Service Types
export interface ChromeNotificationData {
  id: string
  title: string
  message: string
  type: 'basic' | 'image' | 'list' | 'progress'
  priority: 'low' | 'normal' | 'high' | 'critical'
  iconUrl?: string
  imageUrl?: string
  items?: Array<{ title: string; message: string }>
  progress?: number
  buttons?: Array<{ title: string; action: string }>
  timestamp: number
  persistent?: boolean
  silent?: boolean
  requireInteraction?: boolean
  contextMessage?: string
  eventTime?: number
  tag?: string
  data?: any
}

export interface NotificationConfig {
  enabled: boolean
  showInBrowser: boolean
  playSound: boolean
  showBadge: boolean
  maxNotifications: number
  defaultIcon: string
  autoCloseDelay: number
  enableActionButtons: boolean
}

export interface NotificationHistory {
  id: string
  notification: ChromeNotificationData
  shown: boolean
  clicked: boolean
  dismissed: boolean
  buttonClicked?: string
  shownAt?: number
  clickedAt?: number
  dismissedAt?: number
}

// Update Service Types
export interface UpdateInfo {
  version: string
  releaseNotes: string
  downloadUrl: string
  checksum?: string
  size?: number
  releaseDate: string
  critical: boolean
  minimumVersion?: string
  features?: string[]
  bugFixes?: string[]
  breakingChanges?: string[]
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  updateInfo?: UpdateInfo
  isForced?: boolean
  downloadProgress?: number
}

export interface UpdateServiceConfig {
  enabled: boolean
  checkOnStartup: boolean
  autoDownload: boolean
  autoInstall: boolean
  checkInterval: number
  updateEndpoint: string
  notifyUser: boolean
  allowBetaUpdates: boolean
  forceUpdates: boolean
}

export interface UpdateHistory {
  version: string
  installedAt: number
  previousVersion?: string
  source: 'auto' | 'manual' | 'forced'
  success: boolean
  errorMessage?: string
}
export type CacheStrategy = 'memory-only' | 'storage-only' | 'hybrid'
export type AIProvider = 'openai' | 'anthropic' | 'custom'
export type AICapability = 'text-generation' | 'text-analysis' | 'summarization' | 'translation' | 'code-generation' | 'function-calling' | 'long-context' | 'reasoning'
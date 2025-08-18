// Constants - Centralized configuration values
// All constants used throughout the extension

export const EXTENSION_CONFIG = {
  NAME: 'Chrome Extension Starter',
  VERSION: '1.0.0',
  AUTHOR: 'Chrome Extension Team'
} as const

export const API_ENDPOINTS = {
  HEALTH: '/health',
  PROCESS: '/process',
  SEARCH: '/search',
  UPLOAD: '/upload'
} as const

export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  API_CONFIG: 'api_config',
  CACHE_CONFIG: 'cache_config',
  RATE_LIMIT_DATA: 'rate_limit_data',
  FEATURE_FLAGS: 'feature_flags',
  LAST_SYNC: 'last_sync_timestamp',
  LOGS: 'system_logs',
  ERROR_REPORTS: 'error_reports',
  NOTIFICATIONS: 'notifications_config'
} as const

export const ERROR_CODES = {
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // API errors
  API_ERROR: 'API_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  
  // Feature errors
  FEATURE_ERROR: 'FEATURE_ERROR',
  PROCESSING_FAILED: 'PROCESSING_FAILED'
} as const

export const TIMING = {
  // Request timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  QUICK_TIMEOUT: 5000,    // 5 seconds
  LONG_TIMEOUT: 60000,    // 1 minute
  
  // Cache TTL
  CACHE_SHORT: 60000,     // 1 minute
  CACHE_MEDIUM: 300000,   // 5 minutes
  CACHE_LONG: 3600000,    // 1 hour
  CACHE_EXTENDED: 86400000, // 24 hours
  
  // Rate limiting windows
  RATE_LIMIT_MINUTE: 60000,
  RATE_LIMIT_HOUR: 3600000,
  RATE_LIMIT_DAY: 86400000,
  
  // Retry delays
  RETRY_BASE_DELAY: 1000,
  RETRY_MAX_DELAY: 30000,
  
  // UI delays
  DEBOUNCE_DELAY: 300,
  NOTIFICATION_DURATION: 5000,
  LOADING_MIN_DURATION: 500
} as const

export const LIMITS = {
  // Input limits
  MAX_INPUT_LENGTH: 10000,
  MAX_FILENAME_LENGTH: 255,
  MAX_URL_LENGTH: 2048,
  
  // Storage limits
  MAX_STORAGE_VALUE_SIZE: 8192, // 8KB per value
  MAX_CACHE_ITEMS: 1000,
  MAX_MEMORY_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Rate limits
  DEFAULT_RATE_LIMIT: 100, // requests per minute
  API_RATE_LIMIT: 50,      // API requests per minute
  UPLOAD_RATE_LIMIT: 10,   // uploads per minute
  
  // Processing limits
  MAX_BATCH_SIZE: 50,
  MAX_CONCURRENT_REQUESTS: 5,
  MAX_RETRY_ATTEMPTS: 3
} as const

export const UI_CONFIG = {
  THEME: {
    DEFAULT: 'light',
    OPTIONS: ['light', 'dark', 'auto'] as const
  },
  
  NOTIFICATIONS: {
    POSITION: 'top-right' as const,
    MAX_VISIBLE: 3,
    AUTO_DISMISS: true
  },
  
  POPUP: {
    WIDTH: 400,
    HEIGHT: 600,
    MIN_WIDTH: 320,
    MIN_HEIGHT: 400
  },
  
  SIDEPANEL: {
    WIDTH: 350,
    MIN_WIDTH: 300,
    MAX_WIDTH: 500
  }
} as const

export const FEATURE_FLAGS = {
  ENABLE_CACHING: true,
  ENABLE_RATE_LIMITING: true,
  ENABLE_ANALYTICS: false,
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
  ENABLE_OFFLINE_MODE: true,
  ENABLE_BATCH_PROCESSING: true
} as const

export const MESSAGE_TYPES = {
  // Background script messages
  PROCESS_FEATURE: 'PROCESS_FEATURE',
  API_CALL: 'API_CALL',
  STORAGE_OPERATION: 'STORAGE_OPERATION',
  
  // UI messages
  OPEN_SIDE_PANEL: 'OPEN_SIDE_PANEL',
  SHOW_POPUP: 'SHOW_POPUP',
  CLOSE_POPUP: 'CLOSE_POPUP',
  
  // Content script messages
  GET_SELECTED_TEXT: 'GET_SELECTED_TEXT',
  HIGHLIGHT_TEXT: 'HIGHLIGHT_TEXT',
  
  // System messages
  GET_CONFIG: 'GET_CONFIG',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  HEALTH_CHECK: 'HEALTH_CHECK',
  
  // Real-time updates
  SIDEPANEL_DATA: 'SIDEPANEL_DATA',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  FEATURE_UPDATED: 'FEATURE_UPDATED'
} as const

export const CHROME_APIS = {
  PERMISSIONS: {
    STORAGE: 'storage',
    ACTIVE_TAB: 'activeTab',
    CONTEXT_MENUS: 'contextMenus',
    SIDE_PANEL: 'sidePanel',
    TABS: 'tabs'
  },
  
  CONTEXTS: {
    SELECTION: 'selection',
    PAGE: 'page',
    LINK: 'link',
    IMAGE: 'image'
  }
} as const

export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  FILENAME: /^[a-zA-Z0-9._-]+$/,
  API_KEY: /^[a-zA-Z0-9]{32,}$/,
  
  // Security patterns
  SUSPICIOUS_SCRIPT: /<script|javascript:|on\w+\s*=/i,
  SQL_INJECTION: /('|(\\')|(;)|(\\;)|(--)|(\s|%20)+(or|OR)\s/,
  XSS_ATTEMPT: /<[^>]*on\w+\s*=|javascript:|<script/i
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  TIMEOUT: 504
} as const

export const MIME_TYPES = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
  XML: 'application/xml',
  PDF: 'application/pdf',
  
  // Images
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  SVG: 'image/svg+xml',
  
  // Documents
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  PDF_DOC: 'application/pdf'
} as const

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || ENVIRONMENT.DEVELOPMENT
  
  const configs = {
    [ENVIRONMENT.DEVELOPMENT]: {
      API_BASE_URL: 'http://localhost:3000',
      DEBUG_MODE: true,
      ANALYTICS_ENABLED: false,
      CACHE_TTL: TIMING.CACHE_SHORT
    },
    
    [ENVIRONMENT.STAGING]: {
      API_BASE_URL: 'https://staging-api.example.com',
      DEBUG_MODE: true,
      ANALYTICS_ENABLED: true,
      CACHE_TTL: TIMING.CACHE_MEDIUM
    },
    
    [ENVIRONMENT.PRODUCTION]: {
      API_BASE_URL: 'https://api.example.com',
      DEBUG_MODE: false,
      ANALYTICS_ENABLED: true,
      CACHE_TTL: TIMING.CACHE_LONG
    }
  }
  
  return configs[env as keyof typeof configs] || configs[ENVIRONMENT.DEVELOPMENT]
}

// Type definitions for constants
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES]
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]
export type Environment = typeof ENVIRONMENT[keyof typeof ENVIRONMENT]
// Core Service Classes
export { BaseService } from './base-service'
export { ImprovedBaseService } from './improved-base-service'

// API and HTTP Services
export { ApiService } from './api-service'

// AI Services
export { AIService } from './ai-service'

// Caching and Rate Limiting
export { CacheService } from './cache-service'
export { RateLimitService } from './rate-limit-service'

// Payment and Licensing
export { PaymentService } from './payment-service'
export { LicenseValidator } from './license-validator'

// System Services
export { LoggerService, logger } from './logger-service'
export { ErrorService, errorService } from './error-service'
export { NotificationService, notificationService } from './notification-service'
export { UpdateService, updateService } from './update-service'

// Type exports for new services
export type {
  LogEntry,
  LoggerConfig,
  ErrorReport,
  ErrorServiceConfig,
  NotificationData,
  NotificationConfig,
  NotificationHistory,
  UpdateInfo,
  UpdateCheckResult,
  UpdateServiceConfig,
  UpdateHistory
} from '../types'
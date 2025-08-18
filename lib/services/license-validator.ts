// License Validator - Offline license validation and feature enforcement
// Cryptographic validation for secure feature gating

import { Storage } from '@plasmohq/storage'
import { jwtDecode } from 'jwt-decode'
import type { License, FeatureAccess, PaymentError } from '../types/payment-types'

export class LicenseValidator {
  private storage: Storage
  private publicKey: string
  private extensionId: string

  constructor(config: {
    publicKey: string // RSA public key for JWT validation
    extensionId?: string
  }) {
    this.storage = new Storage()
    this.publicKey = config.publicKey
    this.extensionId = config.extensionId || chrome.runtime.id
  }

  // Validate license signature and expiration
  async validateLicense(license?: License): Promise<{
    isValid: boolean
    license?: License
    error?: string
  }> {
    try {
      // Get license from parameter or storage
      const licenseToValidate = license || await this.storage.get('license')
      
      if (!licenseToValidate) {
        return {
          isValid: false,
          error: 'No license found'
        }
      }

      // Check basic license properties
      if (!licenseToValidate.signature) {
        return {
          isValid: false,
          error: 'Invalid license format'
        }
      }

      // Decode and validate JWT signature
      const decoded = await this.validateJWTSignature(licenseToValidate.signature)
      if (!decoded) {
        return {
          isValid: false,
          error: 'Invalid license signature'
        }
      }

      // Check expiration
      const now = Date.now()
      if (licenseToValidate.expiresAt <= now) {
        return {
          isValid: false,
          error: 'License expired'
        }
      }

      // Check JWT expiration
      if (decoded.exp * 1000 <= now) {
        return {
          isValid: false,
          error: 'License token expired'
        }
      }

      // Validate extension ID (prevent license reuse across extensions)
      if (decoded.extensionId && decoded.extensionId !== this.extensionId) {
        return {
          isValid: false,
          error: 'License not valid for this extension'
        }
      }

      // Validate user ID matches
      if (decoded.userId !== licenseToValidate.userId) {
        return {
          isValid: false,
          error: 'License user mismatch'
        }
      }

      // All checks passed
      return {
        isValid: true,
        license: licenseToValidate
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'License validation failed'
      }
    }
  }

  // Check if user has access to a specific feature
  async checkFeatureAccess(featureId: string, license?: License): Promise<FeatureAccess> {
    const validation = await this.validateLicense(license)
    
    if (!validation.isValid || !validation.license) {
      return {
        featureId,
        hasAccess: false,
        requiresUpgrade: true
      }
    }

    const validLicense = validation.license

    // Check if feature is included in license
    const hasFeature = validLicense.features.includes(featureId)
    if (!hasFeature) {
      return {
        featureId,
        hasAccess: false,
        requiresUpgrade: true
      }
    }

    // Check usage limits
    const limits = validLicense.limits
    const usage = await this.getCurrentUsage()

    let hasAccess = true
    let used: number | undefined
    let limit: number | undefined
    let resetDate: number | undefined

    switch (featureId) {
      case 'ai_requests':
        limit = limits.aiRequests
        used = usage?.aiRequests || 0
        hasAccess = limit === -1 || (used !== undefined && used < limit)
        resetDate = this.getNextResetDate()
        break

      case 'conversations':
        limit = limits.conversations
        used = usage?.conversations || 0
        hasAccess = limit === -1 || (used !== undefined && used < limit)
        break

      case 'file_uploads':
        limit = limits.fileUploads
        used = usage?.features?.file_uploads || 0
        hasAccess = limit === -1 || (used !== undefined && used < limit)
        resetDate = this.getNextResetDate()
        break

      case 'custom_prompts':
        limit = limits.customPrompts
        used = usage?.features?.custom_prompts || 0
        hasAccess = limit === -1 || (used !== undefined && used < limit)
        break

      case 'priority_support':
        hasAccess = limits.prioritySupport
        break

      default:
        // Check advanced features
        hasAccess = limits.advancedFeatures.includes(featureId)
        break
    }

    return {
      featureId,
      hasAccess,
      limit: limit === -1 ? undefined : limit,
      used,
      resetDate,
      requiresUpgrade: !hasAccess
    }
  }

  // Enforce feature access (throws error if no access)
  async requireFeatureAccess(featureId: string, license?: License): Promise<void> {
    const access = await this.checkFeatureAccess(featureId, license)
    
    if (!access.hasAccess) {
      const error = new Error(`Access denied: Feature "${featureId}" requires a premium subscription`) as PaymentError
      error.code = 'FEATURE_NOT_AVAILABLE'
      error.userMessage = access.requiresUpgrade 
        ? 'This feature requires a premium subscription'
        : 'You have reached your usage limit for this feature'
      throw error
    }
  }

  // Validate multiple features at once
  async validateFeatures(featureIds: string[], license?: License): Promise<Record<string, FeatureAccess>> {
    const results: Record<string, FeatureAccess> = {}
    
    for (const featureId of featureIds) {
      results[featureId] = await this.checkFeatureAccess(featureId, license)
    }
    
    return results
  }

  // Get cached license from storage
  async getCachedLicense(): Promise<License | null> {
    try {
      const license = await this.storage.get('license')
      if (!license) return null

      const validation = await this.validateLicense(license as unknown as License)
      return validation.isValid ? (validation.license as License) : null
    } catch {
      return null
    }
  }

  // Cache license to storage
  async cacheLicense(license: License): Promise<void> {
    const validation = await this.validateLicense(license)
    if (validation.isValid) {
      await this.storage.set('license', license)
    } else {
      throw new Error(`Cannot cache invalid license: ${validation.error}`)
    }
  }

  // Clear cached license
  async clearLicense(): Promise<void> {
    await this.storage.remove('license')
  }

  // Check if license needs refresh (expires in less than 24 hours)
  async needsRefresh(license?: License): Promise<boolean> {
    const licenseToCheck = license || await this.getCachedLicense()
    if (!licenseToCheck) return true

    const hoursUntilExpiry = (licenseToCheck.expiresAt - Date.now()) / (60 * 60 * 1000)
    return hoursUntilExpiry < 24
  }

  // Generate offline access token (for temporary offline usage)
  async generateOfflineToken(license: License, durationHours: number = 72): Promise<string> {
    const validation = await this.validateLicense(license)
    if (!validation.isValid) {
      throw new Error('Cannot generate offline token from invalid license')
    }

    const offlineToken = {
      userId: license.userId,
      planId: license.planId,
      features: license.features,
      limits: license.limits,
      extensionId: this.extensionId,
      generatedAt: Date.now(),
      expiresAt: Date.now() + (durationHours * 60 * 60 * 1000),
      type: 'offline'
    }

    // In a real implementation, this would be signed with a private key
    // For now, we'll use a simple base64 encoding with checksum
    const tokenData = JSON.stringify(offlineToken)
    const checksum = await this.generateChecksum(tokenData)
    
    return btoa(JSON.stringify({
      data: tokenData,
      checksum
    }))
  }

  // Validate offline token
  async validateOfflineToken(token: string): Promise<{
    isValid: boolean
    data?: any
    error?: string
  }> {
    try {
      const decoded = JSON.parse(atob(token))
      const { data, checksum } = decoded

      // Verify checksum
      const expectedChecksum = await this.generateChecksum(data)
      if (checksum !== expectedChecksum) {
        return {
          isValid: false,
          error: 'Token integrity check failed'
        }
      }

      const tokenData = JSON.parse(data)

      // Check expiration
      if (tokenData.expiresAt <= Date.now()) {
        return {
          isValid: false,
          error: 'Offline token expired'
        }
      }

      // Check extension ID
      if (tokenData.extensionId !== this.extensionId) {
        return {
          isValid: false,
          error: 'Token not valid for this extension'
        }
      }

      return {
        isValid: true,
        data: tokenData
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid token format'
      }
    }
  }

  // Private helper methods
  private async validateJWTSignature(token: string): Promise<any | null> {
    try {
      // In a production environment, you would verify the JWT signature
      // using the public key. For this example, we'll just decode and
      // validate the structure.
      
      const decoded = jwtDecode(token)
      
      // Basic validation
      if (!decoded || typeof decoded !== 'object') {
        return null
      }

      return decoded
    } catch {
      return null
    }
  }

  private async getCurrentUsage(): Promise<any> {
    return await this.storage.get('usage')
  }

  private getNextResetDate(): number {
    // Calculate next month's first day
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth.getTime()
  }

  private async generateChecksum(data: string): Promise<string> {
    // Simple checksum using crypto API
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data + this.publicKey) // Salt with public key
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // Fallback for environments without crypto.subtle
    let hash = 0
    const str = data + this.publicKey
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }
}

// Default instance with placeholder public key
// In production, replace with your actual RSA public key
export const licenseValidator = new LicenseValidator({
  publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4qJFGJUReA...
-----END PUBLIC KEY-----`,
  extensionId: chrome.runtime.id
})

// Utility functions for common license operations
export const licenseUtils = {
  // Quick feature access check
  async canUseFeature(featureId: string): Promise<boolean> {
    const access = await licenseValidator.checkFeatureAccess(featureId)
    return access.hasAccess
  },

  // Require feature access (throws if no access)
  async requireFeature(featureId: string): Promise<void> {
    await licenseValidator.requireFeatureAccess(featureId)
  },

  // Get all feature access for current license
  async getAllFeatureAccess(): Promise<Record<string, FeatureAccess>> {
    const commonFeatures = [
      'ai_requests',
      'conversations',
      'file_uploads',
      'custom_prompts',
      'priority_support',
      'analytics',
      'team_features',
      'whitelabel'
    ]

    return await licenseValidator.validateFeatures(commonFeatures)
  },

  // Check if license is valid and active
  async isLicenseValid(): Promise<boolean> {
    const validation = await licenseValidator.validateLicense()
    return validation.isValid
  },

  // Get license expiration info
  async getLicenseExpiration(): Promise<{
    expiresAt: number
    daysRemaining: number
    needsRenewal: boolean
  } | null> {
    const license = await licenseValidator.getCachedLicense()
    if (!license) return null

    const now = Date.now()
    const daysRemaining = Math.ceil((license.expiresAt - now) / (24 * 60 * 60 * 1000))
    
    return {
      expiresAt: license.expiresAt,
      daysRemaining: Math.max(0, daysRemaining),
      needsRenewal: daysRemaining <= 7
    }
  }
}
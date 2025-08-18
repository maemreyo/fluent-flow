// Validation Utilities - Input validation and sanitization
// Centralized validation logic with proper error handling

import { z } from 'zod'
import type { ValidationResult } from "../types"

// Schema definitions
const featureDataSchema = z.object({
  input: z.string().min(1, "Input cannot be empty").max(10000, "Input too long"),
  options: z.object({
    timeout: z.number().min(1000).max(300000).optional(),
    retries: z.number().min(0).max(5).optional(),
    priority: z.enum(['low', 'normal', 'high']).optional()
  }).optional()
})

const apiRequestSchema = z.object({
  url: z.string().url("Invalid URL").optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional()
})

// Main validation functions
export function validateInput(data: unknown, context?: any): ValidationResult {
  try {
    const validated = featureDataSchema.parse(data)
    
    // Additional business logic validation
    if (containsSuspiciousContent(validated.input, context)) {
      return {
        isValid: false,
        error: 'Input contains suspicious content'
      }
    }

    return {
      isValid: true,
      data: validated
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Invalid input format',
        details: error.issues
      }
    }

    return {
      isValid: false,
      error: 'Validation failed'
    }
  }
}

export function validateApiRequest(endpoint: string, data: any): ValidationResult {
  try {
    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return {
        isValid: false,
        error: 'Invalid endpoint'
      }
    }

    // Validate allowed endpoints
    const allowedEndpoints = [
      'example-api',
      'custom-endpoint',
      'health-check'
    ]

    if (!allowedEndpoints.includes(endpoint)) {
      return {
        isValid: false,
        error: `Endpoint '${endpoint}' not allowed`
      }
    }

    // Validate request data for custom endpoints
    if (endpoint === 'custom-endpoint') {
      const validated = apiRequestSchema.parse(data)
      
      // Additional URL validation
      if (validated.url && !isAllowedUrl(validated.url)) {
        return {
          isValid: false,
          error: 'URL not allowed'
        }
      }
    }

    return {
      isValid: true,
      data
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Invalid API request format',
        details: error.issues
      }
    }

    return {
      isValid: false,
      error: 'API request validation failed'
    }
  }
}

export function validateStorageOperation(
  operation: string,
  key: string | string[],
  value?: any
): ValidationResult {
  try {
    // Validate operation type
    const validOperations = ['get', 'set', 'remove', 'clear']
    if (!validOperations.includes(operation)) {
      return {
        isValid: false,
        error: `Invalid storage operation: ${operation}`
      }
    }

    // Validate key
    if (operation !== 'clear') {
      if (!key) {
        return {
          isValid: false,
          error: 'Storage key is required'
        }
      }

      if (Array.isArray(key)) {
        for (const k of key) {
          if (!isValidStorageKey(k)) {
            return {
              isValid: false,
              error: `Invalid storage key: ${k}`
            }
          }
        }
      } else {
        if (!isValidStorageKey(key)) {
          return {
            isValid: false,
            error: `Invalid storage key: ${key}`
          }
        }
      }
    }

    // Validate value for set operations
    if (operation === 'set') {
      if (value === undefined) {
        return {
          isValid: false,
          error: 'Value is required for set operation'
        }
      }

      // Check value size (Chrome storage limit)
      const serialized = JSON.stringify(value)
      if (serialized.length > 8192) { // 8KB limit per value
        return {
          isValid: false,
          error: 'Value too large for storage'
        }
      }

      // Validate value doesn't contain sensitive data
      if (containsSensitiveData(serialized)) {
        return {
          isValid: false,
          error: 'Value contains sensitive data'
        }
      }
    }

    return {
      isValid: true
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Storage operation validation failed'
    }
  }
}

// Input sanitization functions
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 10000) // Limit length
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    
    // Only allow HTTPS and specific HTTP localhost
    if (parsed.protocol !== 'https:' && 
        !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
      throw new Error('Invalid protocol')
    }

    return parsed.toString()
  } catch {
    throw new Error('Invalid URL format')
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Only allow safe characters
    .replace(/\.+/g, '.') // Collapse multiple dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255) // Limit length
}

// Helper validation functions
function containsSuspiciousContent(text: string, context?: any): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /Function\s*\(/i
  ]

  return suspiciousPatterns.some(pattern => pattern.test(text))
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    
    // Allowed domains
    const allowedDomains = [
      'jsonplaceholder.typicode.com',
      'api.example.com',
      'localhost'
    ]

    return allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

function isValidStorageKey(key: string): boolean {
  if (typeof key !== 'string' || key.length === 0) {
    return false
  }

  // Check key length
  if (key.length > 255) {
    return false
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
  if (invalidChars.test(key)) {
    return false
  }

  // Reserved keys that shouldn't be overwritten
  const reservedKeys = ['version', 'install_time', 'user_settings']
  if (reservedKeys.includes(key)) {
    return false
  }

  return true
}

function containsSensitiveData(data: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /api[_-]?key/i,
    /secret/i,
    /token/i,
    /credit[_-]?card/i,
    /ssn|social[_-]?security/i,
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card pattern
    /\b\d{3}-?\d{2}-?\d{4}\b/ // SSN pattern
  ]

  return sensitivePatterns.some(pattern => pattern.test(data))
}

// Validation for specific data types
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validateJSON(jsonString: string): ValidationResult {
  try {
    JSON.parse(jsonString)
    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid JSON format'
    }
  }
}

// Create validation middleware for API calls
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ValidationResult => {
    try {
      const validated = schema.parse(data)
      return {
        isValid: true,
        data: validated
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          error: error.issues[0]?.message || 'Validation failed',
          details: error.issues
        }
      }

      return {
        isValid: false,
        error: 'Unknown validation error'
      }
    }
  }
}
// API Handler - Handles external API calls through background script
// Background script can bypass CORS, so this acts as a proxy

import { RateLimitService } from "../services/rate-limit-service"
import { validateApiRequest } from "../utils/validation"
import type { ApiResponse } from "../types"

const rateLimitService = new RateLimitService()

export async function handleApiMessage(
  endpoint: string,
  data: any,
  sendResponse: Function
): Promise<void> {
  console.log("Handling API request to:", endpoint)

  try {
    // 1. Validate API request
    const validation = validateApiRequest(endpoint, data)
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid API request')
    }

    // 2. Check rate limits
    const rateLimitKey = `api:${endpoint}`
    if (!rateLimitService.canMakeRequest(rateLimitKey, 100, 60000)) { // 100 requests per minute
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    // 3. Make API call (background script bypasses CORS)
    const response = await makeApiCall(endpoint, data)

    sendResponse({
      success: true,
      data: response,
      timestamp: Date.now()
    })

    console.log("API request completed successfully")

  } catch (error) {
    console.error('API request failed:', error)
    
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'API request failed',
      code: (error as any)?.code || 'API_ERROR',
      timestamp: Date.now()
    })
  }
}

async function makeApiCall(endpoint: string, data: any): Promise<ApiResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    let url: string
    let options: RequestInit = {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `ChromeExtensionStarter/${chrome.runtime.getManifest().version}`
      }
    }

    // Configure based on endpoint
    switch (endpoint) {
      case 'example-api':
        url = 'https://jsonplaceholder.typicode.com/posts'
        options.method = 'GET'
        break

      case 'custom-endpoint':
        url = data.url
        options.method = data.method || 'GET'
        if (data.body) {
          options.body = JSON.stringify(data.body)
        }
        if (data.headers) {
          options.headers = { ...options.headers, ...data.headers }
        }
        break

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`)
    }

    const response = await fetch(url, options)
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const responseData = await response.json()
    
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    }

  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }
    
    throw new Error('Unknown API error occurred')
  }
}
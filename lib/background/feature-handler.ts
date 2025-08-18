// Feature Handler - Contains business logic for main feature processing
// This is where the actual work happens, separated from background script

import { ApiService } from "../services/api-service"
import { CacheService } from "../services/cache-service"
import { validateInput } from "../utils/validation"
import type { FeatureData, ProcessResult } from "../types"

export async function handleFeatureMessage(
  data: any,
  sendResponse: Function
): Promise<void> {
  console.log("Processing feature request:", data)

  try {
    // 1. Input validation
    const validationResult = validateInput(data)
    if (!validationResult.isValid) {
      throw new Error(validationResult.error || 'Invalid input')
    }

    // 2. Check cache first
    const cacheService = new CacheService()
    const cacheKey = `feature:${JSON.stringify(data)}`
    const cached = await cacheService.get<ProcessResult>(cacheKey)
    
    if (cached) {
      console.log("Returning cached result")
      sendResponse({ success: true, data: cached, cached: true })
      return
    }

    // 3. Process with API service
    const apiService = new ApiService()
    const result = await apiService.processFeature(data as FeatureData)

    // 4. Cache the result
    await cacheService.set(cacheKey, result, 300000) // 5 minutes TTL

    // 5. Send response
    sendResponse({ 
      success: true, 
      data: result,
      cached: false,
      timestamp: Date.now()
    })

    console.log("Feature processed successfully")

  } catch (error) {
    console.error('Feature processing failed:', error)
    
    // Send structured error response
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      code: (error as any)?.code || 'FEATURE_ERROR',
      timestamp: Date.now()
    })
  }
}
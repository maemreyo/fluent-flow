// API Service - Handles external API integration
// Pure business logic, no Chrome APIs

import { BaseService } from "./base-service"
import type { FeatureData, ProcessResult, ApiConfig } from "../types"

export class ApiService extends BaseService {
  private config: ApiConfig

  constructor(config?: ApiConfig) {
    super()
    this.config = config || this.getDefaultConfig()
  }

  async processFeature(data: FeatureData): Promise<ProcessResult> {
    try {
      console.log("Processing feature with API service:", data)

      // Simulate processing time
      await this.delay(1000 + Math.random() * 2000)

      // Example API call
      const result = await this.makeRequest<any>(
        `${this.config.baseUrl}/process`,
        {
          method: 'POST',
          body: JSON.stringify({
            input: data.input,
            options: data.options || {}
          }),
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
            'X-Client-Version': '1.0.0'
          }
        },
        this.config.timeout
      )

      return this.transformResponse(data, result)

    } catch (error) {
      this.handleError(error, 'Feature processing')
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeRequest(
        `${this.config.baseUrl}/health`,
        { method: 'GET' },
        5000 // Short timeout for health check
      )
      return true
    } catch (error) {
      console.warn('API connection validation failed:', error)
      return false
    }
  }

  async getApiStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unavailable'
    responseTime: number
    lastChecked: number
  }> {
    const startTime = Date.now()
    
    try {
      await this.validateConnection()
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: startTime
      }
    } catch (error) {
      return {
        status: 'unavailable',
        responseTime: Date.now() - startTime,
        lastChecked: startTime
      }
    }
  }

  private getDefaultConfig(): ApiConfig {
    return {
      baseUrl: 'https://jsonplaceholder.typicode.com', // Example API
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000
    }
  }

  private transformResponse(input: FeatureData, apiResponse: any): ProcessResult {
    // Transform API response to internal format
    return {
      id: `processed_${Date.now()}`,
      input: input.input,
      output: {
        processed: true,
        result: apiResponse.title || apiResponse.data || 'Processed successfully',
        metadata: {
          apiResponseId: apiResponse.id,
          processedAt: new Date().toISOString(),
          processingTime: Math.random() * 1000 // Simulated processing time
        }
      },
      success: true,
      timestamp: Date.now()
    }
  }

  // Example method for different types of processing
  async processText(text: string): Promise<string> {
    try {
      const response = await this.makeRequest<any>(
        `${this.config.baseUrl}/posts/1`, // Example endpoint
        { method: 'GET' }
      )

      // Simulate text processing
      return `Processed: ${text} - ${response.title}`

    } catch (error) {
      this.handleError(error, 'Text processing')
    }
  }

  async processImage(imageData: string): Promise<string> {
    try {
      // Simulate image processing
      await this.delay(2000)
      
      return `Image processed successfully. Size: ${imageData.length} bytes`

    } catch (error) {
      this.handleError(error, 'Image processing')
    }
  }

  // Batch processing with retry logic
  async processBatch(items: FeatureData[]): Promise<ProcessResult[]> {
    const results: ProcessResult[] = []
    const batchSize = 5 // Process in batches of 5

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      
      const batchPromises = batch.map(item => 
        this.retry(() => this.processFeature(item), 3, 1000)
      )

      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      } catch (error) {
        console.error(`Batch processing failed for items ${i}-${i + batchSize}:`, error)
        
        // Add failed results
        batch.forEach(item => {
          results.push({
            id: `failed_${Date.now()}_${Math.random()}`,
            input: item.input,
            output: {
              processed: false,
              result: 'Processing failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            success: false,
            timestamp: Date.now()
          })
        })
      }

      // Small delay between batches
      if (i + batchSize < items.length) {
        await this.delay(500)
      }
    }

    return results
  }
}
// Improved Base Service - Using ky for HTTP requests and modern patterns
// Replaces custom fetch implementation with battle-tested HTTP client

import ky, { type KyInstance, type Options as KyOptions } from 'ky'
import type { ApiResponse } from '../types'

export abstract class ImprovedBaseService {
  protected client: KyInstance
  protected baseUrl: string

  constructor(baseUrl: string = '', options: KyOptions = {}) {
    this.baseUrl = baseUrl
    
    // Create ky instance with default configuration
    this.client = ky.create({
      prefixUrl: baseUrl,
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ['get', 'post', 'put', 'delete'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504]
      },
      hooks: {
        beforeRequest: [
          (request) => {
            // Add default headers
            request.headers.set('Content-Type', 'application/json')
            
            // Add user agent for extension
            request.headers.set('User-Agent', 'ChromeExtension/1.0.0')
          }
        ],
        beforeError: [
          (error) => {
            // Transform HTTP errors to our format
            const { response } = error
            if (response?.body) {
              error.name = 'HTTPError'
              error.message = `HTTP ${response.status}: ${response.statusText}`
            }
            return error
          }
        ]
      },
      ...options
    })
  }

  // GET request with type safety
  protected async get<T>(url: string, options?: KyOptions): Promise<T> {
    try {
      return await this.client.get(url, options).json<T>()
    } catch (error) {
      throw this.handleError(error, 'GET request')
    }
  }

  // POST request with type safety
  protected async post<T>(url: string, data?: any, options?: KyOptions): Promise<T> {
    try {
      return await this.client.post(url, {
        json: data,
        ...options
      }).json<T>()
    } catch (error) {
      throw this.handleError(error, 'POST request')
    }
  }

  // PUT request with type safety
  protected async put<T>(url: string, data?: any, options?: KyOptions): Promise<T> {
    try {
      return await this.client.put(url, {
        json: data,
        ...options
      }).json<T>()
    } catch (error) {
      throw this.handleError(error, 'PUT request')
    }
  }

  // DELETE request with type safety
  protected async delete<T>(url: string, options?: KyOptions): Promise<T> {
    try {
      return await this.client.delete(url, options).json<T>()
    } catch (error) {
      throw this.handleError(error, 'DELETE request')
    }
  }

  // Stream response for large data
  protected async getStream(url: string, options?: KyOptions): Promise<ReadableStream> {
    try {
      const response = await this.client.get(url, options)
      return response.body!
    } catch (error) {
      throw this.handleError(error, 'Stream request')
    }
  }

  // Download file with progress
  protected async downloadFile(
    url: string, 
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Blob> {
    try {
      const response = await this.client.get(url)
      
      if (!response.body) {
        throw new Error('No response body')
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        chunks.push(value)
        loaded += value.length
        
        if (onProgress && total > 0) {
          onProgress(loaded, total)
        }
      }

      // Combine all chunks into a single Uint8Array
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      return new Blob([result])
    } catch (error) {
      throw this.handleError(error, 'File download')
    }
  }

  // Health check endpoint
  protected async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('health', { timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  // Batch requests with concurrency control
  protected async batch<T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = []
    const executing: Promise<void>[] = []

    for (const request of requests) {
      const promise = request().then(result => {
        results.push(result)
      })

      executing.push(promise)

      if (executing.length >= concurrency) {
        await Promise.race(executing)
        executing.splice(executing.findIndex(p => p === promise), 1)
      }
    }

    await Promise.all(executing)
    return results
  }

  // Enhanced error handling
  protected handleError(error: any, context: string): never {
    console.error(`${context} error:`, error)
    
    // Ky-specific errors
    if (error.name === 'HTTPError') {
      const status = error.response?.status
      switch (status) {
        case 400:
          throw new Error('Bad request - please check your input')
        case 401:
          throw new Error('Authentication required')
        case 403:
          throw new Error('Access denied')
        case 404:
          throw new Error('Resource not found')
        case 429:
          throw new Error('Rate limit exceeded - please try again later')
        case 500:
          throw new Error('Server error - please try again later')
        case 502:
        case 503:
        case 504:
          throw new Error('Service temporarily unavailable')
        default:
          throw new Error(`HTTP ${status}: ${error.message}`)
      }
    }
    
    // Network errors
    if (error.name === 'TimeoutError') {
      throw new Error('Request timeout - please try again')
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error - please check your connection')
    }
    
    // Generic error
    throw new Error(`${context} failed: ${error.message || 'Unknown error'}`)
  }

  // Add authentication token
  protected setAuthToken(token: string): void {
    this.client = this.client.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set('Authorization', `Bearer ${token}`)
          }
        ]
      }
    })
  }

  // Add API key
  protected setApiKey(apiKey: string, headerName: string = 'X-API-Key'): void {
    this.client = this.client.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set(headerName, apiKey)
          }
        ]
      }
    })
  }

  // Create a new instance for different base URL
  protected createClient(baseUrl: string, options?: KyOptions): KyInstance {
    return ky.create({
      prefixUrl: baseUrl,
      timeout: 30000,
      retry: 3,
      ...options
    })
  }
}
// Base Service - Abstract base class for all services
// Provides common functionality like error handling and HTTP requests

export abstract class BaseService {
  protected handleError(error: any, context: string): never {
    console.error(`${context} error:`, error)
    
    // Network-specific errors
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again')
    }
    
    if (!navigator.onLine) {
      throw new Error('No internet connection')
    }
    
    // API-specific errors
    if (error.status) {
      switch (error.status) {
        case 401:
          throw new Error('Authentication failed')
        case 403:
          throw new Error('Access denied')
        case 404:
          throw new Error('Resource not found')
        case 429:
          throw new Error('Rate limit exceeded - please try again later')
        case 500:
          throw new Error('Server error - please try again later')
        default:
          throw new Error(`HTTP ${error.status}: ${error.statusText || 'Request failed'}`)
      }
    }
    
    throw new Error(`${context} failed: ${error.message || 'Unknown error'}`)
  }

  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    timeout: number = 30000
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        error.statusText = response.statusText
        throw error
      }

      // Handle different content types
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      } else if (contentType?.includes('text/')) {
        return await response.text() as unknown as T
      } else {
        return await response.blob() as unknown as T
      }

    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    
    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let lastError: Error

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await operation()
          resolve(result)
          return
        } catch (error) {
          lastError = error as Error
          console.warn(`Attempt ${attempt} failed:`, error)

          if (attempt < maxRetries) {
            // Exponential backoff
            const delay = delayMs * Math.pow(2, attempt - 1)
            await this.delay(delay)
          }
        }
      }

      reject(lastError!)
    })
  }
}
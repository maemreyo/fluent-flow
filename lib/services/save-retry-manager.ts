// Save Retry Manager
// Handles retry logic with exponential backoff for failed save operations

import type { SavedLoop } from '../types/fluent-flow-types'
import type { SaveResponse } from '../types/save-response-types'
import { isRetryableError } from '../types/save-response-types'

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
}

export class SaveRetryManager {
  private maxRetries: number
  private baseDelay: number
  private maxDelay: number
  private backoffMultiplier: number
  private activeRetries = new Map<string, RetryState>()

  constructor(options: RetryOptions = {}) {
    this.maxRetries = options.maxRetries || 3
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 10000
    this.backoffMultiplier = options.backoffMultiplier || 2
  }

  public async retrySave(
    loop: SavedLoop, 
    saveFunction: (loop: SavedLoop) => Promise<SaveResponse>,
    attempt: number = 1
  ): Promise<SaveResponse> {
    const retryId = `${loop.id}-${Date.now()}`
    
    this.activeRetries.set(retryId, {
      loopId: loop.id,
      attempt,
      startTime: Date.now(),
      lastError: null
    })

    try {
      console.log(`FluentFlow: Retry attempt ${attempt}/${this.maxRetries} for loop: ${loop.title}`)
      
      const result = await saveFunction(loop)
      
      // Success - clean up retry state
      this.activeRetries.delete(retryId)
      return result
      
    } catch (error: any) {
      console.error(`FluentFlow: Retry attempt ${attempt} failed:`, error)
      
      const retryState = this.activeRetries.get(retryId)!
      retryState.lastError = error
      retryState.attempt = attempt
      
      // Check if we should retry
      if (attempt >= this.maxRetries) {
        this.activeRetries.delete(retryId)
        return {
          status: 'error',
          error: `Failed after ${this.maxRetries} attempts: ${error.message}`,
          errorType: error.type || 'unknown'
        }
      }
      
      // Check if error is retryable
      if (!this.isRetryableError(error)) {
        this.activeRetries.delete(retryId)
        return {
          status: 'error',
          error: error.message,
          errorType: error.type || 'unknown'
        }
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1),
        this.maxDelay
      )
      
      console.log(`FluentFlow: Waiting ${delay}ms before retry ${attempt + 1}`)
      await this.sleep(delay)
      
      // Recursive retry
      return this.retrySave(loop, saveFunction, attempt + 1)
    }
  }

  public async retrySpecificLoop(loopId: string, saveFunction: (loop: SavedLoop) => Promise<SaveResponse>): Promise<SaveResponse> {
    // This would be called when user clicks retry button
    // We need to get the loop data from storage first
    try {
      const loop = await this.getLoopFromStorage(loopId)
      if (!loop) {
        return {
          status: 'error',
          error: 'Loop not found for retry',
          errorType: 'validation'
        }
      }
      
      return this.retrySave(loop, saveFunction)
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message,
        errorType: 'unknown'
      }
    }
  }

  public getActiveRetries(): RetryState[] {
    return Array.from(this.activeRetries.values())
  }

  public getRetryState(loopId: string): RetryState | null {
    for (const [, state] of this.activeRetries) {
      if (state.loopId === loopId) {
        return state
      }
    }
    return null
  }

  public cancelRetry(loopId: string): void {
    for (const [retryId, state] of this.activeRetries) {
      if (state.loopId === loopId) {
        this.activeRetries.delete(retryId)
        break
      }
    }
  }

  private isRetryableError(error: any): boolean {
    if (error.retryable !== undefined) {
      return error.retryable
    }
    
    const retryableTypes = ['network', 'server']
    return retryableTypes.includes(error.type)
  }

  private async getLoopFromStorage(loopId: string): Promise<SavedLoop | null> {
    try {
      const result = await chrome.storage.local.get('fluent_flow_saved_loops')
      const loops: SavedLoop[] = result.fluent_flow_saved_loops || []
      return loops.find(loop => loop.id === loopId) || null
    } catch (error) {
      console.error('Failed to get loop from storage:', error)
      return null
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export interface RetryState {
  loopId: string
  attempt: number
  startTime: number
  lastError: any
}

// Singleton instance for global use
let retryManagerInstance: SaveRetryManager | null = null

export function getRetryManager(options?: RetryOptions): SaveRetryManager {
  if (!retryManagerInstance) {
    retryManagerInstance = new SaveRetryManager(options)
  }
  return retryManagerInstance
}

// Helper function to create user-friendly retry handler
export function createRetryHandler(
  loop: SavedLoop,
  saveFunction: (loop: SavedLoop) => Promise<SaveResponse>,
  onProgress?: (attempt: number, maxAttempts: number) => void
) {
  return async (): Promise<SaveResponse> => {
    const retryManager = getRetryManager()
    
    // Wrap saveFunction to include progress callback
    const wrappedSaveFunction = async (loop: SavedLoop): Promise<SaveResponse> => {
      const result = await saveFunction(loop)
      return result
    }
    
    return retryManager.retrySave(loop, wrappedSaveFunction)
  }
}
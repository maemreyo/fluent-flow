// Save Response Types for Enhanced User Feedback
// These types define the structure for save operation responses

export interface SaveResponse {
  status: 'success' | 'local_fallback' | 'error'
  message?: string
  error?: string
  errorType?: 'auth' | 'network' | 'validation' | 'server' | 'unknown'
  data?: {
    savedToCloud: boolean
    savedLocally: boolean  
    sessionId?: string
    fallbackReason?: string
  }
}

export interface SaveError extends Error {
  type: 'auth' | 'network' | 'validation' | 'server' | 'unknown'
  retryable: boolean
  userMessage: string
}

export const SaveErrorMessages = {
  auth: "Please sign in to sync your loops across devices",
  network: "Connection issue - loop saved locally instead", 
  validation: "Invalid loop data - please try creating the loop again",
  server: "Server temporarily unavailable - saved locally",
  unknown: "An unexpected error occurred"
}

export const SaveSuccessMessages = {
  cloud: "Loop saved successfully and synced to cloud",
  local: "Loop saved offline - will sync when connection is restored",
  local_fallback: "Loop saved locally (not signed in)"
}

// Helper function to create standardized save responses
export function createSaveResponse(
  status: SaveResponse['status'],
  options: {
    error?: string
    errorType?: SaveResponse['errorType'] 
    savedToCloud?: boolean
    savedLocally?: boolean
    sessionId?: string
    fallbackReason?: string
  } = {}
): SaveResponse {
  const response: SaveResponse = { status }
  
  if (status === 'success') {
    response.message = options.savedToCloud 
      ? SaveSuccessMessages.cloud 
      : SaveSuccessMessages.local
    response.data = {
      savedToCloud: options.savedToCloud || false,
      savedLocally: options.savedLocally || true,
      sessionId: options.sessionId
    }
  } else if (status === 'local_fallback') {
    response.message = SaveSuccessMessages.local_fallback
    response.data = {
      savedToCloud: false,
      savedLocally: true,
      fallbackReason: options.fallbackReason || 'not_authenticated'
    }
  } else if (status === 'error') {
    response.error = options.error || SaveErrorMessages.unknown
    response.errorType = options.errorType || 'unknown'
    response.data = {
      savedToCloud: false,
      savedLocally: options.savedLocally || false
    }
  }
  
  return response
}

// Helper function to determine if an error is retryable
export function isRetryableError(errorType: SaveResponse['errorType']): boolean {
  return ['network', 'server'].includes(errorType || '')
}

// Helper to get user-friendly error message
export function getUserErrorMessage(errorType: SaveResponse['errorType']): string {
  return SaveErrorMessages[errorType || 'unknown'] || SaveErrorMessages.unknown
}
// Recording Handler for FluentFlow Background Script
// Manages audio recording storage, retrieval, and deletion

import { getFluentFlowStore } from '../stores/fluent-flow-supabase-store'
import type { AudioRecording } from '../types/fluent-flow-types'
import { getAuthHandler } from './auth-handler'

export interface SavedRecording extends AudioRecording {
  id: string
  videoId: string
  sessionId?: string
  audioDataBase64: string // Base64 encoded audio data for storage
  fileName: string
  title?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface RecordingMessage {
  operation: 'save' | 'load' | 'list' | 'delete' | 'update'
  data: any
}

/**
 * Main handler for recording-related messages from content script
 */
export async function handleRecordingMessage(
  operation: 'save' | 'load' | 'list' | 'delete' | 'update',
  data: any,
  sendResponse?: Function
): Promise<void> {
  console.log('FluentFlow: Handling recording operation:', operation, {
    dataSize: data?.audioData?.size || 'no-size'
  })

  try {
    let result: any

    switch (operation) {
      case 'save':
        result = await saveRecording(data)
        break

      case 'load':
        result = await loadRecording(data.id)
        break

      case 'list':
        // For sidepanel, return serializable format (Base64 instead of Blob)
        const recordings = await getAllRecordings(data?.videoId)
        result = recordings.map(recording => ({
          ...recording,
          audioData: undefined, // Remove Blob object
          // Keep Base64 data for reconstruction in sidepanel
          audioDataBase64: recording.audioDataBase64
        }))
        break

      case 'delete':
        result = await deleteRecording(data.id)
        break

      case 'update':
        result = await updateRecording(data.id, data.updates)
        break

      default:
        throw new Error(`Unknown recording operation: ${operation}`)
    }

    if (sendResponse) {
      sendResponse({
        success: true,
        data: result,
        timestamp: Date.now()
      })
    }
  } catch (error) {
    console.error('Recording operation failed:', error)

    if (sendResponse) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Recording operation failed',
        code: 'RECORDING_ERROR',
        timestamp: Date.now()
      })
    }
  }
}

/**
 * Save audio recording to local storage with metadata
 */
const CHUNK_SIZE = 1024 * 1024 // 1MB chunks for large recordings
const MAX_MEMORY_SIZE = 10 * 1024 * 1024 // 10MB threshold for chunking

function chunkBase64(base64Data: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < base64Data.length; i += chunkSize) {
    chunks.push(base64Data.slice(i, i + chunkSize))
  }
  return chunks
}

async function saveChunkedRecording(recordingId: string, base64Data: string): Promise<void> {
  const chunks = chunkBase64(base64Data, CHUNK_SIZE)
  const chunkPromises = chunks.map((chunk, index) => {
    const chunkKey = `fluent_flow_recording_chunk_${recordingId}_${index}`
    return chrome.storage.local.set({ [chunkKey]: chunk })
  })

  await Promise.all(chunkPromises)

  const metaKey = `fluent_flow_recording_meta_${recordingId}`
  await chrome.storage.local.set({
    [metaKey]: {
      chunkCount: chunks.length,
      totalSize: base64Data.length
    }
  })
}

async function loadChunkedRecording(recordingId: string): Promise<string | null> {
  try {
    const metaKey = `fluent_flow_recording_meta_${recordingId}`
    const metaResult = await chrome.storage.local.get(metaKey)
    const meta = metaResult[metaKey]

    if (!meta) return null

    const chunkKeys = Array.from({ length: meta.chunkCount }, (_, i) => {
      return `fluent_flow_recording_chunk_${recordingId}_${i}`
    })

    const chunksResult = await chrome.storage.local.get(chunkKeys)
    const chunks = chunkKeys.map(key => chunksResult[key]).filter(Boolean)

    return chunks.join('')
  } catch (error) {
    console.error('Failed to load chunked recording:', error)
    return null
  }
}

async function saveRecording(recordingData: {
  audioDataBase64: string
  audioSize: number
  videoId: string
  sessionId?: string
  duration: number
  title?: string
  description?: string
  timestamp?: number
}): Promise<SavedRecording> {
  try {
    const authHandler = getAuthHandler()
    const authState = await authHandler.refreshAuthState()

    const recordingId = `recording_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const fileName = `recording_${Date.now()}.webm`

    // Check if recording is large and needs chunking
    const shouldChunk = recordingData.audioSize > MAX_MEMORY_SIZE

    let audioData: Blob
    if (shouldChunk) {
      // For large recordings, don't keep full Blob in memory
      audioData = new Blob() // Empty placeholder
    } else {
      audioData = base64ToBlob(recordingData.audioDataBase64, 'audio/webm')
    }

    const savedRecording: SavedRecording = {
      id: recordingId,
      videoId: recordingData.videoId,
      sessionId: recordingData.sessionId,
      audioData,
      audioDataBase64: shouldChunk ? '' : recordingData.audioDataBase64,
      fileName,
      duration: recordingData.duration,
      title: recordingData.title || `Recording ${new Date().toLocaleString()}`,
      description: recordingData.description,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // If user is authenticated, try to save to Supabase
    if (authState.isAuthenticated && authState.user && recordingData.sessionId) {
      try {
        const store = getFluentFlowStore()

        const audioRecording = {
          id: recordingId,
          videoId: recordingData.videoId,
          audioData: shouldChunk
            ? base64ToBlob(recordingData.audioDataBase64, 'audio/webm')
            : audioData,
          duration: recordingData.duration,
          createdAt: savedRecording.createdAt,
          updatedAt: savedRecording.updatedAt
        }

        const supabaseRecordingId = await store.supabaseService.saveRecording(
          recordingData.sessionId,
          audioRecording
        )

        return savedRecording
      } catch (supabaseError) {
        console.error(
          'FluentFlow: Failed to save to Supabase, falling back to local storage:',
          supabaseError
        )
      }
    }

    // Local storage fallback with chunking for large files
    if (shouldChunk) {
      await saveChunkedRecording(recordingId, recordingData.audioDataBase64)
    } else {
      const storageKey = `fluent_flow_recording_${recordingId}`
      const storageData = {
        ...savedRecording,
        audioData: undefined
      }
      await chrome.storage.local.set({ [storageKey]: storageData })
    }

    await updateRecordingsIndex(savedRecording)
    return savedRecording
  } catch (error) {
    console.error('Failed to save recording:', error)
    throw new Error('Failed to save recording to storage')
  }
}

/**
 * Load a specific recording by ID
 */
async function loadRecording(recordingId: string): Promise<SavedRecording | null> {
  try {
    const storageKey = `fluent_flow_recording_${recordingId}`
    const result = await chrome.storage.local.get(storageKey)

    if (!result[storageKey]) {
      return null
    }

    const recordingData = result[storageKey]

    // Check if this is a chunked recording
    let audioDataBase64: string
    if (!recordingData.audioDataBase64) {
      // Try to load from chunks
      audioDataBase64 = (await loadChunkedRecording(recordingId)) || ''
    } else {
      audioDataBase64 = recordingData.audioDataBase64
    }

    // Convert base64 back to Blob only when needed (lazy loading)
    const audioData = audioDataBase64 ? base64ToBlob(audioDataBase64, 'audio/webm') : new Blob()

    return {
      ...recordingData,
      audioData,
      audioDataBase64,
      createdAt: new Date(recordingData.createdAt),
      updatedAt: new Date(recordingData.updatedAt)
    }
  } catch (error) {
    console.error('Failed to load recording:', error)
    return null
  }
}

/**
 * Get all recordings, optionally filtered by video ID
 */
async function getAllRecordings(videoId?: string): Promise<SavedRecording[]> {
  try {
    // Check if user is authenticated first
    const authHandler = getAuthHandler()
    const authState = await authHandler.refreshAuthState()

    console.log('FluentFlow: Getting recordings - auth state:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      userId: authState.user?.id
    })

    // If user is authenticated, try to get recordings from Supabase
    if (authState.isAuthenticated && authState.user) {
      try {
        console.log('FluentFlow: Getting recordings from Supabase for user:', authState.user.id)

        // Get Supabase store service
        const store = getFluentFlowStore()

        // Get user recordings using the new service method
        const audioRecordings = await store.supabaseService.getAllUserRecordings(
          authState.user.id,
          videoId
        )

        // Convert to SavedRecording format
        const savedRecordings: SavedRecording[] = audioRecordings.map(recording => ({
          id: recording.id,
          videoId: recording.videoId,
          sessionId: '', // Not available in the simplified AudioRecording format
          audioData: recording.audioData,
          audioDataBase64: '', // Not available from Supabase directly
          fileName: recording.id + '.webm',
          duration: recording.duration,
          title: `Recording ${new Date(recording.createdAt).toLocaleString()}`,
          description: '',
          createdAt: recording.createdAt,
          updatedAt: recording.updatedAt || recording.createdAt
        }))

        console.log('FluentFlow: Retrieved recordings from Supabase:', savedRecordings.length)
        return savedRecordings
      } catch (supabaseError) {
        console.error(
          'FluentFlow: Failed to get recordings from Supabase, falling back to local storage:',
          supabaseError
        )
        // Fall through to local storage backup
      }
    } else {
      console.log('FluentFlow: User not authenticated, using local storage')
    }

    // Fallback to local storage (for unauthenticated users or when Supabase fails)
    const index = await getRecordingsIndex()
    let recordings = index

    // Filter by video ID if provided
    if (videoId) {
      recordings = recordings.filter(r => r.videoId === videoId)
    }

    // Load full recording data
    const fullRecordings: SavedRecording[] = []

    for (const recording of recordings) {
      const fullRecording = await loadRecording(recording.id)
      if (fullRecording) {
        fullRecordings.push(fullRecording)
      }
    }

    console.log('FluentFlow: Retrieved recordings from local storage:', fullRecordings.length)
    return fullRecordings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    console.error('Failed to get recordings:', error)
    return []
  }
}

/**
 * Delete a recording by ID
 */
async function deleteRecording(recordingId: string): Promise<boolean> {
  try {
    // Check if user is authenticated first
    const authHandler = getAuthHandler()
    const authState = await authHandler.refreshAuthState()

    console.log('FluentFlow: Deleting recording - auth state:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      userId: authState.user?.id,
      recordingId: recordingId
    })

    // If user is authenticated, try to delete from Supabase first
    if (authState.isAuthenticated && authState.user) {
      try {
        console.log('FluentFlow: Deleting recording from Supabase:', recordingId)

        // Get Supabase store service
        const store = getFluentFlowStore()

        // Delete from Supabase using the new service method
        const deleted = await store.supabaseService.deleteUserRecording(
          authState.user.id,
          recordingId
        )

        if (deleted) {
          console.log('FluentFlow: Recording deleted from Supabase successfully:', recordingId)
          return true
        } else {
          console.log('FluentFlow: Recording not found in Supabase, trying local storage')
          // Fall through to local storage deletion
        }
      } catch (supabaseError) {
        console.error(
          'FluentFlow: Failed to delete recording from Supabase, trying local storage:',
          supabaseError
        )
        // Fall through to local storage deletion
      }
    } else {
      console.log('FluentFlow: User not authenticated, deleting from local storage')
    }

    // Fallback to local storage deletion (for unauthenticated users or when Supabase fails)
    const storageKey = `fluent_flow_recording_${recordingId}`

    // Remove from storage
    await chrome.storage.local.remove(storageKey)

    // Update index
    await removeFromRecordingsIndex(recordingId)

    console.log('FluentFlow: Recording deleted from local storage successfully:', recordingId)
    return true
  } catch (error) {
    console.error('Failed to delete recording:', error)
    return false
  }
}

/**
 * Update recording metadata
 */
async function updateRecording(
  recordingId: string,
  updates: Partial<Pick<SavedRecording, 'title' | 'description'>>
): Promise<SavedRecording | null> {
  try {
    const recording = await loadRecording(recordingId)
    if (!recording) {
      throw new Error('Recording not found')
    }

    const updatedRecording: SavedRecording = {
      ...recording,
      ...updates,
      updatedAt: new Date()
    }

    // Save updated recording
    const storageKey = `fluent_flow_recording_${recordingId}`
    const storageData = {
      ...updatedRecording,
      audioData: undefined // Don't store the blob object
    }

    await chrome.storage.local.set({
      [storageKey]: storageData
    })

    // Update index
    await updateRecordingsIndex(updatedRecording)

    return updatedRecording
  } catch (error) {
    console.error('Failed to update recording:', error)
    throw error
  }
}

/**
 * Manage recordings index for efficient listing
 */
async function getRecordingsIndex(): Promise<
  Array<{
    id: string
    videoId: string
    title: string
    duration: number
    createdAt: string
  }>
> {
  try {
    const result = await chrome.storage.local.get('fluent_flow_recordings_index')
    return result.fluent_flow_recordings_index || []
  } catch (error) {
    console.error('Failed to get recordings index:', error)
    return []
  }
}

async function updateRecordingsIndex(recording: SavedRecording): Promise<void> {
  try {
    const index = await getRecordingsIndex()

    // Remove existing entry if updating
    const filteredIndex = index.filter(r => r.id !== recording.id)

    // Add new/updated entry
    const indexEntry = {
      id: recording.id,
      videoId: recording.videoId,
      title: recording.title || 'Untitled Recording',
      duration: recording.duration,
      createdAt: recording.createdAt.toISOString()
    }

    filteredIndex.unshift(indexEntry)

    // Keep only last 100 recordings to prevent storage bloat
    const trimmedIndex = filteredIndex.slice(0, 100)

    await chrome.storage.local.set({
      fluent_flow_recordings_index: trimmedIndex
    })
  } catch (error) {
    console.error('Failed to update recordings index:', error)
  }
}

async function removeFromRecordingsIndex(recordingId: string): Promise<void> {
  try {
    const index = await getRecordingsIndex()
    const filteredIndex = index.filter(r => r.id !== recordingId)

    await chrome.storage.local.set({
      fluent_flow_recordings_index: filteredIndex
    })
  } catch (error) {
    console.error('Failed to remove from recordings index:', error)
  }
}

/**
 * Utility functions for blob/base64 conversion
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (data:audio/webm;base64,)
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Storage management utilities
 */
export async function getStorageUsage(): Promise<{
  bytesUsed: number
  recordingsCount: number
  percentageUsed: number
}> {
  try {
    const usage = await chrome.storage.local.getBytesInUse()
    const index = await getRecordingsIndex()

    // Chrome storage quota is typically 5MB for local storage
    const quota = 5 * 1024 * 1024 // 5MB

    return {
      bytesUsed: usage,
      recordingsCount: index.length,
      percentageUsed: (usage / quota) * 100
    }
  } catch (error) {
    console.error('Failed to get storage usage:', error)
    return {
      bytesUsed: 0,
      recordingsCount: 0,
      percentageUsed: 0
    }
  }
}

export async function cleanupOldRecordings(daysToKeep: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const index = await getRecordingsIndex()
    let deletedCount = 0

    for (const recording of index) {
      const recordingDate = new Date(recording.createdAt)
      if (recordingDate < cutoffDate) {
        await deleteRecording(recording.id)
        deletedCount++
      }
    }

    console.log(`FluentFlow: Cleaned up ${deletedCount} old recordings`)
    return deletedCount
  } catch (error) {
    console.error('Failed to cleanup old recordings:', error)
    return 0
  }
}

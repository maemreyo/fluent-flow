// Recording Handler for FluentFlow Background Script
// Manages audio recording storage, retrieval, and deletion

import type { AudioRecording } from '../types/fluent-flow-types'

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
  console.log('FluentFlow: Handling recording operation:', operation, { dataSize: data?.audioData?.size || 'no-size' })

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
    const recordingId = `recording_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const fileName = `recording_${Date.now()}.webm`
    
    // Convert base64 back to Blob for immediate use
    const audioData = base64ToBlob(recordingData.audioDataBase64, 'audio/webm')
    
    const savedRecording: SavedRecording = {
      id: recordingId,
      videoId: recordingData.videoId,
      sessionId: recordingData.sessionId,
      audioData, // Blob for immediate use
      audioDataBase64: recordingData.audioDataBase64, // Base64 for storage
      fileName,
      duration: recordingData.duration,
      title: recordingData.title || `Recording ${new Date().toLocaleString()}`,
      description: recordingData.description,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Store in chrome.storage.local for persistence
    const storageKey = `fluent_flow_recording_${recordingId}`
    const storageData = {
      ...savedRecording,
      audioData: undefined, // Don't store the blob object itself
    }

    await chrome.storage.local.set({
      [storageKey]: storageData
    })

    // Update recordings index
    await updateRecordingsIndex(savedRecording)

    console.log('FluentFlow: Recording saved successfully', {
      id: recordingId,
      duration: recordingData.duration,
      size: recordingData.audioSize
    })

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
    
    // Convert base64 back to Blob
    const audioData = base64ToBlob(recordingData.audioDataBase64, 'audio/webm')
    
    return {
      ...recordingData,
      audioData,
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

    return fullRecordings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
    const storageKey = `fluent_flow_recording_${recordingId}`
    
    // Remove from storage
    await chrome.storage.local.remove(storageKey)
    
    // Update index
    await removeFromRecordingsIndex(recordingId)
    
    console.log('FluentFlow: Recording deleted successfully', recordingId)
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
      audioData: undefined, // Don't store the blob object
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
async function getRecordingsIndex(): Promise<Array<{
  id: string
  videoId: string
  title: string
  duration: number
  createdAt: string
}>> {
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
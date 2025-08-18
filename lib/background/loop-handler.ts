// Loop Management Handler
// Handles saving, loading, and managing saved loops

import type { SavedLoop } from '../types/fluent-flow-types'

const LOOPS_STORAGE_KEY = 'fluent_flow_saved_loops'

export async function handleLoopMessage(
  operation: 'save' | 'load' | 'delete' | 'list' | 'apply',
  data: any,
  sendResponse?: Function
): Promise<void> {
  console.log('FluentFlow: Handling loop operation:', operation, data)

  try {
    let result: any

    switch (operation) {
      case 'save':
        result = await saveLoop(data as SavedLoop)
        break

      case 'load':
        result = await loadLoop(data.id)
        break

      case 'list':
        result = await getAllLoops()
        break

      case 'delete':
        result = await deleteLoop(data.id)
        break

      case 'apply':
        result = await applyLoopToVideo(data.loopId, data.videoId)
        break

      default:
        throw new Error(`Unknown loop operation: ${operation}`)
    }

    if (sendResponse) {
      sendResponse({
        success: true,
        data: result,
        timestamp: Date.now()
      })
    }

  } catch (error) {
    console.error('Loop operation failed:', error)
    
    if (sendResponse) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Loop operation failed',
        code: 'LOOP_ERROR',
        timestamp: Date.now()
      })
    }
  }
}

async function saveLoop(loop: SavedLoop): Promise<SavedLoop> {
  console.log('FluentFlow: Saving loop:', loop)
  
  try {
    // Get existing loops
    const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    const existingLoops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
    
    // Check if loop already exists (by ID)
    const existingIndex = existingLoops.findIndex(l => l.id === loop.id)
    
    if (existingIndex >= 0) {
      // Update existing loop
      existingLoops[existingIndex] = { ...loop, updatedAt: new Date() }
    } else {
      // Add new loop
      existingLoops.push(loop)
    }
    
    // Save back to storage
    await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: existingLoops })
    
    console.log('FluentFlow: Loop saved successfully')
    return loop
    
  } catch (error) {
    console.error('FluentFlow: Failed to save loop:', error)
    throw new Error('Failed to save loop to storage')
  }
}

async function loadLoop(loopId: string): Promise<SavedLoop | null> {
  try {
    const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
    
    const loop = loops.find(l => l.id === loopId)
    return loop || null
    
  } catch (error) {
    console.error('FluentFlow: Failed to load loop:', error)
    throw new Error('Failed to load loop from storage')
  }
}

async function getAllLoops(): Promise<SavedLoop[]> {
  try {
    const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
    
    // Sort by creation date (newest first)
    return loops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
  } catch (error) {
    console.error('FluentFlow: Failed to load loops:', error)
    throw new Error('Failed to load loops from storage')
  }
}

async function deleteLoop(loopId: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
    
    const filteredLoops = loops.filter(l => l.id !== loopId)
    
    if (filteredLoops.length === loops.length) {
      // Loop not found
      return false
    }
    
    await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: filteredLoops })
    
    console.log('FluentFlow: Loop deleted successfully')
    return true
    
  } catch (error) {
    console.error('FluentFlow: Failed to delete loop:', error)
    throw new Error('Failed to delete loop from storage')
  }
}

async function applyLoopToVideo(loopId: string, videoId?: string): Promise<{ loop: SavedLoop, needsNavigation: boolean, targetUrl?: string }> {
  try {
    // Load the loop
    const loop = await loadLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }
    
    // Check if we need to navigate to the video
    let needsNavigation = false
    let targetUrl: string | undefined
    
    if (videoId && videoId !== loop.videoId) {
      needsNavigation = true
      targetUrl = loop.videoUrl
    }
    
    return {
      loop,
      needsNavigation,
      targetUrl
    }
    
  } catch (error) {
    console.error('FluentFlow: Failed to apply loop:', error)
    throw error
  }
}

// Helper function to get loops for a specific video
export async function getLoopsForVideo(videoId: string): Promise<SavedLoop[]> {
  try {
    const allLoops = await getAllLoops()
    return allLoops.filter(loop => loop.videoId === videoId)
  } catch (error) {
    console.error('FluentFlow: Failed to get loops for video:', error)
    return []
  }
}
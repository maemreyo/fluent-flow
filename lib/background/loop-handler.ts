// Loop Management Handler
// Handles saving, loading, and managing saved loops

import { supabase } from '../../fluent-flow-transcript-service/src/lib/supabase/client'
import { supabaseService } from '../stores/fluent-flow-supabase-store'
import type { SavedLoop } from '../types/fluent-flow-types'
import type { SaveResponse } from '../types/save-response-types'
import { createSaveResponse } from '../types/save-response-types'
import { getAuthHandler } from './auth-handler'

export async function handleLoopMessage(
  operation: 'save' | 'save_multiple' | 'load' | 'delete' | 'list' | 'apply',
  data: any,
  sendResponse?: Function
): Promise<void> {
  console.log('FluentFlow: Handling loop operation:', operation, data)

  try {
    let result: any

    switch (operation) {
      case 'save':
        // Note: This case now uses the centralized service via saveMultipleLoops
        result = await saveMultipleLoops([data as SavedLoop])
        break

      case 'save_multiple':
        result = await saveMultipleLoops(data as SavedLoop[])
        break

      // ... (other cases remain the same)
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

async function saveMultipleLoops(loops: SavedLoop[]): Promise<SaveResponse[]> {
  console.log('FluentFlow: Saving multiple loops via centralized supabaseService:', loops.length)

  const authHandler = getAuthHandler()
  const authState = await authHandler.refreshAuthState()

  if (!authState.isAuthenticated || !authState.user) {
    console.error('User not authenticated. Cannot save loops to Supabase.')
    return loops.map(() =>
      createSaveResponse('error', {
        error: 'User not authenticated',
        errorType: 'auth',
        savedToCloud: false,
        savedLocally: false
      })
    )
  }

  const userId = authState.user.id
  const results: SaveResponse[] = []

  for (const loop of loops) {
    try {
      // ✅ CORRECT: Call the centralized saveLoop function from the service
      const sessionId = await supabaseService.saveLoop(userId, loop)
      results.push(
        createSaveResponse('success', {
          savedToCloud: true,
          savedLocally: false,
          sessionId: sessionId || loop.id
        })
      )
    } catch (error) {
      console.error(`❌ FluentFlow: Failed to save loop ${loop.id} via supabaseService:`, error)
      results.push(
        createSaveResponse('error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'unknown',
          savedToCloud: false,
          savedLocally: false
        })
      )
    }
  }

  console.log('✅ FluentFlow: Completed saving', results.length, 'loops via supabaseService')
  return results
}

async function loadLoop(loopId: string): Promise<SavedLoop | null> {
  try {
    const authHandler = getAuthHandler()
    const authState = await authHandler.getAuthState()

    if (authState.isAuthenticated && authState.user) {
      // Load from Supabase
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select(
          `
          id,
          video_id,
          video_title,
          video_url,
          metadata,
          created_at,
          updated_at,
          loop_segments (
            id,
            start_time,
            end_time,
            label,
            description,
            created_at,
            updated_at
          )
        `
        )
        .eq('user_id', authState.user.id)
        .eq('metadata->savedLoop->>id', loopId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null
        }
        throw error
      }

      const loopMetadata = sessions.metadata as any
      const segment = sessions.loop_segments?.[0]

      if (loopMetadata?.savedLoop && segment) {
        return {
          id: loopMetadata.savedLoop.id,
          title: segment.label || loopMetadata.savedLoop.title || 'Untitled Loop',
          videoId: sessions.video_id,
          videoTitle: sessions.video_title,
          videoUrl: sessions.video_url,
          startTime: segment.start_time,
          endTime: segment.end_time,
          description: segment.description || loopMetadata.savedLoop.description,
          createdAt: new Date(loopMetadata.savedLoop.createdAt || sessions.created_at),
          updatedAt: new Date(loopMetadata.savedLoop.updatedAt || sessions.updated_at)
        }
      }

      return null
    } else {
      // // Fallback to chrome.storage for unauthenticated users
      // const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      // const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      // const loop = loops.find(l => l.id === loopId)
      // return loop || null
    }
  } catch (error) {
    console.error('FluentFlow: Failed to load loop:', error)

    // // Try fallback to chrome.storage on error
    // try {
    //   const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    //   const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
    //   const loop = loops.find(l => l.id === loopId)
    //   return loop || null
    // } catch (fallbackError) {
    //   console.error('Fallback to chrome.storage also failed:', fallbackError)
    //   return null
    // }
  }
}

async function getAllLoops(): Promise<SavedLoop[]> {
  try {
    const authHandler = getAuthHandler()
    const authState = await authHandler.getAuthState()

    if (authState.isAuthenticated && authState.user) {
      // Load from Supabase
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select(
          `
          id,
          video_id,
          video_title,
          video_url,
          metadata,
          created_at,
          updated_at,
          loop_segments (
            id,
            start_time,
            end_time,
            label,
            description,
            created_at,
            updated_at
          )
        `
        )
        .eq('user_id', authState.user.id)
        .not('metadata->savedLoop', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading loops from Supabase:', error)
        throw error
      }

      // Convert Supabase data to SavedLoop format
      const savedLoops: SavedLoop[] = []

      sessions?.forEach(session => {
        const loopMetadata = session.metadata as any
        const segment = session.loop_segments?.[0] // Get first segment

        if (loopMetadata?.savedLoop && segment) {
          const savedLoop: SavedLoop = {
            id: loopMetadata.savedLoop.id,
            title: segment.label || loopMetadata.savedLoop.title || 'Untitled Loop',
            videoId: session.video_id,
            videoTitle: session.video_title,
            videoUrl: session.video_url,
            startTime: segment.start_time,
            endTime: segment.end_time,
            description: segment.description || loopMetadata.savedLoop.description,
            createdAt: new Date(loopMetadata.savedLoop.createdAt || session.created_at),
            updatedAt: new Date(loopMetadata.savedLoop.updatedAt || session.updated_at)
          }
          savedLoops.push(savedLoop)
        }
      })

      return savedLoops
    } else {
      // // Fallback to chrome.storage for unauthenticated users
      // const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      // const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      // // Sort by creation date (newest first)
      // return loops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  } catch (error) {
    console.error('FluentFlow: Failed to load loops:', error)

    // // Try fallback to chrome.storage on error
    // try {
    //   const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    //   const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
    //   return loops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    // } catch (fallbackError) {
    //   console.error('Fallback to chrome.storage also failed:', fallbackError)
    //   return []
    // }
  }
}

async function deleteLoop(loopId: string): Promise<boolean> {
  try {
    const authHandler = getAuthHandler()
    const authState = await authHandler.getAuthState()

    if (authState.isAuthenticated && authState.user) {
      // Delete from Supabase
      const { data: sessions, error: selectError } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('metadata->savedLoop->>id', loopId)

      if (selectError) {
        throw selectError
      }

      if (!sessions || sessions.length === 0) {
        return false // Loop not found
      }

      // Delete the practice session (this will cascade delete loop_segments)
      const { error: deleteError } = await supabase
        .from('practice_sessions')
        .delete()
        .eq('id', sessions[0].id)

      if (deleteError) {
        throw deleteError
      }

      console.log('FluentFlow: Loop deleted from Supabase successfully')
      return true
    } else {
      // // Fallback to chrome.storage for unauthenticated users
      // const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      // const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []

      // const filteredLoops = loops.filter(l => l.id !== loopId)

      // if (filteredLoops.length === loops.length) {
      //   // Loop not found
      //   return false
      // }

      // await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: filteredLoops })

      // console.log('FluentFlow: Loop deleted from local storage successfully')
      return true
    }
  } catch (error) {
    console.error('FluentFlow: Failed to delete loop:', error)

    // // Try fallback to chrome.storage on error
    // try {
    //   const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
    //   const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []

    //   const filteredLoops = loops.filter(l => l.id !== loopId)

    //   if (filteredLoops.length === loops.length) {
    //     return false
    //   }

    //   await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: filteredLoops })
    //   return true
    // } catch (fallbackError) {
    //   console.error('Fallback to chrome.storage also failed:', fallbackError)
    //   throw new Error('Failed to delete loop')
    // }
  }
}

async function applyLoopToVideo(
  loopId: string,
  videoId?: string
): Promise<{ loop: SavedLoop; needsNavigation: boolean; targetUrl?: string }> {
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
    const authHandler = getAuthHandler()
    const authState = await authHandler.getAuthState()

    if (authState.isAuthenticated && authState.user) {
      // Load from Supabase
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select(
          `
          id,
          video_id,
          video_title,
          video_url,
          metadata,
          created_at,
          updated_at,
          loop_segments (
            id,
            start_time,
            end_time,
            label,
            description,
            created_at,
            updated_at
          )
        `
        )
        .eq('user_id', authState.user.id)
        .eq('video_id', videoId)
        .not('metadata->savedLoop', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading loops for video from Supabase:', error)
        throw error
      }

      // Convert Supabase data to SavedLoop format
      const savedLoops: SavedLoop[] = []

      sessions?.forEach(session => {
        const loopMetadata = session.metadata as any
        const segment = session.loop_segments?.[0]

        if (loopMetadata?.savedLoop && segment) {
          const savedLoop: SavedLoop = {
            id: loopMetadata.savedLoop.id,
            title: segment.label || loopMetadata.savedLoop.title || 'Untitled Loop',
            videoId: session.video_id,
            videoTitle: session.video_title,
            videoUrl: session.video_url,
            startTime: segment.start_time,
            endTime: segment.end_time,
            description: segment.description || loopMetadata.savedLoop.description,
            createdAt: new Date(loopMetadata.savedLoop.createdAt || session.created_at),
            updatedAt: new Date(loopMetadata.savedLoop.updatedAt || session.updated_at)
          }
          savedLoops.push(savedLoop)
        }
      })

      return savedLoops
    } else {
      // Fallback to chrome.storage for unauthenticated users
      const allLoops = await getAllLoops()
      return allLoops.filter(loop => loop.videoId === videoId)
    }
  } catch (error) {
    console.error('FluentFlow: Failed to get loops for video:', error)
  }
}

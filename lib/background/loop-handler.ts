// Loop Management Handler
// Handles saving, loading, and managing saved loops

import type { SavedLoop } from '../types/fluent-flow-types'
import type { SaveResponse } from '../types/save-response-types'
import { createSaveResponse } from '../types/save-response-types'

import { getAuthHandler } from './auth-handler'
import { supabase } from '../supabase/client'
const LOOPS_STORAGE_KEY = 'fluent_flow_saved_loops'

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
        result = await saveLoop(data as SavedLoop)
        break

      case 'save_multiple':
        result = await saveMultipleLoops(data as SavedLoop[])
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

async function saveLoop(loop: SavedLoop): Promise<SaveResponse> {
  console.log('FluentFlow: Saving loop:', loop)
  
  try {
    const authHandler = getAuthHandler()
    // Force refresh auth state to get latest session
    const authState = await authHandler.refreshAuthState()
    
    console.log('FluentFlow: Auth state in loop handler:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      userId: authState.user?.id
    })
    
    if (authState.isAuthenticated && authState.user) {
      try {
        // Save to Supabase: create or update practice session with loop segment
        const sessionData = {
          user_id: authState.user.id,
          video_id: loop.videoId,
          video_title: loop.videoTitle,
          video_url: loop.videoUrl,
          metadata: {
            savedLoop: {
              id: loop.id,
              title: loop.title,
              description: loop.description,
              createdAt: typeof loop.createdAt === 'string' ? loop.createdAt : loop.createdAt.toISOString(),
              updatedAt: typeof loop.updatedAt === 'string' ? loop.updatedAt : loop.updatedAt.toISOString(),
              // 🔧 FIX: Include transcript data in metadata
              hasTranscript: loop.hasTranscript || false,
              transcriptMetadata: loop.transcriptMetadata || null,
              transcript: loop.transcript || '',
              segments: loop.segments || [],
              language: loop.language || 'auto'
            }
          }
        }

        // Check if session already exists for this video and user
        const { data: existingSessions, error: queryError } = await supabase
          .from('practice_sessions')
          .select('id')
          .eq('user_id', authState.user.id)
          .eq('video_id', loop.videoId)
          .eq('metadata->savedLoop->>id', loop.id)

        if (queryError) {
          console.error('FluentFlow: Database query error:', queryError)
          throw new SaveError(queryError.message, 'server', true, 'Database query failed')
        }

        let sessionId: string

        if (existingSessions && existingSessions.length > 0) {
          // Update existing session
          sessionId = existingSessions[0].id
          const { error: updateError } = await supabase
            .from('practice_sessions')
            .update({
              ...sessionData,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)

          if (updateError) {
            console.error('FluentFlow: Session update error:', updateError)
            throw new SaveError(updateError.message, 'server', true, 'Failed to update session')
          }
        } else {
          // Create new session
          const { data: newSession, error: sessionError } = await supabase
            .from('practice_sessions')
            .insert(sessionData)
            .select('id')
            .single()

          if (sessionError) {
            console.error('FluentFlow: Session creation error:', sessionError)
            throw new SaveError(sessionError.message, 'server', true, 'Failed to create session')
          }
          sessionId = newSession.id
        }

        // Create or update loop segment
        const { data: existingSegments, error: segmentQueryError } = await supabase
          .from('loop_segments')
          .select('id')
          .eq('session_id', sessionId)

        if (segmentQueryError) {
          console.error('FluentFlow: Segment query error:', segmentQueryError)
          throw new SaveError(segmentQueryError.message, 'server', true, 'Segment query failed')
        }

        let segmentId: string

        if (existingSegments && existingSegments.length > 0) {
          // Update existing segment
          segmentId = existingSegments[0].id
          const { error: segmentUpdateError } = await supabase
            .from('loop_segments')
            .update({
              start_time: loop.startTime,
              end_time: loop.endTime,
              label: loop.title,
              description: loop.description,
              updated_at: new Date().toISOString()
            })
            .eq('id', segmentId)

          if (segmentUpdateError) {
            console.error('FluentFlow: Segment update error:', segmentUpdateError)
            throw new SaveError(segmentUpdateError.message, 'server', true, 'Failed to update segment')
          }
        } else {
          // Create new segment
          const { data: newSegment, error: segmentCreateError } = await supabase
            .from('loop_segments')
            .insert({
              session_id: sessionId,
              start_time: loop.startTime,
              end_time: loop.endTime,
              label: loop.title,
              description: loop.description
            })
            .select('id')
            .single()

          if (segmentCreateError) {
            console.error('FluentFlow: Segment creation error:', segmentCreateError)
            throw new SaveError(segmentCreateError.message, 'server', true, 'Failed to create segment')
          }
          segmentId = newSegment.id
        }

        // 🚀 NEW: Save transcript data to transcripts table if available
        if (loop.transcript && loop.transcript.trim() && loop.segments && loop.segments.length > 0) {
          console.log(`🔄 FluentFlow: Saving transcript data to database for loop ${loop.id}`)
          
          try {
            // Check if transcript already exists for this segment
            const { data: existingTranscript } = await supabase
              .from('transcripts')
              .select('id')
              .eq('video_id', loop.videoId)
              .eq('start_time', loop.startTime)
              .eq('end_time', loop.endTime)
              .maybeSingle()

            const transcriptData = {
              video_id: loop.videoId,
              start_time: loop.startTime,
              end_time: loop.endTime,
              segments: loop.segments,
              full_text: loop.transcript,
              language: loop.language || 'auto',
              metadata: {
                createdAt: new Date().toISOString(),
                source: 'fluent-flow-extension',
                loopId: loop.id
              }
            }

            let transcriptId: string

            if (existingTranscript) {
              // Update existing transcript
              await supabase
                .from('transcripts')
                .update({
                  ...transcriptData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingTranscript.id)
              transcriptId = existingTranscript.id
            } else {
              // Create new transcript
              const { data: newTranscript, error: transcriptError } = await supabase
                .from('transcripts')
                .insert(transcriptData)
                .select('id')
                .single()

              if (transcriptError) throw transcriptError
              transcriptId = newTranscript.id
            }

            // Link transcript to loop segment
            await supabase
              .from('loop_segments')
              .update({
                transcript_id: transcriptId,
                has_transcript: true,
                transcript_metadata: {
                  language: loop.language || 'auto',
                  segmentCount: loop.segments.length,
                  textLength: loop.transcript.length,
                  lastUpdated: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', segmentId)

            console.log(`✅ FluentFlow: Successfully saved transcript data to database for loop ${loop.id}`)
          } catch (transcriptError) {
            console.error(`❌ FluentFlow: Failed to save transcript data for loop ${loop.id}:`, transcriptError)
            // Don't throw - loop save should still succeed even if transcript fails
          }
        }

        console.log('FluentFlow: Loop saved to Supabase successfully')
        return createSaveResponse('success', {
          savedToCloud: true,
          savedLocally: false,
          sessionId
        })

      } catch (supabaseError: any) {
        console.error('FluentFlow: Supabase save failed, falling back to local storage:', supabaseError)
        
        // Fallback to local storage
        await saveToLocalStorage(loop)
        
        // Determine error type
        let errorType: SaveResponse['errorType'] = 'server'
        if (supabaseError.message?.includes('Auth')) {
          errorType = 'auth'
        } else if (supabaseError.message?.includes('network') || supabaseError.message?.includes('fetch')) {
          errorType = 'network'
        }
        
        return createSaveResponse('local_fallback', {
          savedToCloud: false,
          savedLocally: true,
          fallbackReason: `${errorType}_error`
        })
      }
    } else {
      // Fallback to chrome.storage for unauthenticated users
      await saveToLocalStorage(loop)
      console.log('FluentFlow: Loop saved to local storage (not authenticated)')
      
      return createSaveResponse('local_fallback', {
        savedToCloud: false,
        savedLocally: true,
        fallbackReason: 'not_authenticated'
      })
    }
  } catch (error: any) {
    console.error('FluentFlow: Critical save error:', error)
    
    // Try to save locally as last resort
    try {
      await saveToLocalStorage(loop)
      return createSaveResponse('local_fallback', {
        savedToCloud: false,
        savedLocally: true,
        fallbackReason: 'critical_error'
      })
    } catch (localError) {
      console.error('FluentFlow: Even local save failed:', localError)
      return createSaveResponse('error', {
        error: 'Failed to save loop even locally',
        errorType: 'unknown',
        savedToCloud: false,
        savedLocally: false
      })
    }
  }
}

// Helper function to save to local storage
async function saveToLocalStorage(loop: SavedLoop): Promise<void> {
  const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
  const existingLoops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
  
  const existingIndex = existingLoops.findIndex(l => l.id === loop.id)
  
  if (existingIndex >= 0) {
    existingLoops[existingIndex] = { ...loop, updatedAt: new Date() }
  } else {
    existingLoops.push(loop)
  }
  
  await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: existingLoops })
}

// Custom SaveError class
class SaveError extends Error {
  constructor(
    message: string,
    public type: 'auth' | 'network' | 'validation' | 'server' | 'unknown',
    public retryable: boolean,
    public userMessage: string
  ) {
    super(message)
    this.name = 'SaveError'
  }
}

async function loadLoop(loopId: string): Promise<SavedLoop | null> {
  try {
    const authHandler = getAuthHandler()
    const authState = await authHandler.getAuthState()
    
    if (authState.isAuthenticated && authState.user) {
      // Load from Supabase
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select(`
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
        `)
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
      // Fallback to chrome.storage for unauthenticated users
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      
      const loop = loops.find(l => l.id === loopId)
      return loop || null
    }
  } catch (error) {
    console.error('FluentFlow: Failed to load loop:', error)
    
    // Try fallback to chrome.storage on error
    try {
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      const loop = loops.find(l => l.id === loopId)
      return loop || null
    } catch (fallbackError) {
      console.error('Fallback to chrome.storage also failed:', fallbackError)
      return null
    }
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
        .select(`
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
        `)
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
      // Fallback to chrome.storage for unauthenticated users
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      
      // Sort by creation date (newest first)
      return loops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  } catch (error) {
    console.error('FluentFlow: Failed to load loops:', error)
    
    // Try fallback to chrome.storage on error
    try {
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      return loops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (fallbackError) {
      console.error('Fallback to chrome.storage also failed:', fallbackError)
      return []
    }
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
      // Fallback to chrome.storage for unauthenticated users
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      
      const filteredLoops = loops.filter(l => l.id !== loopId)
      
      if (filteredLoops.length === loops.length) {
        // Loop not found
        return false
      }
      
      await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: filteredLoops })
      
      console.log('FluentFlow: Loop deleted from local storage successfully')
      return true
    }
  } catch (error) {
    console.error('FluentFlow: Failed to delete loop:', error)
    
    // Try fallback to chrome.storage on error
    try {
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      
      const filteredLoops = loops.filter(l => l.id !== loopId)
      
      if (filteredLoops.length === loops.length) {
        return false
      }
      
      await chrome.storage.local.set({ [LOOPS_STORAGE_KEY]: filteredLoops })
      return true
    } catch (fallbackError) {
      console.error('Fallback to chrome.storage also failed:', fallbackError)
      throw new Error('Failed to delete loop')
    }
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
    const authHandler = getAuthHandler()
    const authState = await authHandler.getAuthState()
    
    if (authState.isAuthenticated && authState.user) {
      // Load from Supabase
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select(`
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
        `)
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
    
    // Try fallback to chrome.storage on error
    try {
      const result = await chrome.storage.local.get(LOOPS_STORAGE_KEY)
      const loops: SavedLoop[] = result[LOOPS_STORAGE_KEY] || []
      return loops.filter(loop => loop.videoId === videoId)
    } catch (fallbackError) {
      console.error('Fallback to chrome.storage also failed:', fallbackError)
      return []
    }
  }
}

async function saveMultipleLoops(loops: SavedLoop[]): Promise<SaveResponse[]> {
  console.log('FluentFlow: Saving multiple loops:', loops.length)
  
  const results: SaveResponse[] = []
  
  // Save each loop individually
  for (const loop of loops) {
    try {
      const saveResult = await saveLoop(loop)
      results.push(saveResult)
    } catch (error) {
      console.error('FluentFlow: Failed to save loop:', loop.id, error)
      results.push({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'unknown',
        data: {
          savedToCloud: false,
          savedLocally: false
        }
      })
    }
  }
  
  console.log('FluentFlow: Completed saving', results.length, 'loops')
  return results
}

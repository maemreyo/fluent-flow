/**
 * Content Script API Utility
 * Provides a unified way to communicate with content scripts for InnerTube API calls
 */

export interface ContentScriptResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface InnerTubeDataResponse {
  videoId: string
  captions: Array<{
    languageCode: string
    baseUrl: string
    name: string
  }>
}

/**
 * Call content script to get InnerTube data using browser context
 * This bypasses CORS and authentication issues by using the same origin
 */
export async function getInnerTubeDataFromContentScript(
  videoId: string, 
  language = 'en'
): Promise<ContentScriptResponse<InnerTubeDataResponse>> {
  try {
    // Get active YouTube tab
    const tabs = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: "*://www.youtube.com/watch*"
    })

    if (tabs.length === 0 || !tabs[0].id) {
      return {
        success: false,
        error: 'No active YouTube tab found'
      }
    }

    console.log('Sending message to content script for video:', videoId)
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tabs[0].id, {
      type: 'GET_INNERTUBE_DATA',
      videoId,
      language
    })

    if (response?.success) {
      console.log('✅ Got InnerTube data from content script')
      return response
    } else {
      console.warn('❌ Content script returned error:', response?.error)
      return {
        success: false,
        error: response?.error || 'Content script call failed'
      }
    }
  } catch (error) {
    console.error('❌ Failed to communicate with content script:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown content script error'
    }
  }
}

/**
 * Check if we can use content script approach
 * Returns true if we have access to chrome.tabs API and there's an active YouTube tab
 */
export async function canUseContentScript(): Promise<boolean> {
  try {
    if (!chrome?.tabs?.query) {
      return false
    }

    const tabs = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: "*://www.youtube.com/watch*"
    })

    return tabs.length > 0 && !!tabs[0].id
  } catch (error) {
    console.warn('Cannot use content script approach:', error)
    return false
  }
}
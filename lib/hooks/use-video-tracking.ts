import { useEffect } from 'react'
import { useFluentFlowSupabaseStore as useFluentFlowStore } from '../stores/fluent-flow-supabase-store'

/**
 * Custom hook for managing video information tracking across YouTube tabs
 * Handles tab changes, URL navigation, and video info updates
 */
export function useVideoTracking() {
  // Setup video tracking for tab changes and navigation
  useEffect(() => {
    let currentTabId: number | null = null
    let trackingInterval: NodeJS.Timeout | null = null

    // Update video information (reusable function)
    const updateVideoInformation = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const activeTab = tabs[0]

        if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
          try {
            const response = await chrome.tabs.sendMessage(activeTab.id, {
              type: 'GET_VIDEO_INFO'
            })

            if (response?.success && response.videoInfo) {
              const videoInfo = response.videoInfo
              
              // Validate video info has required fields
              if (videoInfo.id && videoInfo.title && videoInfo.url) {
                // Convert from content script VideoInfo to YouTubeVideoInfo
                const youtubeVideoInfo = {
                  videoId: videoInfo.id,
                  title: videoInfo.title,
                  channel: 'Unknown Channel', // Default fallback
                  duration: 0, // Default fallback
                  url: videoInfo.url,
                  hasSubtitles: false // Default fallback
                }
                
                const { currentVideo: currentStoreVideo, initializePlayer } =
                  useFluentFlowStore.getState()

                // Only update if video actually changed
                if (!currentStoreVideo || currentStoreVideo.videoId !== youtubeVideoInfo.videoId) {
                  initializePlayer(youtubeVideoInfo)
                  console.log('FluentFlow: Video updated in sidepanel:', youtubeVideoInfo)
                }
              } else {
                console.warn('FluentFlow: Incomplete video info received from content script:', videoInfo)
              }
            }
          } catch (error) {
            // Content script not available or no response - clear current video
            const { currentVideo: currentStoreVideo, updatePlayerState } =
              useFluentFlowStore.getState()
            if (currentStoreVideo) {
              // Clear current video if we can't get info anymore
              updatePlayerState({ isReady: false })
              console.log('FluentFlow: Content script not available - video info may be stale')
            }
          }
        } else {
          // Not on YouTube - clear current video
          const { currentVideo: currentStoreVideo } = useFluentFlowStore.getState()
          if (currentStoreVideo) {
            // Use store's setState to clear currentVideo
            useFluentFlowStore.setState({
              currentVideo: null,
              playerState: { ...useFluentFlowStore.getState().playerState, isReady: false }
            })
            console.log('FluentFlow: Cleared video info - not on YouTube')
          }
        }
      } catch (error) {
        console.error('FluentFlow: Failed to update video information:', error)
      }
    }

    // Track active tab changes
    const handleTabActivated = async (activeInfo: { tabId: number; windowId: number }) => {
      currentTabId = activeInfo.tabId
      await updateVideoInformation()
    }

    // Track tab updates (URL changes within same tab)
    const handleTabUpdated = async (tabId: number, changeInfo: { url?: string; status?: string }) => {
      if (changeInfo.url && tabId === currentTabId) {
        await updateVideoInformation()
      }
    }

    // Periodic check for video changes (fallback for SPA navigation)
    const startPeriodicCheck = () => {
      trackingInterval = setInterval(async () => {
        await updateVideoInformation()
      }, 2000) // Check every 2 seconds
    }

    // Setup Chrome API listeners
    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)

    // Start periodic checking
    startPeriodicCheck()

    // Initial video information load
    const initializeVideoInformation = async () => {
      try {
        // Get the active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const activeTab = tabs[0]

        if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
          // Send message to content script to get video information
          try {
            const response = await chrome.tabs.sendMessage(activeTab.id, {
              type: 'GET_VIDEO_INFO'
            })

            if (response?.success && response.videoInfo) {
              const videoInfo = response.videoInfo
              
              // Validate video info has required fields
              if (videoInfo.id && videoInfo.title && videoInfo.url) {
                // Convert from content script VideoInfo to YouTubeVideoInfo
                const youtubeVideoInfo = {
                  videoId: videoInfo.id,
                  title: videoInfo.title,
                  channel: 'Unknown Channel', // Default fallback
                  duration: 0, // Default fallback
                  url: videoInfo.url,
                  hasSubtitles: false // Default fallback
                }
                
                // Initialize the store with video information
                const { initializePlayer } = useFluentFlowStore.getState()
                initializePlayer(youtubeVideoInfo)
                console.log(
                  'FluentFlow: Video information initialized in sidepanel:',
                  youtubeVideoInfo
                )
              } else {
                console.warn('FluentFlow: Incomplete video info during initialization:', videoInfo)
              }
            }
          } catch (error) {
            console.log('FluentFlow: Content script not available or no video info:', error)
          }
        }
      } catch (error) {
        console.error('FluentFlow: Failed to initialize video information:', error)
      }
    }

    // Initialize on mount
    initializeVideoInformation()

    // Cleanup function
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
      if (trackingInterval) {
        clearInterval(trackingInterval)
      }
    }
  }, [])

  // Setup message handlers for receiving data from content script
  useEffect(() => {
    const messageHandler = (message: any) => {
      switch (message.type) {
        case 'OPEN_SIDE_PANEL':
          // Handle video info and notes from content script
          if (message.videoInfo) {
            const videoInfo = message.videoInfo
            const videoId = videoInfo.id || videoInfo.videoId
            
            // Validate video info has required fields
            if (videoId && videoInfo.title && videoInfo.url) {
              const { initializePlayer } = useFluentFlowStore.getState()
              // Ensure the videoInfo object conforms to the YouTubeVideoInfo type
              const formattedVideoInfo = {
                videoId: videoId,
                title: videoInfo.title,
                channel: videoInfo.channel || 'Unknown Channel',
                duration: videoInfo.duration || 0,
                url: videoInfo.url,
                hasSubtitles: videoInfo.hasSubtitles || false
              }
              initializePlayer(formattedVideoInfo)
              console.log('FluentFlow: Updated video information from content script')
            } else {
              console.warn('FluentFlow: Incomplete video info in message handler:', videoInfo)
            }
          }
          break
        case 'SIDEPANEL_DATA':
          // Handle any additional data from background script
          console.log('FluentFlow: Received sidepanel data:', message)
          break
        default:
          break
      }
    }

    chrome.runtime.onMessage.addListener(messageHandler)

    // Cleanup function
    return () => {
      chrome.runtime.onMessage.removeListener(messageHandler)
    }
  }, [])
}
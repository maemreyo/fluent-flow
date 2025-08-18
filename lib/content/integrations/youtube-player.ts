// YouTube Player Integration Service
// Handles all interactions with YouTube player API and HTML5 video element
// Clean separation from UI and feature logic

export interface VideoInfo {
  id: string | null
  title: string | null  
  url: string | null
}

export class YouTubePlayerService {
  private youtubePlayer: any = null
  private videoDuration: number = 0
  private currentVideoInfo: VideoInfo = {
    id: null,
    title: null,
    url: null
  }

  constructor() {
    this.setupPlayerIntegration()
    this.updateVideoInfo()
  }

  // Public API methods
  public getCurrentTime(): number | null {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.getCurrentTime === 'function') {
          // YouTube API player
          return this.youtubePlayer.getCurrentTime()
        } else if (this.youtubePlayer.currentTime !== undefined) {
          // HTML5 video element
          return this.youtubePlayer.currentTime
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video) {
        return video.currentTime
      }
    } catch (error) {
      console.warn('FluentFlow: Error getting current time', error)
    }
    return null
  }

  public seekTo(time: number): boolean {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.seekTo === 'function') {
          // YouTube API player
          this.youtubePlayer.seekTo(time, true)
          return true
        } else if (this.youtubePlayer.currentTime !== undefined) {
          // HTML5 video element
          this.youtubePlayer.currentTime = time
          return true
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video) {
        video.currentTime = time
        return true
      }
    } catch (error) {
      console.warn('FluentFlow: Error seeking to time', error)
    }
    return false
  }

  public getVideoDuration(): number {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.getDuration === 'function') {
          // YouTube API player
          this.videoDuration = this.youtubePlayer.getDuration()
          return this.videoDuration
        } else if (this.youtubePlayer.duration !== undefined) {
          // HTML5 video element
          this.videoDuration = this.youtubePlayer.duration
          return this.videoDuration
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video && video.duration) {
        this.videoDuration = video.duration
        return this.videoDuration
      }
    } catch (error) {
      console.warn('FluentFlow: Error getting video duration', error)
    }
    
    // Try to get from progress bar attributes
    const progressBar = document.querySelector('.ytp-progress-bar')
    if (progressBar) {
      const max = progressBar.getAttribute('aria-valuemax')
      if (max) {
        this.videoDuration = parseInt(max)
        return this.videoDuration
      }
    }
    
    return this.videoDuration || 0
  }

  public isPlaying(): boolean {
    try {
      if (this.youtubePlayer) {
        if (typeof this.youtubePlayer.getPlayerState === 'function') {
          // YouTube API player (1 = playing)
          return this.youtubePlayer.getPlayerState() === 1
        } else if (this.youtubePlayer.paused !== undefined) {
          // HTML5 video element
          return !this.youtubePlayer.paused
        }
      }
      
      // Fallback: try to find video element directly
      const video = document.querySelector('video')
      if (video) {
        return !video.paused
      }
    } catch (error) {
      console.warn('FluentFlow: Error checking play state', error)
    }
    return false
  }

  public getVideoInfo(): VideoInfo {
    return { ...this.currentVideoInfo }
  }

  public async waitForProgressBar(): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve) => {
      const checkForProgressBar = () => {
        const progressBar = document.querySelector('.ytp-progress-bar') as HTMLElement
        if (progressBar) {
          resolve(progressBar)
        } else {
          setTimeout(checkForProgressBar, 100)
        }
      }
      checkForProgressBar()
    })
  }

  // Event handlers for video changes
  public onVideoChange(callback: (videoInfo: VideoInfo) => void): void {
    // Watch for URL changes (YouTube SPA navigation)
    let currentUrl = window.location.href
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href
        setTimeout(() => {
          this.updateVideoInfo()
          callback(this.currentVideoInfo)
        }, 1000) // Wait for YouTube to finish loading
      }
    }, 1000)
  }

  // Private methods
  private setupPlayerIntegration(): void {
    const waitForPlayer = () => {
      return new Promise<any>((resolve) => {
        const checkForPlayer = () => {
          // Try multiple ways to get the player
          const player = (window as any).yt?.player?.getPlayerByElement?.(document.querySelector('#movie_player')) ||
                        document.querySelector('#movie_player') ||
                        document.querySelector('.html5-video-player')
          
          if (player && player.getCurrentTime) {
            resolve(player)
          } else if (player) {
            // If we have the element but not the API, try to get the video element
            const video = player.querySelector('video')
            if (video) {
              resolve(video)
            } else {
              setTimeout(checkForPlayer, 100)
            }
          } else {
            setTimeout(checkForPlayer, 100)
          }
        }
        checkForPlayer()
      })
    }

    waitForPlayer().then(player => {
      this.youtubePlayer = player
      console.log('FluentFlow: YouTube player connected')
    }).catch(error => {
      console.error('FluentFlow: Failed to connect to YouTube player', error)
    })
  }

  private updateVideoInfo(): void {
    try {
      // Get video ID from URL
      const urlParams = new URLSearchParams(window.location.search)
      const videoId = urlParams.get('v')
      
      // Get video title from page
      const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.title')
      const title = titleElement?.textContent?.trim() || null
      
      this.currentVideoInfo = {
        id: videoId,
        title: title,
        url: window.location.href
      }
      
      console.log('FluentFlow: Updated video info', this.currentVideoInfo)
    } catch (error) {
      console.warn('FluentFlow: Error updating video info', error)
    }
  }
}
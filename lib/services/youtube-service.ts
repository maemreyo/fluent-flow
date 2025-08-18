import type {
  YouTubePlayerAPI,
  YouTubeVideoInfo,
  YouTubePlayerState,
  FluentFlowError
} from '../types/fluent-flow-types'

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: any) => YouTubePlayerAPI
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
      ready: (callback: () => void) => void
    }
    onYouTubeIframeAPIReady: () => void
  }
}

export class YouTubeService {
  private player: YouTubePlayerAPI | null = null
  private isAPIReady = false
  private readyCallbacks: (() => void)[] = []
  private stateChangeListeners: ((state: YouTubePlayerState) => void)[] = []

  constructor() {
    this.initializeAPI()
  }

  private async initializeAPI(): Promise<void> {
    if (typeof window === 'undefined') return

    // Check if YouTube API is already loaded
    if (window.YT?.Player) {
      this.isAPIReady = true
      this.executeReadyCallbacks()
      return
    }

    // Load YouTube IFrame API
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }

    // Set up global callback
    window.onYouTubeIframeAPIReady = () => {
      this.isAPIReady = true
      this.executeReadyCallbacks()
    }
  }

  private executeReadyCallbacks(): void {
    this.readyCallbacks.forEach(callback => callback())
    this.readyCallbacks = []
  }

  public onReady(callback: () => void): void {
    if (this.isAPIReady) {
      callback()
    } else {
      this.readyCallbacks.push(callback)
    }
  }

  public async waitForAPI(): Promise<void> {
    return new Promise((resolve) => {
      this.onReady(resolve)
    })
  }

  public async initializePlayer(): Promise<YouTubePlayerAPI> {
    await this.waitForAPI()

    const videoContainer = this.findVideoContainer()
    if (!videoContainer) {
      throw this.createError('PLAYER_NOT_READY', 'YouTube video container not found')
    }

    try {
      // Get existing YouTube player or create a reference
      this.player = this.getExistingPlayer()
      
      if (!this.player) {
        throw this.createError('PLAYER_NOT_READY', 'Could not access YouTube player')
      }

      return this.player
    } catch (error) {
      throw this.createError('PLAYER_NOT_READY', `Failed to initialize player: ${error}`)
    }
  }

  private findVideoContainer(): HTMLElement | null {
    // YouTube video selectors (may change)
    const selectors = [
      '#movie_player',
      '.html5-video-player',
      '#player-container video',
      'video[src*="googlevideo.com"]'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) return element
    }

    return null
  }

  private getExistingPlayer(): YouTubePlayerAPI | null {
    // Try to access the existing YouTube player
    const moviePlayer = document.querySelector('#movie_player') as any
    
    if (moviePlayer && moviePlayer.getPlayerState) {
      return moviePlayer as YouTubePlayerAPI
    }

    // Alternative method using global YT object
    if (window.YT?.Player) {
      try {
        // Create a proxy to the existing player
        return this.createPlayerProxy()
      } catch (error) {
        console.warn('Could not create player proxy:', error)
      }
    }

    return null
  }

  private createPlayerProxy(): YouTubePlayerAPI {
    const moviePlayer = document.querySelector('#movie_player') as any
    
    return {
      getCurrentTime: () => moviePlayer?.getCurrentTime?.() ?? 0,
      getDuration: () => moviePlayer?.getDuration?.() ?? 0,
      getPlaybackRate: () => moviePlayer?.getPlaybackRate?.() ?? 1,
      getVolume: () => moviePlayer?.getVolume?.() ?? 100,
      isMuted: () => moviePlayer?.isMuted?.() ?? false,
      getPlayerState: () => moviePlayer?.getPlayerState?.() ?? -1,
      seekTo: (seconds: number, allowSeekAhead = true) => {
        moviePlayer?.seekTo?.(seconds, allowSeekAhead)
      },
      playVideo: () => moviePlayer?.playVideo?.(),
      pauseVideo: () => moviePlayer?.pauseVideo?.(),
      setPlaybackRate: (rate: number) => moviePlayer?.setPlaybackRate?.(rate),
      setVolume: (volume: number) => moviePlayer?.setVolume?.(volume),
      mute: () => moviePlayer?.mute?.(),
      unMute: () => moviePlayer?.unMute?.(),
      addEventListener: (event: string, listener: string) => {
        moviePlayer?.addEventListener?.(event, listener)
      },
      removeEventListener: (event: string, listener: string) => {
        moviePlayer?.removeEventListener?.(event, listener)
      }
    }
  }

  public getCurrentVideoInfo(): YouTubeVideoInfo | null {
    const url = window.location.href
    const videoId = this.extractVideoId(url)
    
    if (!videoId) return null

    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, #title h1, .title')
    const channelElement = document.querySelector('#channel-name a, .ytd-channel-name a')

    return {
      videoId,
      title: titleElement?.textContent?.trim() || 'Unknown Title',
      channel: channelElement?.textContent?.trim() || 'Unknown Channel',
      duration: this.player?.getDuration() || 0,
      url,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      hasSubtitles: this.hasSubtitles()
    }
  }

  private extractVideoId(url: string): string | null {
    const regex = /[?&]v=([^&#]*)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  private hasSubtitles(): boolean {
    const subtitleButton = document.querySelector('[aria-label*="Subtitle"], [aria-label*="Caption"]')
    return !!subtitleButton
  }

  public async getPlayerState(): Promise<YouTubePlayerState> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    return {
      isReady: true,
      isPlaying: this.player.getPlayerState() === 1, // YT.PlayerState.PLAYING
      currentTime: this.player.getCurrentTime(),
      duration: this.player.getDuration(),
      playbackRate: this.player.getPlaybackRate(),
      volume: this.player.getVolume(),
      isMuted: this.player.isMuted()
    }
  }

  public async setLoopSegment(startTime: number, endTime: number): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    if (startTime >= endTime) {
      throw this.createError('INVALID_SEGMENT', 'Start time must be less than end time')
    }

    // Seek to start time
    this.player.seekTo(startTime)
  }

  public async seekTo(time: number): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.seekTo(time, true)
  }

  public async play(): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.playVideo()
  }

  public async pause(): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.pauseVideo()
  }

  public async setPlaybackRate(rate: number): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.setPlaybackRate(rate)
  }

  public async setVolume(volume: number): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.setVolume(Math.max(0, Math.min(100, volume)))
  }

  public async mute(): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.mute()
  }

  public async unmute(): Promise<void> {
    if (!this.player) {
      throw this.createError('PLAYER_NOT_READY', 'Player not initialized')
    }

    this.player.unMute()
  }

  public onStateChange(callback: (state: YouTubePlayerState) => void): void {
    this.stateChangeListeners.push(callback)
  }

  public removeStateChangeListener(callback: (state: YouTubePlayerState) => void): void {
    const index = this.stateChangeListeners.indexOf(callback)
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1)
    }
  }

  public isVideoPage(): boolean {
    return window.location.pathname === '/watch'
  }

  public isPlayerReady(): boolean {
    return !!this.player && this.isAPIReady
  }

  private createError(code: FluentFlowError['code'], message: string): FluentFlowError {
    const error = new Error(message) as FluentFlowError
    error.code = code
    error.context = {
      playerReady: !!this.player,
      apiReady: this.isAPIReady,
      url: window.location.href
    }
    return error
  }

  public destroy(): void {
    this.player = null
    this.stateChangeListeners = []
    this.readyCallbacks = []
  }
}
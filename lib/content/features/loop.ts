// Loop Feature Module - A/B Loop functionality with progress markers
// Clean separation from other features following SoC principles

interface LoopState {
  isActive: boolean
  isLooping: boolean
  startTime: number | null
  endTime: number | null
  mode: 'none' | 'setting-start' | 'setting-end' | 'complete'
}

export interface LoopButtonStates {
  loop: 'inactive' | 'active' | 'setting' | 'paused'
}

export interface YouTubePlayerIntegration {
  getCurrentTime(): number | null
  seekTo(time: number): boolean
  getVideoDuration(): number
}

export interface UIUtilities {
  showToast(message: string): void
  updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void
  formatTime(seconds: number | null): string
}

export class LoopFeature {
  private loopState: LoopState = {
    isActive: false,
    isLooping: false,
    startTime: null,
    endTime: null,
    mode: 'none'
  }

  private loopInterval: NodeJS.Timeout | null = null
  private progressBar: HTMLElement | null = null

  constructor(
    private player: YouTubePlayerIntegration,
    private ui: UIUtilities
  ) {}

  // Public API methods
  public setLoopStart(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    if (this.loopState.endTime && currentTime >= this.loopState.endTime) {
      this.ui.showToast('Start time cannot be after end time')
      return
    }

    this.loopState.startTime = currentTime
    this.loopState.isActive = true
    
    // Update button states for new button group
    this.ui.updateButtonState('fluent-flow-loop-start', 'active')
    
    if (this.loopState.endTime) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
    } else {
      this.loopState.mode = 'setting-end'
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
    }

    // Update backward compatibility button
    this.ui.updateButtonState('fluent-flow-loop', this.loopState.isLooping ? 'active' : 'setting')
    this.updateProgressMarkers()
    this.updateLoopButtonTooltips()
    this.ui.showToast(`Loop start: ${this.ui.formatTime(currentTime)}`)
  }

  public setLoopEnd(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    if (this.loopState.startTime && currentTime <= this.loopState.startTime) {
      this.ui.showToast('End time cannot be before start time')
      return
    }

    this.loopState.endTime = currentTime
    this.loopState.isActive = true
    
    // Update button states for new button group
    this.ui.updateButtonState('fluent-flow-loop-end', 'active')
    
    if (this.loopState.startTime) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
    } else {
      this.loopState.mode = 'setting-start'
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
    }

    // Update backward compatibility button
    this.ui.updateButtonState('fluent-flow-loop', this.loopState.isLooping ? 'active' : 'setting')
    this.updateProgressMarkers()
    this.updateLoopButtonTooltips()
    this.ui.showToast(`Loop end: ${this.ui.formatTime(currentTime)}`)
  }

  public toggleLoopPlayback(): void {
    if (!this.loopState.isActive || this.loopState.startTime === null || this.loopState.endTime === null) {
      this.ui.showToast('Please set both loop start and end points first')
      return
    }

    if (this.loopState.mode !== 'complete') {
      this.ui.showToast('Loop setup not complete')
      return
    }

    // Toggle loop playback
    this.loopState.isLooping = !this.loopState.isLooping
    
    // Update button states
    this.ui.updateButtonState('fluent-flow-loop-toggle', this.loopState.isLooping ? 'active' : 'paused')
    this.ui.updateButtonState('fluent-flow-loop', this.loopState.isLooping ? 'active' : 'paused')
    
    // Show feedback
    const startTime = this.ui.formatTime(this.loopState.startTime)
    const endTime = this.ui.formatTime(this.loopState.endTime)
    const status = this.loopState.isLooping ? 'resumed' : 'paused'
    this.ui.showToast(`Loop ${status}: ${startTime} - ${endTime}`)
    
    // Update button tooltips
    this.updateLoopButtonTooltips()
  }

  public clearLoop(): void {
    this.resetLoopState()
    
    // Update all button states
    this.ui.updateButtonState('fluent-flow-loop', 'inactive')
    this.ui.updateButtonState('fluent-flow-loop-start', 'inactive')  
    this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive')
    this.ui.updateButtonState('fluent-flow-loop-end', 'inactive')
    
    this.updateLoopButtonTooltips()
    this.ui.showToast('Loop cleared')
  }

  public toggleLoopMode(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    switch (this.loopState.mode) {
      case 'none':
        this.loopState.mode = 'setting-start'
        this.loopState.isActive = true
        this.ui.updateButtonState('fluent-flow-loop', 'setting')
        this.ui.showToast('Click on progress bar to set loop start, or click button to use current time')
        break

      case 'setting-start':
        this.loopState.startTime = currentTime
        this.loopState.mode = 'setting-end'
        this.ui.updateButtonState('fluent-flow-loop', 'setting')
        this.updateProgressMarkers()
        this.ui.showToast(`Loop start set: ${this.ui.formatTime(currentTime)}. Now set end point.`)
        break

      case 'setting-end':
        if (currentTime <= this.loopState.startTime!) {
          this.ui.showToast('End time must be after start time')
          return
        }
        this.loopState.endTime = currentTime
        this.loopState.mode = 'complete'
        this.loopState.isLooping = true
        this.ui.updateButtonState('fluent-flow-loop', 'active')
        this.updateProgressMarkers()
        this.ui.showToast(`Loop activated: ${this.ui.formatTime(this.loopState.startTime!)} - ${this.ui.formatTime(currentTime)}`)
        break

      case 'complete':
        this.loopState.isLooping = !this.loopState.isLooping
        this.ui.updateButtonState('fluent-flow-loop', this.loopState.isLooping ? 'active' : 'paused')
        this.ui.showToast(this.loopState.isLooping ? 'Loop resumed' : 'Loop paused')
        break
    }
  }

  // Progress bar integration
  public setupProgressBarIntegration(progressBar: HTMLElement): void {
    this.progressBar = progressBar
    this.injectProgressMarkers()
    this.setupProgressBarClickHandler()
  }

  public startLoopMonitoring(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
    }

    this.loopInterval = setInterval(() => {
      if (this.loopState.isLooping && this.loopState.startTime !== null && this.loopState.endTime !== null) {
        const currentTime = this.player.getCurrentTime()
        if (currentTime !== null && currentTime >= this.loopState.endTime) {
          this.player.seekTo(this.loopState.startTime)
        }
      }
    }, 100) // Check every 100ms for precise looping
  }

  // Cleanup method
  public destroy(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }
    
    // Remove progress markers
    const existingMarkers = document.querySelectorAll('.fluent-flow-marker')
    existingMarkers.forEach(marker => marker.remove())
    
    const markerContainer = document.querySelector('.fluent-flow-markers')
    if (markerContainer) {
      markerContainer.remove()
    }
  }

  // Getters for external access
  public getLoopState(): Readonly<LoopState> {
    return { ...this.loopState }
  }

  // Private methods
  private resetLoopState(): void {
    this.loopState = {
      isActive: false,
      isLooping: false,
      startTime: null,
      endTime: null,
      mode: 'none'
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }
    this.updateProgressMarkers()
  }

  private injectProgressMarkers(): void {
    if (!this.progressBar) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.fluent-flow-marker')
    existingMarkers.forEach(marker => marker.remove())

    // Create container for markers
    let markerContainer = document.querySelector('.fluent-flow-markers') as HTMLElement
    if (!markerContainer) {
      markerContainer = document.createElement('div')
      markerContainer.className = 'fluent-flow-markers'
      markerContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      `
      this.progressBar.appendChild(markerContainer)
    }

    this.updateProgressMarkers()
  }

  private updateProgressMarkers(): void {
    const markerContainer = document.querySelector('.fluent-flow-markers')
    if (!markerContainer) return

    // Clear existing markers
    markerContainer.innerHTML = ''

    const duration = this.player.getVideoDuration()
    if (duration <= 0) return

    // Create start marker
    if (this.loopState.startTime !== null) {
      const startMarker = this.createProgressMarker('start', this.loopState.startTime, duration)
      markerContainer.appendChild(startMarker)
    }

    // Create end marker
    if (this.loopState.endTime !== null) {
      const endMarker = this.createProgressMarker('end', this.loopState.endTime, duration)
      markerContainer.appendChild(endMarker)
    }

    // Create loop region highlight
    if (this.loopState.startTime !== null && this.loopState.endTime !== null) {
      const loopRegion = this.createLoopRegion(this.loopState.startTime, this.loopState.endTime, duration)
      markerContainer.appendChild(loopRegion)
    }
  }

  private createProgressMarker(type: 'start' | 'end', time: number, duration: number): HTMLElement {
    const marker = document.createElement('div')
    marker.className = `fluent-flow-marker fluent-flow-marker-${type}`
    
    const percentage = (time / duration) * 100
    const color = type === 'start' ? '#22c55e' : '#ef4444' // Green for start, red for end
    const label = type === 'start' ? 'START' : 'END'
    
    // Create tooltip-style marker
    marker.style.cssText = `
      position: absolute;
      left: ${percentage}%;
      bottom: 120%;
      transform: translateX(-50%);
      background: ${color};
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      cursor: pointer;
      pointer-events: auto;
      z-index: 15;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      user-select: none;
    `

    // Add content with time
    marker.innerHTML = `
      <div style="text-align: center;">
        <div>${label}</div>
        <div style="font-size: 10px; opacity: 0.9;">${this.ui.formatTime(time)}</div>
      </div>
    `

    // Add arrow pointing down
    const arrow = document.createElement('div')
    arrow.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid ${color};
    `
    marker.appendChild(arrow)

    // Add hover effect
    marker.addEventListener('mouseenter', () => {
      marker.style.transform = 'translateX(-50%) scale(1.1)'
      marker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'
    })

    marker.addEventListener('mouseleave', () => {
      marker.style.transform = 'translateX(-50%) scale(1)'
      marker.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
    })

    // Add click to seek
    marker.addEventListener('click', (e) => {
      e.stopPropagation()
      this.player.seekTo(time)
      this.ui.showToast(`Jumped to ${type}: ${this.ui.formatTime(time)}`)
    })

    // Add vertical line connecting to progress bar
    const line = document.createElement('div')
    line.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 20px;
      background: ${color};
      opacity: 0.7;
    `
    marker.appendChild(line)

    return marker
  }

  private createLoopRegion(startTime: number, endTime: number, duration: number): HTMLElement {
    const region = document.createElement('div')
    region.className = 'fluent-flow-loop-region'
    
    const startPercent = (startTime / duration) * 100
    const endPercent = (endTime / duration) * 100
    const width = endPercent - startPercent
    
    region.style.cssText = `
      position: absolute;
      left: ${startPercent}%;
      top: 0;
      width: ${width}%;
      height: 100%;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.5);
      pointer-events: none;
      z-index: 5;
    `

    return region
  }

  private setupProgressBarClickHandler(): void {
    if (!this.progressBar) return

    this.progressBar.addEventListener('click', (e) => {
      // Only handle clicks when in setting mode
      if (this.loopState.mode === 'setting-start' || this.loopState.mode === 'setting-end') {
        e.stopPropagation()
        
        const rect = this.progressBar!.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const percentage = clickX / rect.width
        const duration = this.player.getVideoDuration()
        const clickTime = percentage * duration

        if (this.loopState.mode === 'setting-start') {
          this.setLoopTimeDirectly('start', clickTime)
        } else if (this.loopState.mode === 'setting-end') {
          this.setLoopTimeDirectly('end', clickTime)
        }
      }
    })
  }

  private setLoopTimeDirectly(type: 'start' | 'end', time: number): void {
    if (type === 'start') {
      if (this.loopState.endTime && time >= this.loopState.endTime) {
        this.ui.showToast('Start time cannot be after end time')
        return
      }
      this.loopState.startTime = time
      this.ui.showToast(`Loop start set: ${this.ui.formatTime(time)}`)
    } else {
      if (this.loopState.startTime && time <= this.loopState.startTime) {
        this.ui.showToast('End time cannot be before start time')
        return
      }
      this.loopState.endTime = time
      this.ui.showToast(`Loop end set: ${this.ui.formatTime(time)}`)
    }

    // Update state machine
    if (this.loopState.startTime !== null && this.loopState.endTime !== null) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.loopState.isActive = true
      this.ui.updateButtonState('fluent-flow-loop', 'active')
    }

    this.updateProgressMarkers()
  }

  private updateLoopButtonTooltips(): void {
    // Update Set Start button tooltip
    const startButton = document.getElementById('fluent-flow-loop-start')
    if (startButton) {
      const hasStart = this.loopState.startTime !== null
      const startTooltip = hasStart 
        ? `Loop Start: ${this.ui.formatTime(this.loopState.startTime)} (Alt+Shift+1 to change)`
        : 'Set Loop Start (Alt+Shift+1)'
      startButton.title = startTooltip
      startButton.setAttribute('data-tooltip-title', startTooltip)
      startButton.setAttribute('aria-label', startTooltip)
    }

    // Update Play/Pause button tooltip  
    const toggleButton = document.getElementById('fluent-flow-loop-toggle')
    if (toggleButton) {
      let toggleTooltip = 'Play/Pause Loop (Alt+L)'
      if (this.loopState.isActive && this.loopState.startTime !== null && this.loopState.endTime !== null) {
        const status = this.loopState.isLooping ? 'Pause' : 'Resume'
        const range = `${this.ui.formatTime(this.loopState.startTime)} - ${this.ui.formatTime(this.loopState.endTime)}`
        toggleTooltip = `${status} Loop: ${range} (Alt+L)`
      } else if (this.loopState.startTime !== null || this.loopState.endTime !== null) {
        toggleTooltip = 'Set both start and end points to enable loop playback'
      }
      toggleButton.title = toggleTooltip
      toggleButton.setAttribute('data-tooltip-title', toggleTooltip)
      toggleButton.setAttribute('aria-label', toggleTooltip)
    }

    // Update Set End button tooltip
    const endButton = document.getElementById('fluent-flow-loop-end')  
    if (endButton) {
      const hasEnd = this.loopState.endTime !== null
      const endTooltip = hasEnd
        ? `Loop End: ${this.ui.formatTime(this.loopState.endTime)} (Alt+Shift+2 to change)`
        : 'Set Loop End (Alt+Shift+2)'
      endButton.title = endTooltip
      endButton.setAttribute('data-tooltip-title', endTooltip)
      endButton.setAttribute('aria-label', endTooltip)
    }
  }
}
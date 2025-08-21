// Loop Feature V2 - Clean State Machine Implementation
// Solves auto-looping behavior issues with single source of truth

import type { SavedLoop } from '../../types/fluent-flow-types'
import { LoopStateMachine, type LoopStateContext } from './loop-state-machine'

export interface YouTubePlayerIntegration {
  getCurrentTime(): number | null
  seekTo(time: number): boolean
  getVideoDuration(): number
  getVideoInfo(): { id: string | null; title: string | null; url: string | null }
  updateVideoInfo?(): void
}

export interface UIUtilities {
  showToast(message: string): void
  updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void
  formatTime(seconds: number | null): string
}

export class LoopFeature {
  private stateMachine: LoopStateMachine = new LoopStateMachine()
  private loopInterval: NodeJS.Timeout | null = null
  private progressBar: HTMLElement | null = null

  constructor(
    private player: YouTubePlayerIntegration,
    private ui: UIUtilities
  ) {
    // Subscribe to state changes for UI updates
    this.stateMachine.subscribe(context => {
      this.onStateChange(context)
    })
  }

  // Single source of truth for all UI updates
  private onStateChange(context: LoopStateContext): void {
    console.log('FluentFlow: State changed to:', context.state, context.data)

    // Defensive programming - ensure we have valid context
    if (!context || !context.state) {
      console.error('FluentFlow: Invalid state context', context)
      return
    }

    // Update all button states based on current state - NO EXCEPTIONS
    switch (context.state) {
      case 'idle':
        this.ui.updateButtonState('fluent-flow-loop', 'inactive')
        this.ui.updateButtonState('fluent-flow-loop-start', 'inactive')
        this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive')
        this.ui.updateButtonState('fluent-flow-loop-end', 'inactive')
        break

      case 'setting-start':
        this.ui.updateButtonState('fluent-flow-loop', 'setting')
        this.ui.updateButtonState('fluent-flow-loop-start', 'setting')
        this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
        break

      case 'setting-end':
        this.ui.updateButtonState('fluent-flow-loop', 'setting')
        this.ui.updateButtonState('fluent-flow-loop-end', 'setting')
        this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
        break

      case 'configured':
        // CRITICAL: Loop is set up but NOT actively looping
        this.ui.updateButtonState('fluent-flow-loop', 'active')
        this.ui.updateButtonState('fluent-flow-loop-start', 'active')
        this.ui.updateButtonState('fluent-flow-loop-end', 'active')
        this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive') // Ready to play, not playing
        break

      case 'active':
        // CRITICAL: Loop is actively running
        this.ui.updateButtonState('fluent-flow-loop', 'active')
        this.ui.updateButtonState('fluent-flow-loop-start', 'active')
        this.ui.updateButtonState('fluent-flow-loop-end', 'active')
        this.ui.updateButtonState('fluent-flow-loop-toggle', 'active') // Currently looping
        break

      case 'paused':
        this.ui.updateButtonState('fluent-flow-loop', 'paused')
        this.ui.updateButtonState('fluent-flow-loop-start', 'active')
        this.ui.updateButtonState('fluent-flow-loop-end', 'active')
        this.ui.updateButtonState('fluent-flow-loop-toggle', 'paused') // Paused
        break
    }

    // Update visual elements
    this.updateProgressMarkers()
    this.updateLoopButtonTooltips()
  }

  // Public API methods - Clean and Simple
  public setLoopStart(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    const context = this.stateMachine.getContext()
    if (context.data.endTime && currentTime >= context.data.endTime) {
      this.ui.showToast('Start time cannot be after end time')
      return
    }

    const newData = { ...context.data, startTime: currentTime }

    // Simple logic: just check if we have both points
    if (newData.startTime !== null && newData.endTime !== null) {
      // Both points set - go to configured (ready but not active)
      this.stateMachine.transition('configured', newData)
    } else {
      // Still missing some data - go to appropriate setting state
      this.stateMachine.transition('setting-end', newData)
    }

    this.ui.showToast(`Loop start: ${this.ui.formatTime(currentTime)}`)
  }

  public setLoopEnd(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    const context = this.stateMachine.getContext()
    if (context.data.startTime && currentTime <= context.data.startTime) {
      this.ui.showToast('End time cannot be before start time')
      return
    }

    const newData = { ...context.data, endTime: currentTime }

    // Simple logic: just check if we have both points
    if (newData.startTime !== null && newData.endTime !== null) {
      // Both points set - go to configured (ready but not active)
      this.stateMachine.transition('configured', newData)
    } else {
      // Still missing some data - go to appropriate setting state
      this.stateMachine.transition('setting-start', newData)
    }

    this.ui.showToast(`Loop end: ${this.ui.formatTime(currentTime)}`)
  }

  public toggleLoopPlayback(): void {
    const context = this.stateMachine.getContext()

    if (context.data.startTime === null || context.data.endTime === null) {
      this.ui.showToast('Please set both loop start and end points first')
      return
    }

    // Clean state transitions based on current state
    switch (context.state) {
      case 'configured':
        // Start looping - ONLY place where active looping begins
        this.stateMachine.transition('active', context.data) // Preserve data!
        const startTime = this.ui.formatTime(context.data.startTime)
        const endTime = this.ui.formatTime(context.data.endTime)
        this.ui.showToast(`Loop started: ${startTime} - ${endTime}`)
        break

      case 'active':
        // Pause looping
        this.stateMachine.transition('paused', context.data) // Preserve data!
        this.ui.showToast('Loop paused')
        break

      case 'paused':
        // Resume looping
        this.stateMachine.transition('active', context.data) // Preserve data!
        this.ui.showToast('Loop resumed')
        break

      default:
        this.ui.showToast('Loop setup not complete')
    }
  }

  public clearLoop(): void {
    this.stateMachine.transition('idle', { startTime: null, endTime: null }) // Explicitly clear data
    this.ui.showToast('Loop cleared')
  }

  public toggleLoopMode(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    const context = this.stateMachine.getContext()

    switch (context.state) {
      case 'idle':
        this.stateMachine.transition('setting-start')
        this.ui.showToast(
          'Click on progress bar to set loop start, or click button to use current time'
        )
        break

      case 'setting-start':
        this.stateMachine.transition('setting-end', { ...context.data, startTime: currentTime })
        this.ui.showToast(`Loop start set: ${this.ui.formatTime(currentTime)}. Now set end point.`)
        break

      case 'setting-end':
        if (context.data.startTime && currentTime <= context.data.startTime) {
          this.ui.showToast('End time must be after start time')
          return
        }
        // Complete loop - configured but not active
        this.stateMachine.transition('configured', { ...context.data, endTime: currentTime })
        const range = `${this.ui.formatTime(context.data.startTime)} - ${this.ui.formatTime(currentTime)}`
        this.ui.showToast(`Loop configured: ${range} - Press Loop Play to start`)
        break

      case 'configured':
        this.stateMachine.transition('active', context.data) // Preserve data!
        this.ui.showToast('Loop started')
        break

      case 'active':
        this.stateMachine.transition('paused', context.data) // Preserve data!
        this.ui.showToast('Loop paused')
        break

      case 'paused':
        this.stateMachine.transition('active', context.data) // Preserve data!
        this.ui.showToast('Loop resumed')
        break
    }
  }

  public applyLoop(savedLoop: SavedLoop): void {
    console.log('FluentFlow V2: Applying saved loop', savedLoop)

    // Check if we're on the correct video
    const currentVideoInfo = this.player.getVideoInfo()
    if (currentVideoInfo.id !== savedLoop.videoId) {
      this.ui.showToast('Wrong video - need to navigate to correct video')
      return
    }

    // Apply loop data and transition to configured state (not active!)
    this.stateMachine.transition('configured', {
      startTime: savedLoop.startTime,
      endTime: savedLoop.endTime,
      title: savedLoop.title
    })

    // Seek to start time but don't start looping
    this.player.seekTo(savedLoop.startTime)

    this.ui.showToast(`Loop ready: ${savedLoop.title} - Press Loop Play to start`)
    console.log('FluentFlow: Loop configured but NOT active:', this.stateMachine.getContext())
  }

  // Loop monitoring - only runs when state is 'active'
  public startLoopMonitoring(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
    }

    this.loopInterval = setInterval(() => {
      const context = this.stateMachine.getContext()

      // CRITICAL: Only loop when state is explicitly 'active'
      if (
        context.state === 'active' &&
        context.data.startTime !== null &&
        context.data.endTime !== null
      ) {
        const currentTime = this.player.getCurrentTime()
        if (currentTime !== null && currentTime >= context.data.endTime) {
          this.player.seekTo(context.data.startTime)
        }
      }
    }, 100)
  }

  // Progress bar integration - simplified
  public setupProgressBarIntegration(progressBar: HTMLElement): void {
    this.progressBar = progressBar
    this.injectProgressMarkers()
  }

  // Getters for external access
  public getLoopState(): {
    isActive: boolean
    isLooping: boolean
    startTime: number | null
    endTime: number | null
    mode: string
  } {
    const context = this.stateMachine.getContext()
    return {
      isActive: context.state !== 'idle',
      isLooping: context.state === 'active',
      startTime: context.data.startTime,
      endTime: context.data.endTime,
      mode: context.state === 'configured' ? 'complete' : context.state
    }
  }

  public exportCurrentLoop(title?: string, description?: string): SavedLoop | null {
    const context = this.stateMachine.getContext()

    if (context.data.startTime === null || context.data.endTime === null) {
      this.ui.showToast('No loop to export - please set start and end points first')
      return null
    }

    // Get video info with fallbacks
    let videoInfo = this.player.getVideoInfo()
    if (!videoInfo.id || !videoInfo.title) {
      if (this.player.updateVideoInfo) {
        this.player.updateVideoInfo()
        videoInfo = this.player.getVideoInfo()
      }

      if (!videoInfo.id || !videoInfo.title) {
        const urlParams = new URLSearchParams(window.location.search)
        const videoId = urlParams.get('v')
        const docTitle = document.title
        const fallbackTitle =
          docTitle && docTitle !== 'YouTube'
            ? docTitle.replace(/ - YouTube$/, '').trim()
            : 'Unknown Video'

        if (!videoId) {
          this.ui.showToast('Cannot export - unable to detect YouTube video')
          return null
        }

        videoInfo = {
          id: videoId,
          title: fallbackTitle,
          url: window.location.href
        }
      }
    }

    const savedLoop: SavedLoop = {
      id: `loop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title:
        title ||
        `Loop ${this.ui.formatTime(context.data.startTime)}-${this.ui.formatTime(context.data.endTime)}`,
      videoId: videoInfo.id,
      videoTitle: videoInfo.title,
      videoUrl: videoInfo.url || window.location.href,
      startTime: context.data.startTime,
      endTime: context.data.endTime,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Send to background for storage
    chrome.runtime.sendMessage({
      type: 'SAVE_LOOP',
      data: savedLoop
    })

    this.ui.showToast(`Loop exported: ${savedLoop.title}`)
    return savedLoop
  }

  // Cleanup
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

    // Reset to idle state
    this.stateMachine.reset()
  }

  // Private helper methods (simplified)
  private injectProgressMarkers(): void {
    if (!this.progressBar) return

    const existingMarkers = document.querySelectorAll('.fluent-flow-marker')
    existingMarkers.forEach(marker => marker.remove())

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

    markerContainer.innerHTML = ''

    const duration = this.player.getVideoDuration()
    if (duration <= 0) return

    const context = this.stateMachine.getContext()

    // Create start marker
    if (context.data.startTime !== null) {
      const startMarker = this.createProgressMarker('start', context.data.startTime, duration)
      markerContainer.appendChild(startMarker)
    }

    // Create end marker
    if (context.data.endTime !== null) {
      const endMarker = this.createProgressMarker('end', context.data.endTime, duration)
      markerContainer.appendChild(endMarker)
    }

    // Create loop region highlight
    if (context.data.startTime !== null && context.data.endTime !== null) {
      const loopRegion = this.createLoopRegion(
        context.data.startTime,
        context.data.endTime,
        duration
      )
      markerContainer.appendChild(loopRegion)
    }
  }

  private createProgressMarker(type: 'start' | 'end', time: number, duration: number): HTMLElement {
    const marker = document.createElement('div')
    marker.className = `fluent-flow-marker fluent-flow-marker-${type}`

    const percentage = (time / duration) * 100

    const colors = {
      start: { primary: '#10b981', secondary: '#059669', shadow: 'rgba(16, 185, 129, 0.3)' },
      end: { primary: '#f59e0b', secondary: '#d97706', shadow: 'rgba(245, 158, 11, 0.3)' }
    }

    const colorSet = colors[type]
    const arrow = type === 'start' ? '→' : '←'

    marker.style.cssText = `
      position: absolute;
      left: ${percentage}%;
      bottom: 300%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, ${colorSet.primary}cc 0%, ${colorSet.secondary}cc 100%);
      backdrop-filter: blur(8px);
      color: white;
      padding: 0px 14px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      cursor: grab;
      pointer-events: auto;
      z-index: 15;
      box-shadow: 0 4px 16px ${colorSet.shadow}, 0 2px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      min-height: 28px;
      min-width: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.85;
    `

    marker.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        width: 100%;
        height: 100%;
      ">
        <span style="font-size: 14px; font-weight: 700; opacity: 0.9;">${arrow}</span>
        <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.3px;">${this.ui.formatTime(time)}</span>
        <button class="ff-marker-remove" style="
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          color: white;
          font-size: 14px;
          font-weight: 400;
          line-height: 1;
          cursor: pointer;
          display: flex
      ;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
          opacity: 0.85;
          transform: scale(1);
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
        " title="Remove ${type} point">×</button>
      </div>
    `

    // Add enhanced hover effects - markers become bold/opaque on hover
    marker.addEventListener('mouseenter', () => {
      if (!marker.classList.contains('dragging')) {
        // Make marker bold and fully opaque
        marker.style.opacity = '1'
        marker.style.transform = 'translateX(-50%) scale(1.08) translateY(-2px)'
        marker.style.boxShadow = `0 6px 20px ${colorSet.shadow}, 0 3px 12px rgba(0, 0, 0, 0.2)`
        marker.style.cursor = 'grab'
      }
    })

    marker.addEventListener('mouseleave', () => {
      if (!marker.classList.contains('dragging')) {
        // Reset to muted/default state
        marker.style.opacity = '0.75'
        marker.style.transform = 'translateX(-50%) scale(1) translateY(0px)'
        marker.style.boxShadow = `0 4px 16px ${colorSet.shadow}, 0 2px 6px rgba(0, 0, 0, 0.1)`
      }
    })

    // Add click to seek functionality - only if not dragging
    marker.addEventListener('click', e => {
      // Don't seek if clicking on X button area or if we just finished dragging
      if (
        (e.target as HTMLElement).classList.contains('ff-marker-remove') ||
        marker.classList.contains('dragging')
      ) {
        return
      }

      this.player.seekTo(time)
      this.ui.showToast(`Jumped to ${type}: ${this.ui.formatTime(time)}`)
    })

    // Add X button functionality with enhanced effects
    const removeBtn = marker.querySelector('.ff-marker-remove') as HTMLElement
    if (removeBtn) {
      removeBtn.addEventListener('click', e => {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
        this.removeMarkerPoint(type)
      })

      removeBtn.addEventListener('mousedown', e => {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
      })

      // Enhanced X button hover effects
      removeBtn.addEventListener('mouseenter', e => {
        e.stopPropagation()
        removeBtn.style.background = 'linear-gradient(135deg, #f87171, #ef4444)'
        removeBtn.style.transform = 'scale(1.1)'
        removeBtn.style.boxShadow = '0 3px 10px rgba(239, 68, 68, 0.6)'
      })

      removeBtn.addEventListener('mouseleave', e => {
        e.stopPropagation()
        removeBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'
        removeBtn.style.transform = 'scale(1)'
        removeBtn.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.4)'
      })
    }

    // Add drag functionality
    this.addDragFunctionality(marker, type, time, duration)

    // Add arrow pointing up to progress bar
    const arrowPointer = document.createElement('div')
    arrowPointer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid ${colorSet.secondary};
      filter: drop-shadow(0 -1px 2px ${colorSet.shadow});
    `
    marker.appendChild(arrowPointer)

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
      background: linear-gradient(90deg, 
        rgba(16, 185, 129, 0.15) 0%, 
        rgba(16, 185, 129, 0.25) 50%, 
        rgba(245, 158, 11, 0.15) 100%
      );
      border: 4px solid rgba(16, 185, 129, 0.4);
      border-left: 4px solid #10b981;
      border-right: 4px solid #f59e0b;
      pointer-events: none;
      z-index: 5;
    `

    return region
  }

  private updateLoopButtonTooltips(): void {
    const context = this.stateMachine.getContext()

    // Update tooltips based on current state and data
    const startButton = document.getElementById('fluent-flow-loop-start')
    if (startButton) {
      const hasStart = context.data.startTime !== null
      const tooltip = hasStart
        ? `Loop Start: ${this.ui.formatTime(context.data.startTime)} (Alt+1 to change)`
        : 'Set Loop Start (Alt+1)'
      startButton.title = tooltip
    }

    const toggleButton = document.getElementById('fluent-flow-loop-toggle')
    if (toggleButton) {
      let tooltip = 'Play/Pause Loop (Alt+L)'
      if (context.state === 'configured') {
        const range = `${this.ui.formatTime(context.data.startTime)} - ${this.ui.formatTime(context.data.endTime)}`
        tooltip = `Start Loop: ${range} (Alt+L)`
      } else if (context.state === 'active') {
        const range = `${this.ui.formatTime(context.data.startTime)} - ${this.ui.formatTime(context.data.endTime)}`
        tooltip = `Pause Loop: ${range} (Alt+L)`
      } else if (context.state === 'paused') {
        const range = `${this.ui.formatTime(context.data.startTime)} - ${this.ui.formatTime(context.data.endTime)}`
        tooltip = `Resume Loop: ${range} (Alt+L)`
      } else if (context.data.startTime !== null || context.data.endTime !== null) {
        tooltip = 'Set both start and end points to enable loop playback'
      }
      toggleButton.title = tooltip
    }

    const endButton = document.getElementById('fluent-flow-loop-end')
    if (endButton) {
      const hasEnd = context.data.endTime !== null
      const tooltip = hasEnd
        ? `Loop End: ${this.ui.formatTime(context.data.endTime)} (Alt+2 to change)`
        : 'Set Loop End (Alt+2)'
      endButton.title = tooltip
    }
  }

  private removeMarkerPoint(type: 'start' | 'end'): void {
    const context = this.stateMachine.getContext()

    if (type === 'start') {
      // Remove start point
      const newData = { ...context.data, startTime: null }

      if (newData.endTime !== null) {
        // Still have end point - go to setting-start
        this.stateMachine.transition('setting-start', newData)
      } else {
        // No points left - go to idle
        this.stateMachine.transition('idle', newData)
      }

      this.ui.showToast('Start point removed')
    } else {
      // Remove end point
      const newData = { ...context.data, endTime: null }

      if (newData.startTime !== null) {
        // Still have start point - go to setting-end
        this.stateMachine.transition('setting-end', newData)
      } else {
        // No points left - go to idle
        this.stateMachine.transition('idle', newData)
      }

      this.ui.showToast('End point removed')
    }
  }

  private addDragFunctionality(
    marker: HTMLElement,
    type: 'start' | 'end',
    initialTime: number,
    duration: number
  ): void {
    let isDragging = false
    let dragStartX = 0
    let initialPercentage = (initialTime / duration) * 100
    let hasMoved = false

    const onMouseDown = (e: MouseEvent) => {
      // Don't start drag if clicking on X button
      if ((e.target as HTMLElement).classList.contains('ff-marker-remove')) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      isDragging = true
      hasMoved = false
      dragStartX = e.clientX
      initialPercentage = (initialTime / duration) * 100

      marker.classList.add('dragging')
      marker.style.cursor = 'grabbing'
      marker.style.transform = 'translateX(-50%) scale(1.1)'
      marker.style.zIndex = '20'

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.progressBar) return

      hasMoved = true
      const progressRect = this.progressBar.getBoundingClientRect()
      const deltaX = e.clientX - dragStartX
      const deltaPercentage = (deltaX / progressRect.width) * 100
      let newPercentage = initialPercentage + deltaPercentage

      // Constrain within bounds
      newPercentage = Math.max(0, Math.min(100, newPercentage))

      // Prevent start/end overlap with minimum gap
      const context = this.stateMachine.getContext()
      const otherTime = type === 'start' ? context.data.endTime : context.data.startTime
      if (otherTime !== null) {
        const otherPercentage = (otherTime / duration) * 100
        if (type === 'start' && newPercentage >= otherPercentage - 1) {
          newPercentage = otherPercentage - 1
        } else if (type === 'end' && newPercentage <= otherPercentage + 1) {
          newPercentage = otherPercentage + 1
        }
      }

      // Update marker position
      marker.style.left = `${newPercentage}%`

      // Update preview time in marker
      const newTime = (newPercentage / 100) * duration
      const timeDisplay = marker.querySelector('span:last-child') as HTMLElement
      if (timeDisplay) {
        timeDisplay.textContent = this.ui.formatTime(newTime)
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging || !this.progressBar) return

      isDragging = false
      marker.classList.remove('dragging')

      // Calculate final position
      const progressRect = this.progressBar.getBoundingClientRect()
      const deltaX = e.clientX - dragStartX
      const deltaPercentage = (deltaX / progressRect.width) * 100
      let newPercentage = initialPercentage + deltaPercentage

      // Constrain within bounds
      newPercentage = Math.max(0, Math.min(100, newPercentage))

      // Prevent overlap
      const context = this.stateMachine.getContext()
      const otherTime = type === 'start' ? context.data.endTime : context.data.startTime
      if (otherTime !== null) {
        const otherPercentage = (otherTime / duration) * 100
        if (type === 'start' && newPercentage >= otherPercentage - 1) {
          newPercentage = otherPercentage - 1
        } else if (type === 'end' && newPercentage <= otherPercentage + 1) {
          newPercentage = otherPercentage + 1
        }
      }

      const newTime = (newPercentage / 100) * duration

      // Update loop state through state machine
      const newData = { ...context.data }
      if (type === 'start') {
        newData.startTime = newTime
      } else {
        newData.endTime = newTime
      }

      // Determine appropriate state
      if (newData.startTime !== null && newData.endTime !== null) {
        this.stateMachine.transition('configured', newData)
      } else {
        this.stateMachine.transition(type === 'start' ? 'setting-end' : 'setting-start', newData)
      }

      // Reset visual state
      marker.style.cursor = 'grab'
      marker.style.transform = 'translateX(-50%) scale(1)'
      marker.style.zIndex = '15'

      // Clean up event listeners
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      // Smart video seeking based on drag type
      if (hasMoved) {
        if (type === 'end') {
          // Seek to end point minus 2-3 seconds for preview
          const previewTime = Math.max(0, newTime - 2.5)
          this.player.seekTo(previewTime)
          this.ui.showToast(`End point updated: ${this.ui.formatTime(newTime)}`)
        } else {
          // Seek to start point for immediate feedback
          this.player.seekTo(newTime)
          this.ui.showToast(`Start point updated: ${this.ui.formatTime(newTime)}`)
        }
      }
    }

    // Add event listeners
    marker.addEventListener('mousedown', onMouseDown)

    // Touch support for mobile
    marker.addEventListener('touchstart', e => {
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      })
      onMouseDown(mouseEvent)
    })
  }
}

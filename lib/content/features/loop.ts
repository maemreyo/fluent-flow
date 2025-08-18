// Loop Feature Module - A/B Loop functionality with progress markers
// Clean separation from other features following SoC principles

import type { SavedLoop } from '../../types/fluent-flow-types'

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
  getVideoInfo(): { id: string | null, title: string | null, url: string | null }
  updateVideoInfo?(): void
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
      
      // Update ALL button states when loop is complete
      this.ui.updateButtonState('fluent-flow-loop-end', 'active')    // ← Missing fix!
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
      this.ui.updateButtonState('fluent-flow-loop', 'active')
    } else {
      this.loopState.mode = 'setting-end'
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
      this.ui.updateButtonState('fluent-flow-loop', 'setting')
    }

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
      
      // Update ALL button states when loop is complete
      this.ui.updateButtonState('fluent-flow-loop-start', 'active')  // ← Missing fix!
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
      this.ui.updateButtonState('fluent-flow-loop', 'active')
    } else {
      this.loopState.mode = 'setting-start'
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
      this.ui.updateButtonState('fluent-flow-loop', 'setting')
    }

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

    // Clean up drag guides and related styles
    const dragGuide = document.getElementById('fluent-flow-drag-guide')
    if (dragGuide) {
      dragGuide.remove()
    }

    const dragGuideStyles = document.getElementById('drag-guide-styles')
    if (dragGuideStyles) {
      dragGuideStyles.remove()
    }

    const dragGuideSlideUpStyles = document.getElementById('drag-guide-slide-up-styles')
    if (dragGuideSlideUpStyles) {
      dragGuideSlideUpStyles.remove()
    }

    // Reset loop state
    this.loopState = {
      isActive: false,
      isLooping: false,
      startTime: null,
      endTime: null,
      mode: 'none'
    }
  }

  // Getters for external access
  public getLoopState(): Readonly<LoopState> {
    return { ...this.loopState }
  }

  public exportCurrentLoop(title?: string, description?: string): SavedLoop | null {
    if (this.loopState.startTime === null || this.loopState.endTime === null) {
      this.ui.showToast('No loop to export - please set start and end points first')
      return null
    }

    // Try to get video info, with retries if needed
    let videoInfo = this.player.getVideoInfo()
    
    // If video info is missing, try to refresh it
    if (!videoInfo.id || !videoInfo.title) {
      console.log('FluentFlow: Video info missing, attempting to refresh...')
      
      // Force update video info
      if (this.player.updateVideoInfo) {
        this.player.updateVideoInfo()
        videoInfo = this.player.getVideoInfo()
      }
      
      // Still no info? Use fallbacks
      if (!videoInfo.id || !videoInfo.title) {
        // Try to get video ID from URL directly
        const urlParams = new URLSearchParams(window.location.search)
        const videoId = urlParams.get('v')
        
        // Try to get title from document title
        const docTitle = document.title
        const fallbackTitle = docTitle && docTitle !== 'YouTube' 
          ? docTitle.replace(/ - YouTube$/, '').trim() 
          : 'Unknown Video'
        
        if (!videoId) {
          this.ui.showToast('Cannot export - unable to detect YouTube video')
          return null
        }
        
        // Use fallback values
        videoInfo = {
          id: videoId,
          title: fallbackTitle,
          url: window.location.href
        }
        
        console.log('FluentFlow: Using fallback video info:', videoInfo)
      }
    }

    const savedLoop: SavedLoop = {
      id: `loop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title: title || `Loop ${this.ui.formatTime(this.loopState.startTime)}-${this.ui.formatTime(this.loopState.endTime)}`,
      videoId: videoInfo.id,
      videoTitle: videoInfo.title,
      videoUrl: videoInfo.url || window.location.href,
      startTime: this.loopState.startTime,
      endTime: this.loopState.endTime,
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

  public applyLoop(savedLoop: SavedLoop): void {
    console.log('FluentFlow: Applying saved loop', savedLoop)
    
    // Check if we're on the correct video
    const currentVideoInfo = this.player.getVideoInfo()
    if (currentVideoInfo.id !== savedLoop.videoId) {
      this.ui.showToast('Wrong video - need to navigate to correct video')
      // This will be handled by the sidepanel for cross-tab navigation
      return
    }

    // Clear current loop
    this.clearLoop()

    // Set loop times
    this.loopState.startTime = savedLoop.startTime
    this.loopState.endTime = savedLoop.endTime
    this.loopState.mode = 'complete'
    this.loopState.isLooping = false

    // Update UI
    this.updateProgressMarkers()
    this.ui.updateButtonState('fluent-flow-loop-start', 'active')
    this.ui.updateButtonState('fluent-flow-loop-end', 'active')
    this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive')
    this.ui.updateButtonState('fluent-flow-loop', 'active')

    // Seek to start time
    this.player.seekTo(savedLoop.startTime)
    
    this.ui.showToast(`Applied loop: ${savedLoop.title}`)
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
    
    // Professional color palette
    const colors = {
      start: {
        primary: '#10b981',    // Emerald-500 
        secondary: '#059669',  // Emerald-600
        shadow: 'rgba(16, 185, 129, 0.3)'
      },
      end: {
        primary: '#f59e0b',    // Amber-500
        secondary: '#d97706',  // Amber-600  
        shadow: 'rgba(245, 158, 11, 0.3)'
      }
    }
    
    const colorSet = colors[type]
    const arrow = type === 'start' ? '→' : '←'
    
    // Create draggable tooltip-style marker
    marker.style.cssText = `
      position: absolute;
      left: ${percentage}%;
      bottom: 120%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, ${colorSet.primary} 0%, ${colorSet.secondary} 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: grab;
      pointer-events: auto;
      z-index: 15;
      box-shadow: 0 4px 12px ${colorSet.shadow}, 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `

    // Add content with arrow, time, and hover remove button
    marker.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        text-align: center;
        position: relative;
      ">
        <span style="font-size: 14px; font-weight: 700;">${arrow}</span>
        <span style="font-size: 11px; opacity: 0.95;">${this.ui.formatTime(time)}</span>
        <button class="ff-marker-remove" style="
          position: absolute;
          top: -6px;
          right: -6px;
          width: 16px;
          height: 16px;
          background: rgba(239, 68, 68, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          color: white;
          font-size: 10px;
          font-weight: bold;
          line-height: 1;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
        " title="Remove ${type} point">×</button>
      </div>
    `

    // Add arrow pointing down with gradient
    const arrow_pointer = document.createElement('div')
    arrow_pointer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid ${colorSet.secondary};
      filter: drop-shadow(0 2px 4px ${colorSet.shadow});
    `
    marker.appendChild(arrow_pointer)

    // Add enhanced hover effects with remove button
    marker.addEventListener('mouseenter', () => {
      if (!marker.classList.contains('dragging')) {
        marker.style.transform = 'translateX(-50%) scale(1.08) translateY(-2px)'
        marker.style.boxShadow = `0 8px 20px ${colorSet.shadow}, 0 4px 8px rgba(0, 0, 0, 0.15)`
        marker.style.cursor = 'grab'
        
        // Show remove button
        const removeBtn = marker.querySelector('.ff-marker-remove') as HTMLElement
        if (removeBtn) {
          removeBtn.style.display = 'flex'
        }
      }
    })

    marker.addEventListener('mouseleave', () => {
      if (!marker.classList.contains('dragging')) {
        marker.style.transform = 'translateX(-50%) scale(1) translateY(0px)'
        marker.style.boxShadow = `0 4px 12px ${colorSet.shadow}, 0 2px 4px rgba(0, 0, 0, 0.1)`
        
        // Hide remove button
        const removeBtn = marker.querySelector('.ff-marker-remove') as HTMLElement
        if (removeBtn) {
          removeBtn.style.display = 'none'
        }
      }
    })

    // Add click to seek functionality
    marker.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!marker.classList.contains('dragging')) {
        this.player.seekTo(time)
        this.ui.showToast(`Jumped to ${type === 'start' ? 'start' : 'end'}: ${this.ui.formatTime(time)}`)
      }
    })

    // Add remove button functionality
    const removeBtn = marker.querySelector('.ff-marker-remove') as HTMLElement
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
        this.removeMarkerPoint(type)
      })

      removeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
      })

      // Add hover effects for remove button
      removeBtn.addEventListener('mouseenter', (e) => {
        e.stopPropagation()
        removeBtn.style.background = 'rgba(239, 68, 68, 1)'
        removeBtn.style.transform = 'scale(1.2)'
        removeBtn.style.zIndex = '25'
      })

      removeBtn.addEventListener('mouseleave', (e) => {
        e.stopPropagation()
        removeBtn.style.background = 'rgba(239, 68, 68, 0.9)'
        removeBtn.style.transform = 'scale(1)'
        removeBtn.style.zIndex = '10'
      })
    }

    // Add drag functionality
    this.addDragFunctionality(marker, type, time, duration)

    // Add vertical line connecting to progress bar with gradient
    const line = document.createElement('div')
    line.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 3px;
      height: 22px;
      background: linear-gradient(to bottom, ${colorSet.secondary}, ${colorSet.primary});
      opacity: 0.8;
      border-radius: 2px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `
    marker.appendChild(line)

    return marker
  }

  private addDragFunctionality(marker: HTMLElement, type: 'start' | 'end', initialTime: number, duration: number): void {
    let isDragging = false
    let dragStartX = 0
    let initialPercentage = (initialTime / duration) * 100

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      isDragging = true
      dragStartX = e.clientX
      initialPercentage = (initialTime / duration) * 100
      
      marker.classList.add('dragging')
      marker.style.cursor = 'grabbing'
      marker.style.transform = 'translateX(-50%) scale(1.1) translateY(-4px)'
      marker.style.zIndex = '20'
      
      // Add visual feedback for dragging
      marker.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3), 0 6px 12px rgba(0, 0, 0, 0.15)'
      
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      
      // Show temporary guide
      this.showDragGuide(type)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.progressBar) return

      const progressRect = this.progressBar.getBoundingClientRect()
      const deltaX = e.clientX - dragStartX
      const deltaPercentage = (deltaX / progressRect.width) * 100
      let newPercentage = initialPercentage + deltaPercentage

      // Constrain within bounds
      newPercentage = Math.max(0, Math.min(100, newPercentage))
      
      // Prevent start/end overlap with 1% minimum gap
      const otherTime = type === 'start' ? this.loopState.endTime : this.loopState.startTime
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
      
      // Calculate and show preview time
      const newTime = (newPercentage / 100) * duration
      const timeDisplay = marker.querySelector('span:last-child') as HTMLElement
      if (timeDisplay) {
        timeDisplay.textContent = this.ui.formatTime(newTime)
      }
      
      // Update drag guide
      this.updateDragGuide(newTime)
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
      const otherTime = type === 'start' ? this.loopState.endTime : this.loopState.startTime
      if (otherTime !== null) {
        const otherPercentage = (otherTime / duration) * 100
        if (type === 'start' && newPercentage >= otherPercentage - 1) {
          newPercentage = otherPercentage - 1
        } else if (type === 'end' && newPercentage <= otherPercentage + 1) {
          newPercentage = otherPercentage + 1
        }
      }

      const newTime = (newPercentage / 100) * duration

      // Update loop state
      if (type === 'start') {
        this.loopState.startTime = newTime
      } else {
        this.loopState.endTime = newTime
      }

      // Reset visual state
      marker.style.cursor = 'grab'
      marker.style.transform = 'translateX(-50%) scale(1) translateY(0px)'
      marker.style.zIndex = '15'
      marker.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)'

      // Clean up event listeners
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      // Smart video seeking based on drag type
      if (type === 'end') {
        // Seek to end point minus 2-3 seconds for preview
        const previewTime = Math.max(0, newTime - 2.5)
        this.player.seekTo(previewTime)
        this.ui.showToast(`End point updated: ${this.ui.formatTime(newTime)} (previewing from ${this.ui.formatTime(previewTime)})`)
      } else {
        // Seek to start point for immediate feedback
        this.player.seekTo(newTime)
        this.ui.showToast(`Start point updated: ${this.ui.formatTime(newTime)}`)
      }

      // Update button states based on current loop state
      if (type === 'start') {
        this.ui.updateButtonState('fluent-flow-loop-start', 'active')
        if (this.loopState.endTime !== null) {
          // Complete loop - update all button states
          this.loopState.mode = 'complete'
          this.loopState.isLooping = true
          this.ui.updateButtonState('fluent-flow-loop-end', 'active')
          this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
          this.ui.updateButtonState('fluent-flow-loop', 'active')
        } else {
          // Partial loop - setting mode
          this.loopState.mode = 'setting-end'
          this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
          this.ui.updateButtonState('fluent-flow-loop', 'setting')
        }
      } else {
        this.ui.updateButtonState('fluent-flow-loop-end', 'active')
        if (this.loopState.startTime !== null) {
          // Complete loop - update all button states
          this.loopState.mode = 'complete'
          this.loopState.isLooping = true
          this.ui.updateButtonState('fluent-flow-loop-start', 'active')
          this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
          this.ui.updateButtonState('fluent-flow-loop', 'active')
        } else {
          // Partial loop - setting mode
          this.loopState.mode = 'setting-start'
          this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
          this.ui.updateButtonState('fluent-flow-loop', 'setting')
        }
      }

      // Update progress markers and tooltips
      this.updateProgressMarkers()
      this.updateLoopButtonTooltips()
      
      // Hide drag guide
      this.hideDragGuide()
    }

    // Add event listeners
    marker.addEventListener('mousedown', onMouseDown)
    
    // Touch support for mobile
    marker.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      })
      onMouseDown(mouseEvent)
    })
  }

  private showDragGuide(type: 'start' | 'end'): void {
    // Remove existing guide
    const existingGuide = document.getElementById('fluent-flow-drag-guide')
    if (existingGuide) {
      existingGuide.remove()
    }

    const guide = document.createElement('div')
    guide.id = 'fluent-flow-drag-guide'
    guide.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideDown 0.3s ease-out;
    `

    const arrow = type === 'start' ? '→' : '←'
    guide.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px;">${arrow}</span>
        <span>Dragging ${type} point</span>
        <span id="drag-time-preview">--:--</span>
      </div>
    `

    // Add slide down animation
    if (!document.getElementById('drag-guide-styles')) {
      const style = document.createElement('style')
      style.id = 'drag-guide-styles'
      style.textContent = `
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(guide)
  }

  private updateDragGuide(time: number): void {
    const timePreview = document.getElementById('drag-time-preview')
    if (timePreview) {
      timePreview.textContent = this.ui.formatTime(time)
    }
  }

  private hideDragGuide(): void {
    const guide = document.getElementById('fluent-flow-drag-guide')
    if (guide) {
      guide.style.animation = 'slideUp 0.3s ease-out forwards'
      
      // Add slide up animation if not exists
      if (!document.getElementById('drag-guide-slide-up-styles')) {
        const style = document.createElement('style')
        style.id = 'drag-guide-slide-up-styles'
        style.textContent = `
          @keyframes slideUp {
            from {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
            to {
              opacity: 0;
              transform: translateX(-50%) translateY(-10px);
            }
          }
        `
        document.head.appendChild(style)
      }

      setTimeout(() => {
        guide.remove()
      }, 300)
    }
  }

  private removeMarkerPoint(type: 'start' | 'end'): void {
    // Remove the specific marker point
    if (type === 'start') {
      this.loopState.startTime = null
      this.ui.showToast('Start point removed')
    } else {
      this.loopState.endTime = null
      this.ui.showToast('End point removed')
    }

    // Update loop state based on remaining markers
    if (this.loopState.startTime === null && this.loopState.endTime === null) {
      // No markers left - reset completely
      this.loopState.mode = 'none'
      this.loopState.isActive = false
      this.loopState.isLooping = false
      this.ui.updateButtonState('fluent-flow-loop', 'inactive')
      this.ui.updateButtonState('fluent-flow-loop-start', 'inactive')
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive')
      this.ui.updateButtonState('fluent-flow-loop-end', 'inactive')
    } else if (this.loopState.startTime !== null && this.loopState.endTime === null) {
      // Only start marker remains
      this.loopState.mode = 'setting-end'
      this.loopState.isLooping = false
      this.ui.updateButtonState('fluent-flow-loop', 'setting')
      this.ui.updateButtonState('fluent-flow-loop-start', 'active')
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
      this.ui.updateButtonState('fluent-flow-loop-end', 'inactive')
    } else if (this.loopState.startTime === null && this.loopState.endTime !== null) {
      // Only end marker remains
      this.loopState.mode = 'setting-start'
      this.loopState.isLooping = false
      this.ui.updateButtonState('fluent-flow-loop', 'setting')
      this.ui.updateButtonState('fluent-flow-loop-start', 'inactive')
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
      this.ui.updateButtonState('fluent-flow-loop-end', 'active')
    }

    // Update visual elements
    this.updateProgressMarkers()
    this.updateLoopButtonTooltips()
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
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-left: 2px solid #10b981;
      border-right: 2px solid #f59e0b;
      pointer-events: none;
      z-index: 5;
      backdrop-filter: blur(1px);
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
      
      // Update start button state
      this.ui.updateButtonState('fluent-flow-loop-start', 'active')
    } else {
      if (this.loopState.startTime && time <= this.loopState.startTime) {
        this.ui.showToast('End time cannot be before start time')
        return
      }
      this.loopState.endTime = time
      this.ui.showToast(`Loop end set: ${this.ui.formatTime(time)}`)
      
      // Update end button state
      this.ui.updateButtonState('fluent-flow-loop-end', 'active')
    }

    // Update state machine and all button states
    if (this.loopState.startTime !== null && this.loopState.endTime !== null) {
      this.loopState.mode = 'complete'
      this.loopState.isLooping = true
      this.loopState.isActive = true
      
      // Update all button states for complete loop
      this.ui.updateButtonState('fluent-flow-loop', 'active')
      this.ui.updateButtonState('fluent-flow-loop-start', 'active')
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
      this.ui.updateButtonState('fluent-flow-loop-end', 'active')
    } else {
      // Partial loop - update toggle button to setting state
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'setting')
    }

    this.updateProgressMarkers()
    this.updateLoopButtonTooltips()
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
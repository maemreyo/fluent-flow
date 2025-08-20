// Multiple Loops Feature - Enhanced Loop Management
// Supports creating, managing, and visualizing multiple loops on a single video

import type { SavedLoop } from '../../types/fluent-flow-types'

export interface ActiveLoop {
  id: string
  title: string
  startTime: number
  endTime: number
  isActive: boolean
  color: string
  description?: string
  createdAt: Date
}

export interface LoopCreationState {
  mode: 'idle' | 'creating' | 'setting-start' | 'setting-end'
  tempLoop?: {
    startTime: number | null
    endTime: number | null
  }
}

interface UIUtilities {
  showToast(message: string): void
  formatTime(seconds: number | null): string
  updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void
}

interface YouTubePlayerIntegration {
  getCurrentTime(): number | null
  getVideoDuration(): number
  seekTo(time: number): void
  getVideoInfo(): { id: string; title: string; url?: string }
}

export class MultipleLoopsFeature {
  private activeLoops: ActiveLoop[] = []
  private creationState: LoopCreationState = { mode: 'idle' }
  private progressBar: HTMLElement | null = null
  private currentlyPlayingLoop: string | null = null
  private loopInterval: NodeJS.Timeout | null = null
  private loopColors = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ]

  constructor(
    private player: YouTubePlayerIntegration,
    private ui: UIUtilities
  ) {
    this.startLoopMonitoring()
  }

  // === PUBLIC API ===

  public startCreatingLoop(): void {
    this.creationState = { mode: 'creating', tempLoop: { startTime: null, endTime: null } }
    this.ui.updateButtonState('fluent-flow-loop-start', 'setting')
    this.ui.showToast('Click to set loop start point')
    this.updateUI()
  }

  public setLoopStart(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    if (this.creationState.mode === 'idle') {
      this.startCreatingLoop()
    }

    if (!this.creationState.tempLoop) {
      this.creationState.tempLoop = { startTime: null, endTime: null }
    }

    // Check for conflicts with existing loops
    const conflict = this.findLoopConflict(currentTime, null)
    if (conflict) {
      this.ui.showToast(`Time conflicts with "${conflict.title}" loop`)
      return
    }

    this.creationState.tempLoop.startTime = currentTime
    this.creationState.mode = 'setting-end'
    
    this.ui.updateButtonState('fluent-flow-loop-start', 'active')
    this.ui.updateButtonState('fluent-flow-loop-end', 'setting')
    this.ui.showToast(`Loop start: ${this.ui.formatTime(currentTime)} - Now set end point`)
    this.updateUI()
  }

  public setLoopEnd(): void {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot access video player')
      return
    }

    if (this.creationState.mode === 'idle') {
      this.ui.showToast('Set loop start point first')
      return
    }

    if (!this.creationState.tempLoop?.startTime) {
      this.ui.showToast('Set loop start point first')
      return
    }

    if (currentTime <= this.creationState.tempLoop.startTime) {
      this.ui.showToast('End time must be after start time')
      return
    }

    // Check for conflicts
    const conflict = this.findLoopConflict(this.creationState.tempLoop.startTime, currentTime)
    if (conflict) {
      this.ui.showToast(`Time range conflicts with "${conflict.title}" loop`)
      return
    }

    this.creationState.tempLoop.endTime = currentTime
    this.completeLoopCreation()
  }

  public toggleLoopPlayback(): void {
    if (this.activeLoops.length === 0) {
      this.ui.showToast('No loops created yet')
      return
    }

    if (this.currentlyPlayingLoop) {
      this.stopCurrentLoop()
    } else {
      // Find the best loop to play based on current time
      const currentTime = this.player.getCurrentTime()
      if (currentTime !== null) {
        const bestLoop = this.findBestLoopForTime(currentTime)
        if (bestLoop) {
          this.playLoop(bestLoop.id)
        } else {
          // Play the first loop
          this.playLoop(this.activeLoops[0].id)
        }
      }
    }
  }

  public clearAllLoops(): void {
    this.activeLoops = []
    this.currentlyPlayingLoop = null
    this.creationState = { mode: 'idle' }
    this.updateUI()
    this.ui.showToast('All loops cleared')
  }

  public removeLoop(loopId: string): void {
    const loop = this.activeLoops.find(l => l.id === loopId)
    if (!loop) return

    if (this.currentlyPlayingLoop === loopId) {
      this.stopCurrentLoop()
    }

    this.activeLoops = this.activeLoops.filter(l => l.id !== loopId)
    this.updateUI()
    this.ui.showToast(`Loop "${loop.title}" removed`)
  }

  public playLoop(loopId: string): void {
    const loop = this.activeLoops.find(l => l.id === loopId)
    if (!loop) return

    // Stop current loop if any
    if (this.currentlyPlayingLoop) {
      this.stopCurrentLoop()
    }

    this.currentlyPlayingLoop = loopId
    loop.isActive = true
    
    // Seek to start
    this.player.seekTo(loop.startTime)
    
    this.updateUI()
    this.ui.showToast(`Playing loop: ${loop.title}`)
  }

  public stopCurrentLoop(): void {
    if (this.currentlyPlayingLoop) {
      const loop = this.activeLoops.find(l => l.id === this.currentlyPlayingLoop)
      if (loop) {
        loop.isActive = false
      }
      this.currentlyPlayingLoop = null
      this.updateUI()
      this.ui.showToast('Loop stopped')
    }
  }

  public getActiveLoops(): ActiveLoop[] {
    return [...this.activeLoops]
  }

  public exportCurrentLoops(): SavedLoop[] {
    const videoInfo = this.player.getVideoInfo()
    
    return this.activeLoops.map(loop => ({
      id: loop.id,
      title: loop.title,
      videoId: videoInfo.id,
      videoTitle: videoInfo.title,
      videoUrl: videoInfo.url || window.location.href,
      startTime: loop.startTime,
      endTime: loop.endTime,
      description: loop.description,
      createdAt: loop.createdAt,
      updatedAt: new Date()
    }))
  }

  public importLoops(savedLoops: SavedLoop[]): void {
    const videoInfo = this.player.getVideoInfo()
    
    // Filter loops for current video
    const relevantLoops = savedLoops.filter(loop => loop.videoId === videoInfo.id)
    
    this.activeLoops = relevantLoops.map((savedLoop, index) => ({
      id: savedLoop.id,
      title: savedLoop.title,
      startTime: savedLoop.startTime,
      endTime: savedLoop.endTime,
      isActive: false,
      color: this.loopColors[index % this.loopColors.length],
      description: savedLoop.description,
      createdAt: savedLoop.createdAt
    }))

    this.updateUI()
    this.ui.showToast(`Loaded ${relevantLoops.length} loops for this video`)
  }

  // === SETUP METHODS ===

  public setupProgressBarIntegration(progressBar: HTMLElement): void {
    this.progressBar = progressBar
    this.injectProgressMarkers()
  }

  // === PRIVATE METHODS ===

  private completeLoopCreation(): void {
    if (!this.creationState.tempLoop?.startTime || !this.creationState.tempLoop?.endTime) {
      return
    }

    const loopNumber = this.activeLoops.length + 1
    const duration = this.creationState.tempLoop.endTime - this.creationState.tempLoop.startTime
    
    const newLoop: ActiveLoop = {
      id: `loop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title: `Loop ${loopNumber} (${this.ui.formatTime(duration)})`,
      startTime: this.creationState.tempLoop.startTime,
      endTime: this.creationState.tempLoop.endTime,
      isActive: false,
      color: this.loopColors[this.activeLoops.length % this.loopColors.length],
      createdAt: new Date()
    }

    this.activeLoops.push(newLoop)
    this.creationState = { mode: 'idle' }
    
    this.updateUI()
    this.ui.showToast(`Loop created: ${newLoop.title}`)
  }

  private findLoopConflict(startTime: number, endTime: number | null): ActiveLoop | null {
    for (const loop of this.activeLoops) {
      if (endTime === null) {
        // Just checking start time
        if (startTime >= loop.startTime && startTime <= loop.endTime) {
          return loop
        }
      } else {
        // Checking full range overlap
        if (!(endTime <= loop.startTime || startTime >= loop.endTime)) {
          return loop
        }
      }
    }
    return null
  }

  private findBestLoopForTime(currentTime: number): ActiveLoop | null {
    // Find loop that contains current time
    for (const loop of this.activeLoops) {
      if (currentTime >= loop.startTime && currentTime <= loop.endTime) {
        return loop
      }
    }
    
    // Find closest loop after current time
    let closest: ActiveLoop | null = null
    let minDistance = Infinity
    
    for (const loop of this.activeLoops) {
      if (loop.startTime > currentTime) {
        const distance = loop.startTime - currentTime
        if (distance < minDistance) {
          minDistance = distance
          closest = loop
        }
      }
    }
    
    return closest
  }

  private startLoopMonitoring(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
    }

    this.loopInterval = setInterval(() => {
      if (this.currentlyPlayingLoop) {
        const loop = this.activeLoops.find(l => l.id === this.currentlyPlayingLoop)
        if (loop) {
          const currentTime = this.player.getCurrentTime()
          if (currentTime !== null && currentTime >= loop.endTime) {
            this.player.seekTo(loop.startTime)
          }
        }
      }
    }, 100)
  }

  private updateUI(): void {
    // Update button states
    if (this.creationState.mode === 'idle') {
      this.ui.updateButtonState('fluent-flow-loop-start', 'inactive')
      this.ui.updateButtonState('fluent-flow-loop-end', 'inactive')
    } else if (this.creationState.mode === 'setting-start' || this.creationState.mode === 'creating') {
      this.ui.updateButtonState('fluent-flow-loop-start', 'setting')
      this.ui.updateButtonState('fluent-flow-loop-end', 'inactive')
    } else if (this.creationState.mode === 'setting-end') {
      this.ui.updateButtonState('fluent-flow-loop-start', 'active')
      this.ui.updateButtonState('fluent-flow-loop-end', 'setting')
    }

    // Update loop toggle button
    if (this.currentlyPlayingLoop) {
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'active')
    } else if (this.activeLoops.length > 0) {
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive')
    } else {
      this.ui.updateButtonState('fluent-flow-loop-toggle', 'inactive')
    }

    // Update progress markers
    this.updateProgressMarkers()
  }

  private injectProgressMarkers(): void {
    if (!this.progressBar) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.fluent-flow-marker, .fluent-flow-loop-region')
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

    // Create markers for each loop
    this.activeLoops.forEach((loop, index) => {
      this.createLoopMarkers(loop, duration, markerContainer as HTMLElement)
    })

    // Create temp loop markers if in creation mode
    if (this.creationState.tempLoop) {
      this.createTempLoopMarkers(this.creationState.tempLoop, duration, markerContainer as HTMLElement)
    }
  }

  private createLoopMarkers(loop: ActiveLoop, duration: number, container: HTMLElement): void {
    // Create loop region
    const startPercent = (loop.startTime / duration) * 100
    const endPercent = (loop.endTime / duration) * 100
    const width = endPercent - startPercent

    const region = document.createElement('div')
    region.className = 'fluent-flow-loop-region'
    region.style.cssText = `
      position: absolute;
      left: ${startPercent}%;
      top: 0;
      width: ${width}%;
      height: 100%;
      background: ${loop.color}33;
      border: 2px solid ${loop.color};
      pointer-events: auto;
      z-index: 5;
      cursor: pointer;
      transition: all 0.2s ease;
    `

    // Add hover effect
    region.addEventListener('mouseenter', () => {
      region.style.background = `${loop.color}55`
      region.style.borderWidth = '3px'
    })

    region.addEventListener('mouseleave', () => {
      region.style.background = `${loop.color}33`
      region.style.borderWidth = '2px'
    })

    // Add click to play
    region.addEventListener('click', () => {
      this.playLoop(loop.id)
    })

    container.appendChild(region)

    // Create loop label
    const label = document.createElement('div')
    label.className = 'fluent-flow-loop-label'
    label.style.cssText = `
      position: absolute;
      left: ${startPercent}%;
      bottom: 120%;
      transform: translateX(-50%);
      background: ${loop.color};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: auto;
      z-index: 15;
      cursor: pointer;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
    `

    label.textContent = loop.title
    label.title = `${loop.title}\n${this.ui.formatTime(loop.startTime)} - ${this.ui.formatTime(loop.endTime)}\nClick to play, right-click to remove`

    // Add context menu for removal
    label.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.removeLoop(loop.id)
    })

    label.addEventListener('click', () => {
      this.playLoop(loop.id)
    })

    container.appendChild(label)

    // Visual indicator for active loop
    if (loop.isActive) {
      region.style.boxShadow = `0 0 10px ${loop.color}`
      label.style.boxShadow = `0 0 8px ${loop.color}`
    }
  }

  private createTempLoopMarkers(tempLoop: { startTime: number | null; endTime: number | null }, duration: number, container: HTMLElement): void {
    if (tempLoop.startTime !== null) {
      const startPercent = (tempLoop.startTime / duration) * 100
      
      const startMarker = document.createElement('div')
      startMarker.className = 'fluent-flow-temp-marker'
      startMarker.style.cssText = `
        position: absolute;
        left: ${startPercent}%;
        bottom: 120%;
        transform: translateX(-50%);
        background: #fbbf24;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
        z-index: 15;
        border: 2px dashed #f59e0b;
      `
      startMarker.textContent = `Start: ${this.ui.formatTime(tempLoop.startTime)}`
      container.appendChild(startMarker)
    }

    if (tempLoop.startTime !== null && tempLoop.endTime !== null) {
      const startPercent = (tempLoop.startTime / duration) * 100
      const endPercent = (tempLoop.endTime / duration) * 100
      const width = endPercent - startPercent

      const tempRegion = document.createElement('div')
      tempRegion.className = 'fluent-flow-temp-region'
      tempRegion.style.cssText = `
        position: absolute;
        left: ${startPercent}%;
        top: 0;
        width: ${width}%;
        height: 100%;
        background: rgba(251, 191, 36, 0.3);
        border: 2px dashed #f59e0b;
        z-index: 5;
      `
      container.appendChild(tempRegion)
    }
  }

  public destroy(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }

    // Remove markers
    const existingMarkers = document.querySelectorAll('.fluent-flow-marker, .fluent-flow-loop-region, .fluent-flow-loop-label')
    existingMarkers.forEach(marker => marker.remove())

    const markerContainer = document.querySelector('.fluent-flow-markers')
    if (markerContainer) {
      markerContainer.remove()
    }

    this.activeLoops = []
    this.currentlyPlayingLoop = null
    this.creationState = { mode: 'idle' }
  }
}
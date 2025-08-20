// FluentFlow Sidebar Component
// Inspired by eJoy's side-bar design but optimized for FluentFlow features

export interface SidebarConfig {
  position: 'left' | 'right'
  theme: 'dark' | 'light'
  collapsible: boolean
  autoHide: boolean
}

export interface SidebarButton {
  id: string
  title: string
  icon: string
  action: () => void
  rightClick?: () => void
  group: 'loop' | 'recording' | 'notes' | 'other'
  state?: 'inactive' | 'active' | 'setting' | 'paused'
}

export class FluentFlowSidebar {
  private container: HTMLElement | null = null
  private isVisible: boolean = false
  // private isCollapsed: boolean = true // Not currently used
  private config: SidebarConfig
  private buttons: SidebarButton[] = []

  constructor(config: Partial<SidebarConfig> = {}) {
    this.config = {
      position: 'right',
      theme: 'dark',
      collapsible: true,
      autoHide: false,
      ...config
    }
    
    this.initialize()
  }

  private initialize(): void {
    console.log('FluentFlow: Initializing sidebar')
    this.injectStyles()
    this.createSidebar()
    this.setupEventListeners()
  }

  private injectStyles(): void {
    if (document.getElementById('fluent-flow-sidebar-styles')) return

    const styles = document.createElement('style')
    styles.id = 'fluent-flow-sidebar-styles'
    styles.textContent = `
      /* FluentFlow Sidebar Styles */
      .fluent-flow-sidebar {
        position: fixed !important;
        top: 50% !important;
        right: -340px !important;
        transform: translateY(-50%) !important;
        width: 320px !important;
        max-height: 80vh !important;
        background: ${this.config.theme === 'dark' ? '#1a1a1a' : '#ffffff'} !important;
        border: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'} !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        z-index: 2147483647 !important;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif !important;
        overflow: hidden !important;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        backdrop-filter: blur(10px) !important;
      }

      .fluent-flow-sidebar.ff-sidebar-visible {
        right: 20px !important;
      }

      .fluent-flow-sidebar-toggle {
        position: fixed !important;
        top: 50% !important;
        right: 0 !important;
        transform: translateY(-50%) !important;
        width: 24px !important;
        height: 48px !important;
        background: ${this.config.theme === 'dark' ? 'rgba(42, 42, 42, 0.7)' : 'rgba(245, 245, 245, 0.7)'} !important;
        border: 1px solid ${this.config.theme === 'dark' ? 'rgba(68, 68, 68, 0.5)' : 'rgba(208, 208, 208, 0.5)'} !important;
        border-radius: 6px 0 0 6px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 2147483646 !important;
        transition: opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease !important;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1) !important;
        opacity: 0.6 !important;
        backdrop-filter: blur(4px) !important;
      }

      .fluent-flow-sidebar-toggle:hover {
        background: ${this.config.theme === 'dark' ? 'rgba(58, 58, 58, 0.9)' : 'rgba(229, 229, 229, 0.9)'} !important;
        opacity: 1 !important;
        box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15) !important;
      }

      .fluent-flow-sidebar-toggle svg {
        color: ${this.config.theme === 'dark' ? '#b0b0b0' : '#555555'} !important;
        transition: transform 0.3s ease, color 0.2s ease !important;
      }

      .fluent-flow-sidebar-toggle:hover svg {
        color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'} !important;
      }

      .fluent-flow-sidebar-toggle.ff-sidebar-open svg {
        transform: rotate(180deg) !important;
      }

      .fluent-flow-sidebar-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px 20px !important;
        border-bottom: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'} !important;
        background: ${this.config.theme === 'dark' ? '#2a2a2a' : '#f8f9fa'} !important;
      }

      .fluent-flow-sidebar-title {
        font-size: 18px !important;
        font-weight: 600 !important;
        color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'} !important;
        margin: 0 !important;
      }

      .fluent-flow-sidebar-subtitle {
        font-size: 12px !important;
        color: ${this.config.theme === 'dark' ? '#888888' : '#666666'} !important;
        margin: 2px 0 0 0 !important;
      }

      .fluent-flow-sidebar-close {
        width: 32px !important;
        height: 32px !important;
        border: none !important;
        background: transparent !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: ${this.config.theme === 'dark' ? '#888888' : '#666666'} !important;
        transition: all 0.2s ease !important;
      }

      .fluent-flow-sidebar-close:hover {
        background: ${this.config.theme === 'dark' ? '#404040' : '#e0e0e0'} !important;
        color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'} !important;
      }

      .fluent-flow-sidebar-content {
        padding: 20px !important;
        max-height: calc(80vh - 80px) !important;
        overflow-y: auto !important;
      }

      .fluent-flow-sidebar-content::-webkit-scrollbar {
        width: 6px !important;
      }

      .fluent-flow-sidebar-content::-webkit-scrollbar-track {
        background: transparent !important;
      }

      .fluent-flow-sidebar-content::-webkit-scrollbar-thumb {
        background: ${this.config.theme === 'dark' ? '#444444' : '#cccccc'} !important;
        border-radius: 3px !important;
      }

      .fluent-flow-sidebar-group {
        margin-bottom: 24px !important;
      }

      .fluent-flow-sidebar-group:last-child {
        margin-bottom: 0 !important;
      }

      .fluent-flow-sidebar-group-title {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: ${this.config.theme === 'dark' ? '#cccccc' : '#555555'} !important;
        margin: 0 0 12px 0 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }

      .fluent-flow-sidebar-button {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        padding: 12px 16px !important;
        margin-bottom: 8px !important;
        background: transparent !important;
        border: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'} !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        text-align: left !important;
        color: ${this.config.theme === 'dark' ? '#e0e0e0' : '#333333'} !important;
        font-size: 14px !important;
      }

      .fluent-flow-sidebar-button:hover {
        background: ${this.config.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'} !important;
        border-color: ${this.config.theme === 'dark' ? '#444444' : '#d0d0d0'} !important;
        transform: translateY(-1px) !important;
      }

      .fluent-flow-sidebar-button:last-child {
        margin-bottom: 0 !important;
      }

      .fluent-flow-sidebar-button-icon {
        width: 24px !important;
        height: 24px !important;
        margin-right: 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      .fluent-flow-sidebar-button-icon svg {
        width: 20px !important;
        height: 20px !important;
      }

      .fluent-flow-sidebar-button-content {
        flex: 1 !important;
      }

      .fluent-flow-sidebar-button-title {
        font-weight: 500 !important;
        margin-bottom: 2px !important;
      }

      .fluent-flow-sidebar-button-subtitle {
        font-size: 12px !important;
        color: ${this.config.theme === 'dark' ? '#888888' : '#666666'} !important;
      }

      /* Button States */
      .fluent-flow-sidebar-button.ff-active {
        background: rgba(34, 197, 94, 0.1) !important;
        border-color: rgba(34, 197, 94, 0.3) !important;
        color: ${this.config.theme === 'dark' ? '#4ade80' : '#16a34a'} !important;
      }

      .fluent-flow-sidebar-button.ff-setting {
        background: rgba(251, 191, 36, 0.1) !important;
        border-color: rgba(251, 191, 36, 0.3) !important;
        color: ${this.config.theme === 'dark' ? '#fbbf24' : '#d97706'} !important;
      }

      .fluent-flow-sidebar-button.ff-paused {
        background: rgba(239, 68, 68, 0.1) !important;
        border-color: rgba(239, 68, 68, 0.3) !important;
        color: ${this.config.theme === 'dark' ? '#f87171' : '#dc2626'} !important;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .fluent-flow-sidebar {
          width: 280px !important;
          max-height: 70vh !important;
        }
        
        .fluent-flow-sidebar-content {
          padding: 16px !important;
        }

        .fluent-flow-sidebar-toggle {
          width: 20px !important;
          height: 44px !important;
        }
      }

      /* Animations */
      @keyframes ff-sidebar-fade-in {
        from {
          opacity: 0;
          right: -340px !important;
        }
        to {
          opacity: 1;
          right: 20px !important;
        }
      }

      .fluent-flow-sidebar.ff-sidebar-animate-in {
        animation: ff-sidebar-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
      }
    `
    
    document.head.appendChild(styles)
  }

  private createSidebar(): void {
    console.log('FluentFlow: createSidebar called')
    
    // Find YouTube container
    const youtubeContainer = document.querySelector('#container.style-scope.ytd-player') as HTMLElement
    if (!youtubeContainer) {
      console.error('FluentFlow: YouTube container not found')
      return
    }

    console.log('FluentFlow: YouTube container found')

    // Create toggle button
    const toggle = document.createElement('div')
    toggle.className = 'fluent-flow-sidebar-toggle'
    toggle.innerHTML = this.getToggleIcon()
    toggle.addEventListener('click', () => this.toggleSidebar())

    // Create sidebar container
    const sidebar = document.createElement('div')
    sidebar.className = 'fluent-flow-sidebar'
    
    // Create header with Alt+F in title
    const header = document.createElement('div')
    header.className = 'fluent-flow-sidebar-header'
    header.innerHTML = `
      <div>
        <h2 class="fluent-flow-sidebar-title">FluentFlow (Alt+F)</h2>
        <p class="fluent-flow-sidebar-subtitle">YouTube Language Learning</p>
      </div>
      <button class="fluent-flow-sidebar-close">
        ${this.getCloseIcon()}
      </button>
    `

    // Create content container
    const content = document.createElement('div')
    content.className = 'fluent-flow-sidebar-content'

    // Add close button functionality
    const closeBtn = header.querySelector('.fluent-flow-sidebar-close') as HTMLElement
    closeBtn.addEventListener('click', () => this.hideSidebar())

    sidebar.appendChild(header)
    sidebar.appendChild(content)

    // Append to YouTube container
    youtubeContainer.appendChild(toggle)
    youtubeContainer.appendChild(sidebar)

    this.container = sidebar
    
    console.log('FluentFlow: Sidebar created and injected into YouTube container')
    console.log('FluentFlow: Content element:', content)
  }

  private setupEventListeners(): void {
    // Handle clicks outside sidebar to close it
    document.addEventListener('click', (event) => {
      if (this.isVisible && this.container && !this.container.contains(event.target as Node)) {
        const toggle = document.querySelector('.fluent-flow-sidebar-toggle')
        if (toggle && !toggle.contains(event.target as Node)) {
          this.hideSidebar()
        }
      }
    })

    // Handle escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hideSidebar()
      }
    })
  }

  public addButtons(buttons: SidebarButton[]): void {
    console.log('FluentFlow: Adding buttons to sidebar:', buttons.length)
    this.buttons = buttons
    this.renderButtons()
  }

  public addLoopsSection(loops: any[]): void {
    if (!this.container) return

    const content = this.container.querySelector('.fluent-flow-sidebar-content') as HTMLElement
    if (!content) return

    // Find existing loops section and remove it
    const existingLoopsSection = content.querySelector('.fluent-flow-loops-section')
    if (existingLoopsSection) {
      existingLoopsSection.remove()
    }

    if (loops.length === 0) return

    // Create loops section
    const loopsSection = document.createElement('div')
    loopsSection.className = 'fluent-flow-loops-section fluent-flow-sidebar-group'

    const title = document.createElement('h3')
    title.className = 'fluent-flow-sidebar-group-title'
    title.textContent = `Active Loops (${loops.length})`
    loopsSection.appendChild(title)

    // Create loop items
    loops.forEach(loop => {
      const loopItem = document.createElement('div')
      loopItem.className = 'fluent-flow-loop-item'
      loopItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        margin-bottom: 6px;
        background: ${this.config.theme === 'dark' ? '#2a2a2a' : '#f8f9fa'};
        border: 1px solid ${loop.color}44;
        border-left: 4px solid ${loop.color};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      `

      const loopInfo = document.createElement('div')
      loopInfo.className = 'fluent-flow-loop-info'
      loopInfo.style.cssText = 'flex: 1; overflow: hidden;'
      loopInfo.innerHTML = `
        <div style="
          font-size: 12px;
          font-weight: 600;
          color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'};
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${loop.title}</div>
        <div style="
          font-size: 10px;
          color: ${this.config.theme === 'dark' ? '#888888' : '#666666'};
        ">
          ${this.formatTime(loop.startTime)} - ${this.formatTime(loop.endTime)}
        </div>
      `

      const loopActions = document.createElement('div')
      loopActions.className = 'fluent-flow-loop-actions'
      loopActions.style.cssText = 'display: flex; gap: 4px;'
      
      // Play button
      const playBtn = document.createElement('button')
      playBtn.innerHTML = loop.isActive ? '⏸️' : '▶️'
      playBtn.style.cssText = `
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 12px;
        transition: background-color 0.2s ease;
      `
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (loop.isActive) {
          this.dispatchLoopEvent('stop', loop.id)
        } else {
          this.dispatchLoopEvent('play', loop.id)
        }
      })

      // Remove button
      const removeBtn = document.createElement('button')
      removeBtn.innerHTML = '🗑️'
      removeBtn.style.cssText = `
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 10px;
        transition: background-color 0.2s ease;
      `
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.dispatchLoopEvent('remove', loop.id)
      })

      loopActions.appendChild(playBtn)
      loopActions.appendChild(removeBtn)

      loopItem.appendChild(loopInfo)
      loopItem.appendChild(loopActions)

      // Click to play loop
      loopItem.addEventListener('click', () => {
        this.dispatchLoopEvent('play', loop.id)
      })

      // Hover effects
      loopItem.addEventListener('mouseenter', () => {
        loopItem.style.background = `${loop.color}22`
        loopItem.style.borderColor = `${loop.color}88`
      })

      loopItem.addEventListener('mouseleave', () => {
        loopItem.style.background = this.config.theme === 'dark' ? '#2a2a2a' : '#f8f9fa'
        loopItem.style.borderColor = `${loop.color}44`
      })

      loopsSection.appendChild(loopItem)
    })

    // Insert loops section before footer
    const footer = content.querySelector('.fluent-flow-sidebar-footer')
    if (footer) {
      content.insertBefore(loopsSection, footer)
    } else {
      content.appendChild(loopsSection)
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  private dispatchLoopEvent(action: string, loopId: string): void {
    const event = new CustomEvent('fluent-flow-loop-action', {
      detail: { action, loopId }
    })
    document.dispatchEvent(event)
  }

  private renderButtons(): void {
    console.log('FluentFlow: renderButtons called')
    
    if (!this.container) {
      console.log('FluentFlow: No container found')
      return
    }

    const content = this.container.querySelector('.fluent-flow-sidebar-content') as HTMLElement
    if (!content) {
      console.log('FluentFlow: No content element found')
      return
    }

    console.log('FluentFlow: Rendering buttons:', this.buttons.length)

    // Group buttons by category
    const groups = this.groupButtons()
    console.log('FluentFlow: Grouped buttons:', groups)
    
    // Clear existing content
    content.innerHTML = ''

    // Create groups
    Object.entries(groups).forEach(([groupName, buttons]) => {
      console.log(`FluentFlow: Processing group ${groupName} with ${buttons.length} buttons`)
      
      if (buttons.length === 0) return

      const groupDiv = document.createElement('div')
      groupDiv.className = 'fluent-flow-sidebar-group'

      const title = document.createElement('h3')
      title.className = 'fluent-flow-sidebar-group-title'
      title.textContent = this.getGroupTitle(groupName)
      groupDiv.appendChild(title)

      buttons.forEach(button => {
        console.log('FluentFlow: Creating button element for:', button.title)
        const buttonElement = this.createButtonElement(button)
        groupDiv.appendChild(buttonElement)
      })

      content.appendChild(groupDiv)
    })

    // Add footer with info
    const footerDiv = document.createElement('div')
    footerDiv.className = 'fluent-flow-sidebar-footer'
    footerDiv.innerHTML = `
      <div style="
        text-align: center;
        padding: 16px 0;
        border-top: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'};
        margin-top: 20px;
        font-size: 11px;
        color: ${this.config.theme === 'dark' ? '#666666' : '#888888'};
      ">
        FluentFlow v1.0 • Enhanced YouTube Learning
      </div>
    `
    content.appendChild(footerDiv)

    console.log('FluentFlow: renderButtons completed')
  }

  private groupButtons(): Record<string, SidebarButton[]> {
    const groups: Record<string, SidebarButton[]> = {
      loop: [],
      recording: [],
      notes: [],
      other: []
    }

    this.buttons.forEach(button => {
      groups[button.group].push(button)
    })

    return groups
  }

  private getGroupTitle(group: string): string {
    const titles = {
      loop: 'Loop Controls',
      recording: 'Recording & Audio', 
      notes: 'Notes & Learning',
      other: 'Tools & Settings'
    }
    return titles[group as keyof typeof titles] || 'Other'
  }

  private createButtonElement(button: SidebarButton): HTMLElement {
    const buttonEl = document.createElement('button')
    buttonEl.className = 'fluent-flow-sidebar-button'
    buttonEl.id = `sidebar-${button.id}`
    
    if (button.state) {
      buttonEl.classList.add(`ff-${button.state}`)
    }

    buttonEl.innerHTML = `
      <div class="fluent-flow-sidebar-button-icon">
        ${button.icon}
      </div>
      <div class="fluent-flow-sidebar-button-content">
        <div class="fluent-flow-sidebar-button-title">${button.title}</div>
        <div class="fluent-flow-sidebar-button-subtitle">${this.getButtonSubtitle(button)}</div>
      </div>
    `

    // Add event listeners
    buttonEl.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      button.action()
    })

    if (button.rightClick) {
      buttonEl.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        button.rightClick!()
      })
    }

    return buttonEl
  }

  private getButtonSubtitle(button: SidebarButton): string {
    const subtitles = {
      'fluent-flow-loop-start': 'Alt+Shift+1',
      'fluent-flow-loop-toggle': 'Alt+L',
      'fluent-flow-loop-end': 'Alt+Shift+2',
      'fluent-flow-loop-export': 'Alt+E',
      'fluent-flow-record': 'Alt+R',
      'fluent-flow-notes': 'Alt+N',
      'fluent-flow-compare': 'Alt+C',
      'fluent-flow-panel': 'Alt+Shift+F'
    }
    return subtitles[button.id as keyof typeof subtitles] || ''
  }

  public updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void {
    const button = document.getElementById(`sidebar-${buttonId}`)
    if (!button) return

    // Remove all state classes
    button.classList.remove('ff-inactive', 'ff-active', 'ff-setting', 'ff-paused')
    
    // Add new state class
    button.classList.add(`ff-${state}`)

    // Update the button state in our buttons array
    const buttonConfig = this.buttons.find(b => b.id === buttonId)
    if (buttonConfig) {
      buttonConfig.state = state
    }
  }

  public showSidebar(): void {
    if (!this.container) {
      console.log('FluentFlow: No container found in showSidebar')
      return
    }

    this.isVisible = true
    
    // Force positioning with inline styles (highest specificity)
    this.container.style.setProperty('right', '20px', 'important')
    this.container.style.setProperty('opacity', '1', 'important')
    
    this.container.classList.add('ff-sidebar-visible', 'ff-sidebar-animate-in')
    
    const toggle = document.querySelector('.fluent-flow-sidebar-toggle')
    if (toggle) {
      toggle.classList.add('ff-sidebar-open')
    }

    // Debug information
    console.log('FluentFlow: Sidebar shown')
    console.log('FluentFlow: Container element:', this.container)
    console.log('FluentFlow: Container classes:', this.container.className)
    console.log('FluentFlow: Container style.right:', this.container.style.right)
    
    // Get computed styles
    const computedStyle = window.getComputedStyle(this.container)
    console.log('FluentFlow: Computed right:', computedStyle.right)
    console.log('FluentFlow: Computed position:', computedStyle.position)
    console.log('FluentFlow: Computed zIndex:', computedStyle.zIndex)
    console.log('FluentFlow: Computed display:', computedStyle.display)
    console.log('FluentFlow: Computed visibility:', computedStyle.visibility)
    console.log('FluentFlow: Container bounds:', this.container.getBoundingClientRect())
  }

  public hideSidebar(): void {
    if (!this.container) return

    this.isVisible = false
    
    // Force positioning with inline styles (highest specificity)
    this.container.style.setProperty('right', '-340px', 'important')
    this.container.style.setProperty('opacity', '0', 'important')
    
    this.container.classList.remove('ff-sidebar-visible', 'ff-sidebar-animate-in')
    
    const toggle = document.querySelector('.fluent-flow-sidebar-toggle')
    if (toggle) {
      toggle.classList.remove('ff-sidebar-open')
    }

    console.log('FluentFlow: Sidebar hidden')
  }

  public toggleSidebar(): void {
    if (this.isVisible) {
      this.hideSidebar()
    } else {
      this.showSidebar()
    }
  }

  private getToggleIcon(): string {
    return `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M6.54331 10.5L2 6L6.54331 1.5L7.4 2.34853L3.71339 6L7.4 9.65147L6.54331 10.5Z" fill="currentColor"/>
      </svg>
    `
  }

  private getCloseIcon(): string {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M19 5.41L17.59 4L12 9.59L6.41 4L5 5.41L10.59 11L5 16.59L6.41 18L12 12.41L17.59 18L19 16.59L13.41 11L19 5.41Z" fill="currentColor"/>
      </svg>
    `
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove()
    }

    const toggle = document.querySelector('.fluent-flow-sidebar-toggle')
    if (toggle) {
      toggle.remove()
    }

    const styles = document.getElementById('fluent-flow-sidebar-styles')
    if (styles) {
      styles.remove()
    }

    console.log('FluentFlow: Sidebar destroyed')
  }

  public isOpen(): boolean {
    return this.isVisible
  }
}
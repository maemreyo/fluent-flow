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
        position: fixed;
        top: 50%;
        ${this.config.position}: 0;
        transform: translateY(-50%) translateX(${this.config.position === 'right' ? '100%' : '-100%'});
        width: 320px;
        max-height: 80vh;
        background: ${this.config.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        border: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'};
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 2147483647;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
        overflow: hidden;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
      }

      .fluent-flow-sidebar.ff-sidebar-visible {
        transform: translateY(-50%) translateX(${this.config.position === 'right' ? '-20px' : '20px'});
      }

      .fluent-flow-sidebar-toggle {
        position: fixed;
        top: 50%;
        ${this.config.position}: 0;
        transform: translateY(-50%);
        width: 24px;
        height: 48px;
        background: ${this.config.theme === 'dark' ? 'rgba(42, 42, 42, 0.7)' : 'rgba(245, 245, 245, 0.7)'};
        border: 1px solid ${this.config.theme === 'dark' ? 'rgba(68, 68, 68, 0.5)' : 'rgba(208, 208, 208, 0.5)'};
        border-radius: 6px 0 0 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483646;
        transition: opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
        opacity: 0.6;
        backdrop-filter: blur(4px);
      }

      .fluent-flow-sidebar-toggle:hover {
        background: ${this.config.theme === 'dark' ? 'rgba(58, 58, 58, 0.9)' : 'rgba(229, 229, 229, 0.9)'};
        opacity: 1;
        box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
      }

      .fluent-flow-sidebar-toggle svg {
        color: ${this.config.theme === 'dark' ? '#b0b0b0' : '#555555'};
        transition: transform 0.3s ease, color 0.2s ease;
      }

      .fluent-flow-sidebar-toggle:hover svg {
        color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'};
      }

      .fluent-flow-sidebar-toggle.ff-sidebar-open svg {
        transform: rotate(180deg);
      }

      .fluent-flow-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'};
        background: ${this.config.theme === 'dark' ? '#2a2a2a' : '#f8f9fa'};
      }

      .fluent-flow-sidebar-title {
        font-size: 18px;
        font-weight: 600;
        color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'};
        margin: 0;
      }

      .fluent-flow-sidebar-subtitle {
        font-size: 12px;
        color: ${this.config.theme === 'dark' ? '#888888' : '#666666'};
        margin: 2px 0 0 0;
      }

      .fluent-flow-sidebar-close {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${this.config.theme === 'dark' ? '#888888' : '#666666'};
        transition: all 0.2s ease;
      }

      .fluent-flow-sidebar-close:hover {
        background: ${this.config.theme === 'dark' ? '#404040' : '#e0e0e0'};
        color: ${this.config.theme === 'dark' ? '#ffffff' : '#333333'};
      }

      .fluent-flow-sidebar-content {
        padding: 20px;
        max-height: calc(80vh - 80px);
        overflow-y: auto;
      }

      .fluent-flow-sidebar-content::-webkit-scrollbar {
        width: 6px;
      }

      .fluent-flow-sidebar-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .fluent-flow-sidebar-content::-webkit-scrollbar-thumb {
        background: ${this.config.theme === 'dark' ? '#444444' : '#cccccc'};
        border-radius: 3px;
      }

      .fluent-flow-sidebar-group {
        margin-bottom: 24px;
      }

      .fluent-flow-sidebar-group:last-child {
        margin-bottom: 0;
      }

      .fluent-flow-sidebar-group-title {
        font-size: 14px;
        font-weight: 600;
        color: ${this.config.theme === 'dark' ? '#cccccc' : '#555555'};
        margin: 0 0 12px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .fluent-flow-sidebar-button {
        width: 100%;
        display: flex;
        align-items: center;
        padding: 12px 16px;
        margin-bottom: 8px;
        background: transparent;
        border: 1px solid ${this.config.theme === 'dark' ? '#333333' : '#e0e0e0'};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        color: ${this.config.theme === 'dark' ? '#e0e0e0' : '#333333'};
        font-size: 14px;
      }

      .fluent-flow-sidebar-button:hover {
        background: ${this.config.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
        border-color: ${this.config.theme === 'dark' ? '#444444' : '#d0d0d0'};
        transform: translateY(-1px);
      }

      .fluent-flow-sidebar-button:last-child {
        margin-bottom: 0;
      }

      .fluent-flow-sidebar-button-icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .fluent-flow-sidebar-button-icon svg {
        width: 20px;
        height: 20px;
      }

      .fluent-flow-sidebar-button-content {
        flex: 1;
      }

      .fluent-flow-sidebar-button-title {
        font-weight: 500;
        margin-bottom: 2px;
      }

      .fluent-flow-sidebar-button-subtitle {
        font-size: 12px;
        color: ${this.config.theme === 'dark' ? '#888888' : '#666666'};
      }

      /* Button States */
      .fluent-flow-sidebar-button.ff-active {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: ${this.config.theme === 'dark' ? '#4ade80' : '#16a34a'};
      }

      .fluent-flow-sidebar-button.ff-setting {
        background: rgba(251, 191, 36, 0.1);
        border-color: rgba(251, 191, 36, 0.3);
        color: ${this.config.theme === 'dark' ? '#fbbf24' : '#d97706'};
      }

      .fluent-flow-sidebar-button.ff-paused {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: ${this.config.theme === 'dark' ? '#f87171' : '#dc2626'};
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .fluent-flow-sidebar {
          width: 280px;
          max-height: 70vh;
        }
        
        .fluent-flow-sidebar-content {
          padding: 16px;
        }

        .fluent-flow-sidebar-toggle {
          width: 20px;
          height: 44px;
        }
      }

      /* Animations */
      @keyframes ff-sidebar-fade-in {
        from {
          opacity: 0;
          transform: translateY(-50%) translateX(${this.config.position === 'right' ? '100%' : '-100%'});
        }
        to {
          opacity: 1;
          transform: translateY(-50%) translateX(${this.config.position === 'right' ? '-20px' : '20px'});
        }
      }

      .fluent-flow-sidebar.ff-sidebar-animate-in {
        animation: ff-sidebar-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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
    if (!this.container) return

    this.isVisible = true
    this.container.classList.add('ff-sidebar-visible', 'ff-sidebar-animate-in')
    
    const toggle = document.querySelector('.fluent-flow-sidebar-toggle')
    if (toggle) {
      toggle.classList.add('ff-sidebar-open')
    }

    console.log('FluentFlow: Sidebar shown')
  }

  public hideSidebar(): void {
    if (!this.container) return

    this.isVisible = false
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
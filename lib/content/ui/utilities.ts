import { FluentFlowSidebar } from './fluent-flow-sidebar'

// UI Utilities Module
// Centralized UI helper functions for content script
// Handles toasts, button states, formatting, and YouTube UI integration

export interface ButtonConfig {
  id: string
  title: string
  icon: string
  action: () => void
  rightClick?: () => void
  group?: string
}

export interface ToastOptions {
  type?: 'loading' | 'success' | 'error' | 'warning' | 'info'
  persistent?: boolean
  duration?: number
  id?: string
  action?: {
    text: string
    handler: () => void
  }
}

export class UIUtilities {
  private static instance: UIUtilities
  private sidebar: FluentFlowSidebar | null = null

  public static getInstance(): UIUtilities {
    if (!UIUtilities.instance) {
      UIUtilities.instance = new UIUtilities()
    }
    return UIUtilities.instance
  }

  private constructor() {
    this.injectBaseStyles()
    this.initializeSidebar()
  }

  private async initializeSidebar(): Promise<void> {
    try {
      console.log('FluentFlow: Starting sidebar initialization')

      // Wait for YouTube container to be available
      await this.waitForYouTubeContainer()
      console.log('FluentFlow: YouTube container found')

      this.sidebar = new FluentFlowSidebar({
        position: 'right',
        theme: 'dark',
        collapsible: true,
        autoHide: false
      })

      console.log('FluentFlow: Sidebar initialized successfully')
    } catch (error) {
      console.error('FluentFlow: Failed to initialize sidebar:', error)
      // Set sidebar to null so fallback will be used
      this.sidebar = null
    }
  }

  private async waitForYouTubeContainer(): Promise<void> {
    return new Promise<void>(resolve => {
      const checkForContainer = () => {
        const container = document.querySelector('#container.style-scope.ytd-player')
        if (container) {
          resolve()
        } else {
          setTimeout(checkForContainer, 100)
        }
      }
      checkForContainer()
    })
  }

  // Enhanced Toast notification system
  private activeToasts = new Map<string, HTMLElement>()
  private toastCounter = 0


  public showToast(message: string, options: ToastOptions = {}): string {
    const {
      type = 'info',
      persistent = false,
      duration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 3000,
      id = `toast-${++this.toastCounter}`,
      action
    } = options

    // Remove existing toast with same ID if it exists
    this.hideToast(id)

    const toast = this.createToastElement(message, type, action, id)
    this.activeToasts.set(id, toast)

    // Inject toast styles if not already present
    this.injectToastStyles()

    document.body.appendChild(toast)

    // Auto-remove toast unless persistent or has action
    if (!persistent && !action && type !== 'loading') {
      setTimeout(() => {
        this.hideToast(id)
      }, duration)
    }

    return id
  }

  public hideToast(id: string): void {
    const toast = this.activeToasts.get(id)
    if (toast) {
      toast.classList.add('ff-toast-exit')
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
        this.activeToasts.delete(id)
      }, 300)
    }
  }

  public updateToast(id: string, message: string, options: Partial<ToastOptions> = {}): void {
    const toast = this.activeToasts.get(id)
    if (toast) {
      const messageEl = toast.querySelector('.ff-toast-message')
      if (messageEl) {
        messageEl.textContent = message
      }

      // Update type if provided
      if (options.type) {
        // Remove old type classes
        toast.classList.remove('ff-toast-loading', 'ff-toast-success', 'ff-toast-error', 'ff-toast-warning', 'ff-toast-info')
        toast.classList.add(`ff-toast-${options.type}`)
      }

      // Auto-hide if changed from loading/persistent to non-persistent
      if (options.type && options.type !== 'loading' && !options.persistent && !options.action) {
        const duration = options.duration || (options.type === 'error' ? 8000 : options.type === 'warning' ? 6000 : 3000)
        setTimeout(() => {
          this.hideToast(id)
        }, duration)
      }
    }
  }

  private createToastElement(message: string, type: string, action?: { text: string; handler: () => void }, id?: string): HTMLElement {
    const toast = document.createElement('div')
    toast.className = `ff-toast ff-toast-${type}`
    toast.setAttribute('data-toast-id', id || '')

    // Toast content container
    const content = document.createElement('div')
    content.className = 'ff-toast-content'

    // Icon
    const icon = document.createElement('span')
    icon.className = 'ff-toast-icon'
    icon.innerHTML = this.getToastIcon(type)

    // Message
    const messageEl = document.createElement('span')
    messageEl.className = 'ff-toast-message'
    messageEl.textContent = message

    content.appendChild(icon)
    content.appendChild(messageEl)
    toast.appendChild(content)

    // Add action button if provided
    if (action) {
      const actionBtn = document.createElement('button')
      actionBtn.className = 'ff-toast-action'
      actionBtn.textContent = action.text
      actionBtn.onclick = (e) => {
        e.stopPropagation()
        action.handler()
      }
      toast.appendChild(actionBtn)
    }

    // Add close button for persistent toasts
    if (type === 'error' || action) {
      const closeBtn = document.createElement('button')
      closeBtn.className = 'ff-toast-close'
      closeBtn.innerHTML = '×'
      closeBtn.onclick = () => id && this.hideToast(id)
      toast.appendChild(closeBtn)
    }

    return toast
  }

  private getToastIcon(type: string): string {
    const icons = {
      loading: `<svg class="ff-toast-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    }
    return icons[type] || icons.info
  }

  private injectToastStyles(): void {
    if (!document.getElementById('ff-toast-styles')) {
      const style = document.createElement('style')
      style.id = 'ff-toast-styles'
      style.textContent = `
        .ff-toast {
          position: fixed;
          top: 80px;
          right: 20px;
          min-width: 300px;
          max-width: 400px;
          padding: 16px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-size: 14px;
          line-height: 1.4;
          z-index: 10001;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          animation: ff-toast-enter 0.3s ease-out;
          margin-bottom: 8px;
        }

        .ff-toast:not(:last-child) {
          transform: translateY(calc(-100% - 8px));
        }

        .ff-toast-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .ff-toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .ff-toast-spinner {
          animation: ff-spin 1s linear infinite;
        }

        .ff-toast-message {
          flex: 1;
          font-weight: 500;
        }

        .ff-toast-action {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-left: 12px;
          transition: all 0.2s ease;
        }

        .ff-toast-action:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .ff-toast-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .ff-toast-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        /* Toast Types */
        .ff-toast-loading {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(29, 78, 216, 0.9) 100%);
          color: white;
          border-left: 4px solid #60a5fa;
        }

        .ff-toast-success {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%);
          color: white;
          border-left: 4px solid #34d399;
        }

        .ff-toast-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%);
          color: white;
          border-left: 4px solid #f87171;
        }

        .ff-toast-warning {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.9) 0%, rgba(217, 119, 6, 0.9) 100%);
          color: white;
          border-left: 4px solid #fbbf24;
        }

        .ff-toast-info {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%);
          color: white;
          border-left: 4px solid #a5b4fc;
        }

        /* Animations */
        @keyframes ff-toast-enter {
          0% {
            opacity: 0;
            transform: translateX(100%);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .ff-toast-exit {
          animation: ff-toast-exit 0.3s ease-in forwards;
        }

        @keyframes ff-toast-exit {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        @keyframes ff-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .ff-toast {
            right: 16px;
            left: 16px;
            min-width: unset;
            max-width: unset;
          }
        }
      `
      document.head.appendChild(style)
    }
  }

  // Legacy method for backward compatibility
  public showSimpleToast(message: string): void {
    this.showToast(message, { type: 'info' })
  }

  // Button state management - now works with sidebar
  public updateButtonState(
    buttonId: string,
    state: 'inactive' | 'active' | 'setting' | 'paused'
  ): void {
    // Update sidebar button state
    if (this.sidebar) {
      this.sidebar.updateButtonState(buttonId, state)
    }

    // Also update any remaining YouTube control buttons (for backward compatibility)
    const button = document.getElementById(buttonId)
    if (!button) return

    // Remove all state classes
    button.classList.remove('ff-inactive', 'ff-active', 'ff-setting', 'ff-paused')

    // Add new state class
    button.classList.add(`ff-${state}`)

    // Update button appearance based on state
    let backgroundColor = 'transparent'
    let opacity = '0.9'

    switch (state) {
      case 'active':
        backgroundColor = 'rgba(34, 197, 94, 0.2)' // Green background
        opacity = '1'
        break
      case 'setting':
        backgroundColor = 'rgba(251, 191, 36, 0.2)' // Yellow background
        opacity = '1'
        break
      case 'paused':
        backgroundColor = 'rgba(239, 68, 68, 0.2)' // Red background
        opacity = '1'
        break
      case 'inactive':
      default:
        backgroundColor = 'transparent'
        opacity = '0.9'
        break
    }

    ;(button as HTMLElement).style.backgroundColor = backgroundColor
    ;(button as HTMLElement).style.opacity = opacity
  }

  // Time formatting utility
  public formatTime(seconds: number | null): string {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // YouTube button creation (legacy support - now creates minimal toggle)
  public createYouTubeButton(config: ButtonConfig): HTMLElement {
    const button = document.createElement('button')
    button.className = 'ytp-button fluent-flow-button'
    button.id = config.id
    button.title = config.title
    button.setAttribute('data-tooltip-title', config.title)
    button.setAttribute('aria-label', config.title)

    button.style.cssText = `
      width: 48px;
      height: 48px;
      padding: 8px;
      margin: 0 2px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: white;
      opacity: 0.9;
      transition: opacity 0.2s ease;
    `

    button.innerHTML = config.icon

    button.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      config.action()
    })

    if (config.rightClick) {
      button.addEventListener('contextmenu', e => {
        e.preventDefault()
        e.stopPropagation()
        config.rightClick!()
      })
    }

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1'
    })

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.9'
    })

    return button
  }

  // New primary method: Create sidebar with buttons instead of YouTube controls
  public async createButtonContainer(buttons: ButtonConfig[]): Promise<HTMLElement> {
    console.log('FluentFlow: createButtonContainer called with buttons:', buttons.length)

    // Wait for sidebar to be ready
    let retryCount = 0
    while (!this.sidebar && retryCount < 10) {
      console.log('FluentFlow: Waiting for sidebar to initialize...', retryCount)
      await new Promise(resolve => setTimeout(resolve, 200))
      retryCount++
    }

    if (!this.sidebar) {
      console.warn(
        'FluentFlow: Sidebar not initialized after waiting, using legacy button container'
      )
      // Fallback to legacy YouTube controls
      return this.createLegacyButtonContainer(buttons)
    }

    console.log('FluentFlow: Sidebar is available, converting buttons')

    // Convert ButtonConfig to SidebarButton format
    const sidebarButtons = buttons.map(button => ({
      id: button.id,
      title: this.getButtonDisplayTitle(button.id),
      icon: button.icon,
      action: button.action,
      rightClick: button.rightClick,
      group: button.group as 'loop' | 'recording' | 'notes' | 'other',
      state: 'inactive' as const
    }))

    console.log('FluentFlow: Converted sidebar buttons:', sidebarButtons)

    // Add buttons to sidebar
    this.sidebar.addButtons(sidebarButtons)

    // Create minimal YouTube control button that opens sidebar
    const sidebarToggle = this.createSidebarToggleButton()

    console.log('FluentFlow: Sidebar button container created')
    return sidebarToggle
  }

  private createSidebarToggleButton(): HTMLElement {
    // Check if toggle already exists
    const existingToggle = document.querySelector(
      '.fluent-flow-sidebar-youtube-toggle'
    ) as HTMLElement
    if (existingToggle) {
      return existingToggle
    }

    const toggleButton = document.createElement('button')
    toggleButton.className = 'ytp-button fluent-flow-sidebar-youtube-toggle'
    toggleButton.title = 'Open FluentFlow Controls (Alt+F)'
    toggleButton.setAttribute('data-tooltip-title', 'FluentFlow Controls')
    toggleButton.setAttribute('aria-label', 'FluentFlow Controls')

    toggleButton.style.cssText = `
      width: 48px;
      height: 48px;
      padding: 10px;
      /* margin: 0px 2px; */
      background: transparent;
      border: none;
      cursor: pointer;
      color: white;
      opacity: 0.9;
      transition: 0.2s;
      transform: scale(1);
    `

    toggleButton.innerHTML = this.getFluentFlowIcon()

    toggleButton.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      if (this.sidebar) {
        this.sidebar.toggleSidebar()
      }
    })

    toggleButton.addEventListener('mouseenter', () => {
      toggleButton.style.opacity = '1'
      toggleButton.style.transform = 'scale(1.05)'
    })

    toggleButton.addEventListener('mouseleave', () => {
      toggleButton.style.opacity = '0.9'
      toggleButton.style.transform = 'scale(1)'
    })

    // Insert into YouTube controls
    this.insertIntoYouTubeControls(toggleButton)

    return toggleButton
  }

  private async insertIntoYouTubeControls(button: HTMLElement): Promise<void> {
    const rightControls = await this.waitForYouTubeControls()

    // Insert before the settings button
    const settingsButton = rightControls.querySelector('.ytp-settings-button')
    if (settingsButton) {
      rightControls.insertBefore(button, settingsButton)
    } else {
      rightControls.appendChild(button)
    }
  }

  // Legacy button container creation (fallback)
  private async createLegacyButtonContainer(buttons: ButtonConfig[]): Promise<HTMLElement> {
    console.warn('FluentFlow: Using legacy button container as fallback')

    // Wait for YouTube player controls to load
    const rightControls = await this.waitForYouTubeControls()

    // Check if buttons already exist
    const existingContainer = document.querySelector('.fluent-flow-controls') as HTMLElement
    if (existingContainer) {
      return existingContainer
    }

    // Create FluentFlow button container
    const buttonContainer = document.createElement('div')
    buttonContainer.className = 'fluent-flow-controls'
    buttonContainer.style.cssText = `
      display: flex;
      align-items: center;
      margin-right: 8px;
    `

    // Group buttons by type and add separators
    let currentGroup = ''
    buttons.forEach((buttonConfig, index) => {
      // Add separator between groups
      if (buttonConfig.group !== currentGroup && index > 0) {
        const separator = document.createElement('div')
        separator.style.cssText = `
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.3);
          margin: 0 4px;
        `
        buttonContainer.appendChild(separator)
      }
      currentGroup = buttonConfig.group || ''

      const button = this.createYouTubeButton(buttonConfig)
      buttonContainer.appendChild(button)
    })

    // Insert before the settings button
    const settingsButton = rightControls.querySelector('.ytp-settings-button')
    if (settingsButton) {
      rightControls.insertBefore(buttonContainer, settingsButton)
    } else {
      rightControls.appendChild(buttonContainer)
    }

    return buttonContainer
  }

  private getButtonDisplayTitle(buttonId: string): string {
    const titles = {
      'fluent-flow-loop-start': 'Set Loop Start',
      'fluent-flow-loop-toggle': 'Toggle Loop Playback',
      'fluent-flow-loop-end': 'Set Loop End',
      'fluent-flow-loop-clear': 'Clear All Loops',
      'fluent-flow-loop-export': 'Export Current Loop',
      'fluent-flow-record': 'Voice Recording',
      'fluent-flow-notes': 'Add Note',
      'fluent-flow-compare': 'Audio Compare',
      'fluent-flow-panel': 'Chrome Extension Panel'
    }
    return (
      titles[buttonId as keyof typeof titles] ||
      buttonId.replace('fluent-flow-', '').replace('-', ' ')
    )
  }

  // Sidebar control methods
  public showSidebar(): void {
    if (this.sidebar) {
      this.sidebar.showSidebar()
    }
  }

  public hideSidebar(): void {
    if (this.sidebar) {
      this.sidebar.hideSidebar()
    }
  }

  public toggleSidebar(): void {
    if (this.sidebar) {
      this.sidebar.toggleSidebar()
    }
  }

  public updateSidebarLoops(loops: any[]): void {
    if (this.sidebar) {
      this.sidebar.addLoopsSection(loops)
    }
  }

  public isSidebarOpen(): boolean {
    return this.sidebar ? this.sidebar.isOpen() : false
  }

  // Icon utilities - centralized icon definitions
  public getLoopStartIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4,6V18H6V6H4M8,6V18L18,12L8,6Z"/>
      </svg>
    `
  }

  public getLoopPlayIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,5V1L7,6L12,11V7A6,6 0 0,1 18,13A6,6 0 0,1 12,19A6,6 0 0,1 6,13H4A8,8 0 0,0 12,21A8,8 0 0,0 20,13A8,8 0 0,0 12,5Z"/>
      </svg>
    `
  }

  public getLoopEndIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6,6V18L16,12L6,6M18,6V18H20V6H18Z"/>
      </svg>
    `
  }

  public getRecordIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
      </svg>
    `
  }

  public getCompareIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9,7H7V17H9V13H11V11H9V9H13V7H9M13,17H15V15H17V13H15V11H17V9H15V7H13V17Z"/>
      </svg>
    `
  }

  public getPanelIcon(): string {
    return `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        <text x="8" y="16" font-family="Arial" font-size="8" fill="currentColor">FF</text>
      </svg>
    `
  }

  public getExportIcon(): string {
    return `
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
      </svg>
    `
  }

  public getNotesIcon(): string {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3v18h18V7.83L16.17 3H3zm15 16H6V5h9v4h3v10zm-2-6H8v-2h8v2zm0 2H8v2h8v-2z"/>
      </svg>
    `
  }

  public getClearIcon(): string {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M19 5.41L17.59 4L12 9.59L6.41 4L5 5.41L10.59 11L5 16.59L6.41 18L12 12.41L17.59 18L19 16.59L13.41 11L19 5.41Z" fill="currentColor"/>
      </svg>
    `
  }

  private getFluentFlowIcon(): string {
    return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Gradient đơn giản hơn cho nút bấm -->
                <linearGradient id="buttonGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#F79420;" />
                    <stop offset="100%" style="stop-color:#E63471;" />
                </linearGradient>
            </defs>

            <!-- 
                Toàn bộ hình dạng được vẽ lại bằng MỘT đường path duy nhất.
                Điều này giúp dễ dàng quản lý và tô màu.
            -->
            <path style="fill: url(#buttonGradient); transition: fill 0.2s;" d="
                M50,95 C40,92 25,85 20,70 C15,55 25,35 40,25 
                C55,15 75,18 85,30 C95,42 93,60 80,70 
                C90,75 98,65 95,55 C92,45 80,45 70,50 
                C60,55 60,65 70,70 C80,75 90,80 80,88 
                C70,96 55,97 50,95 Z
            "/>
            
            <!-- Biểu tượng Play ở giữa, màu trắng -->
            <path style="fill: white;" d="M45 40 L65 50 L45 60 Z" />
        </svg>
    `
  }

  // Private utility methods
  private async waitForYouTubeControls(): Promise<HTMLElement> {
    return new Promise<HTMLElement>(resolve => {
      const checkForControls = () => {
        const controls = document.querySelector('.ytp-right-controls') as HTMLElement
        if (controls) {
          resolve(controls)
        } else {
          setTimeout(checkForControls, 100)
        }
      }
      checkForControls()
    })
  }

  private injectBaseStyles(): void {
    if (!document.getElementById('fluent-flow-styles')) {
      const style = document.createElement('style')
      style.id = 'fluent-flow-styles'
      style.textContent = `
        .ytp-right-controls {
          display: flex;
        }

        .fluent-flow-button {
          transition: all 0.2s ease;
        }
        
        .fluent-flow-button:hover {
          transform: scale(1.1);
        }
        
        /* Button state classes */
        .fluent-flow-button.ff-active {
          background: rgba(34, 197, 94, 0.2) !important;
          opacity: 1 !important;
        }
        
        .fluent-flow-button.ff-setting {
          background: rgba(251, 191, 36, 0.2) !important;
          opacity: 1 !important;
        }
        
        .fluent-flow-button.ff-paused {
          background: rgba(239, 68, 68, 0.2) !important;
          opacity: 1 !important;
        }
        
        .fluent-flow-button.ff-inactive {
          background: transparent !important;
          opacity: 0.9 !important;
        }

        /* FluentFlow Sidebar YouTube Toggle */
        .fluent-flow-sidebar-youtube-toggle:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      `
      document.head.appendChild(style)
    }
  }

  // Cleanup method
  public destroy(): void {
    if (this.sidebar) {
      this.sidebar.destroy()
      this.sidebar = null
    }

    // Remove toggle button
    const toggle = document.querySelector('.fluent-flow-sidebar-youtube-toggle')
    if (toggle) {
      toggle.remove()
    }

    // Remove legacy controls
    const legacyContainer = document.querySelector('.fluent-flow-controls')
    if (legacyContainer) {
      legacyContainer.remove()
    }
  }
}

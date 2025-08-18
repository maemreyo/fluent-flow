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

export class UIUtilities {
  private static instance: UIUtilities
  
  public static getInstance(): UIUtilities {
    if (!UIUtilities.instance) {
      UIUtilities.instance = new UIUtilities()
    }
    return UIUtilities.instance
  }

  private constructor() {
    this.injectBaseStyles()
  }

  // Toast notification system
  public showToast(message: string): void {
    // Create a simple toast notification
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInOut 2s ease-in-out;
    `
    
    toast.textContent = `FluentFlow: ${message}`
    
    // Add animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(100%); }
        20% { opacity: 1; transform: translateX(0); }
        80% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
      }
    `
    document.head.appendChild(style)
    
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
      style.remove()
    }, 2000)
  }

  // Button state management
  public updateButtonState(buttonId: string, state: 'inactive' | 'active' | 'setting' | 'paused'): void {
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

    (button as HTMLElement).style.backgroundColor = backgroundColor;
    (button as HTMLElement).style.opacity = opacity
  }

  // Time formatting utility
  public formatTime(seconds: number | null): string {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // YouTube button creation
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
    
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      config.action()
    })

    if (config.rightClick) {
      button.addEventListener('contextmenu', (e) => {
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

  // Button container creation with grouping
  public async createButtonContainer(buttons: ButtonConfig[]): Promise<HTMLElement> {
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

  // Private utility methods
  private async waitForYouTubeControls(): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve) => {
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
          display: flex !important;
          align-items: center;
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
      `
      document.head.appendChild(style)
    }
  }
}
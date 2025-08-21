import type { PlasmoCSConfig } from "plasmo"
import type {
  YouTubeVideoInfo
} from './lib/types/fluent-flow-types'

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.youtube.com/watch*",
    "https://youtube.com/watch*"
  ],
  run_at: "document_end"
}

// FluentFlow Content Script - Refactored using Separation of Concerns
// This file now acts as the entry point and delegates to the main orchestrator

import { FluentFlowOrchestrator } from './lib/content/main-orchestrator'

class FluentFlowContentScript {
  private orchestrator: FluentFlowOrchestrator | null = null

  constructor() {
    console.log('FluentFlow: Content script starting...')
    this.initialize()
  }

  private initialize(): void {
    // Clean up any existing FluentFlow elements first
    const existingElements = document.querySelectorAll(
      '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
    )
    existingElements.forEach(element => element.remove())
    
    // Check if we're on a YouTube watch page
    if (this.isYouTubeWatchPage()) {
      this.orchestrator = new FluentFlowOrchestrator()
    } else {
      console.log('FluentFlow: Not on YouTube watch page, skipping initialization')
    }

    // Handle page navigation for YouTube SPA
    this.setupNavigationListener()
  }

  private isYouTubeWatchPage(): boolean {
    return window.location.hostname === 'www.youtube.com' && 
           window.location.pathname === '/watch'
  }

  private setupNavigationListener(): void {
    let currentUrl = window.location.href
    
    const navigationObserver = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href
        
        if (this.isYouTubeWatchPage()) {
          // Initialize orchestrator if not already running
          if (!this.orchestrator) {
            // // Clean up any existing elements before creating new ones
            // const existingElements = document.querySelectorAll(
            //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
            // )
            // existingElements.forEach(element => element.remove())
            
            setTimeout(() => {
              this.orchestrator = new FluentFlowOrchestrator()
            }, 1000) // Wait for YouTube to finish loading
          }
        } else {
          // // Clean up orchestrator if leaving watch page
          // if (this.orchestrator) {
          //   this.orchestrator.destroy()
          //   this.orchestrator = null
          // }
          // // Also clean up any remaining UI elements
          // const existingElements = document.querySelectorAll(
          //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
          // )
          // existingElements.forEach(element => element.remove())
        }
      }
    }, 1000)

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(navigationObserver)
      if (this.orchestrator) {
        this.orchestrator.destroy()
      }
      // // Final cleanup of UI elements
      // const existingElements = document.querySelectorAll(
      //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
      // )
      // existingElements.forEach(element => element.remove())
    })
  }
}

// Initialize FluentFlow when ready
function initializeFluentFlow() {
  // // Clean up any existing FluentFlow elements first
  // const existingElements = document.querySelectorAll(
  //   '.fluent-flow-sidebar, .fluent-flow-sidebar-toggle, .fluent-flow-sidebar-youtube-toggle'
  // )
  // existingElements.forEach(element => element.remove())
  
  // Check if we're on a YouTube watch page
  if (window.location.hostname === 'www.youtube.com' && 
      window.location.pathname === '/watch') {
    
    new FluentFlowContentScript()
  }
}

// Initialize immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFluentFlow)
} else {
  initializeFluentFlow()
}
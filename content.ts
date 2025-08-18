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
            setTimeout(() => {
              this.orchestrator = new FluentFlowOrchestrator()
            }, 1000) // Wait for YouTube to finish loading
          }
        } else {
          // Clean up orchestrator if leaving watch page
          if (this.orchestrator) {
            this.orchestrator.destroy()
            this.orchestrator = null
          }
        }
      }
    }, 1000)

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(navigationObserver)
      if (this.orchestrator) {
        this.orchestrator.destroy()
      }
    })
  }
}

// Initialize FluentFlow when ready
function initializeFluentFlow() {
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
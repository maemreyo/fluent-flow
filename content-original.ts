// Content Script - Handles page interaction and text selection
// Injected into web pages to provide text selection and highlighting functionality

import { MESSAGE_TYPES } from './lib/utils/constants'
import type { TextSelection, HighlightData, ExtensionMessage } from './lib/types'

class ContentScript {
  private selectedText: string = ''
  private selectionRange: Range | null = null
  private contextMenuItems: Set<string> = new Set()
  private highlights: Map<string, HTMLElement> = new Map()

  constructor() {
    this.init()
  }

  private init() {
    this.setupMessageListener()
    this.setupSelectionListener()
    this.setupContextMenu()
    this.setupKeyboardShortcuts()
    this.injectStyles()
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      switch (message.type) {
        case MESSAGE_TYPES.GET_SELECTED_TEXT:
          this.handleGetSelectedText(sendResponse)
          return true // Keep message channel open for async response

        case MESSAGE_TYPES.HIGHLIGHT_TEXT:
          this.handleHighlightText(message.data, sendResponse)
          return true

        case 'CLEAR_HIGHLIGHTS':
          this.clearAllHighlights()
          sendResponse({ success: true })
          return true

        case 'GET_PAGE_INFO':
          this.handleGetPageInfo(sendResponse)
          return true

        default:
          return false
      }
    })
  }

  private setupSelectionListener() {
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const text = selection.toString().trim()
        if (text && text.length > 0) {
          this.selectedText = text
          this.selectionRange = selection.getRangeAt(0).cloneRange()
          
          // Notify background script of selection
          this.notifySelectionChange(text)
        } else {
          this.selectedText = ''
          this.selectionRange = null
        }
      }
    })

    // Handle mouse up for selection completion
    document.addEventListener('mouseup', (event) => {
      setTimeout(() => {
        if (this.selectedText) {
          this.showSelectionTooltip(event.clientX, event.clientY)
        }
      }, 100)
    })
  }

  private setupContextMenu() {
    document.addEventListener('contextmenu', (event) => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim()
      
      if (selectedText) {
        // Store selection data for context menu actions
        chrome.runtime.sendMessage({
          type: 'CONTEXT_MENU_DATA',
          data: {
            selectedText,
            pageUrl: window.location.href,
            pageTitle: document.title,
            selectionRect: this.getSelectionRect()
          }
        })
      }
    })
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+E (or Cmd+Shift+E on Mac) - Process selected text
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
        event.preventDefault()
        if (this.selectedText) {
          this.processSelectedText()
        }
      }

      // Ctrl+Shift+H (or Cmd+Shift+H on Mac) - Highlight selected text
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault()
        if (this.selectedText) {
          this.highlightSelectedText()
        }
      }

      // Escape - Clear highlights
      if (event.key === 'Escape') {
        this.clearAllHighlights()
      }
    })
  }

  private injectStyles() {
    const style = document.createElement('style')
    style.textContent = `
      .extension-highlight {
        background-color: rgba(255, 235, 59, 0.4) !important;
        border-radius: 2px !important;
        padding: 1px 2px !important;
        transition: background-color 0.2s ease !important;
        cursor: pointer !important;
      }
      
      .extension-highlight:hover {
        background-color: rgba(255, 235, 59, 0.6) !important;
      }
      
      .extension-selection-tooltip {
        position: fixed !important;
        background: #2563eb !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        z-index: 10000 !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transform: translateY(-10px) !important;
        transition: all 0.2s ease !important;
      }
      
      .extension-selection-tooltip.show {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
      
      .extension-selection-tooltip::after {
        content: '' !important;
        position: absolute !important;
        bottom: -6px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 0 !important;
        height: 0 !important;
        border-left: 6px solid transparent !important;
        border-right: 6px solid transparent !important;
        border-top: 6px solid #2563eb !important;
      }
    `
    document.head.appendChild(style)
  }

  private handleGetSelectedText(sendResponse: (response: any) => void) {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() || ''
    
    const selectionData: TextSelection = {
      text: selectedText,
      range: this.selectionRange!,
      context: this.getSelectionContext(selectedText),
      position: this.getSelectionRect()
    }

    sendResponse({
      success: true,
      selectedText,
      data: selectionData
    })
  }

  private handleHighlightText(data: HighlightData, sendResponse: (response: any) => void) {
    try {
      const highlightId = this.createHighlight(data)
      sendResponse({
        success: true,
        highlightId
      })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to highlight text'
      })
    }
  }

  private handleGetPageInfo(sendResponse: (response: any) => void) {
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      selectedText: this.selectedText,
      hasSelection: this.selectedText.length > 0,
      highlightCount: this.highlights.size,
      readyState: document.readyState
    }

    sendResponse({
      success: true,
      data: pageInfo
    })
  }

  private notifySelectionChange(text: string) {
    chrome.runtime.sendMessage({
      type: 'SELECTION_CHANGED',
      data: {
        selectedText: text,
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    }).catch(() => {
      // Background script might not be ready, that's ok
    })
  }

  private showSelectionTooltip(x: number, y: number) {
    // Remove existing tooltip
    const existingTooltip = document.querySelector('.extension-selection-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
    }

    // Create new tooltip
    const tooltip = document.createElement('div')
    tooltip.className = 'extension-selection-tooltip'
    tooltip.textContent = `Selected: "${this.selectedText.substring(0, 50)}${this.selectedText.length > 50 ? '...' : ''}"`
    
    document.body.appendChild(tooltip)

    // Position tooltip
    const rect = tooltip.getBoundingClientRect()
    tooltip.style.left = `${Math.max(10, Math.min(x - rect.width / 2, window.innerWidth - rect.width - 10))}px`
    tooltip.style.top = `${Math.max(10, y - rect.height - 15)}px`

    // Show tooltip with animation
    requestAnimationFrame(() => {
      tooltip.classList.add('show')
    })

    // Hide tooltip after 3 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.classList.remove('show')
        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.remove()
          }
        }, 200)
      }
    }, 3000)
  }

  private processSelectedText() {
    if (!this.selectedText) return

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.PROCESS_FEATURE,
      data: {
        input: this.selectedText,
        options: {
          priority: 'high',
          source: 'content_script'
        }
      }
    })
  }

  private highlightSelectedText() {
    if (!this.selectedText || !this.selectionRange) return

    const highlightData: HighlightData = {
      text: this.selectedText,
      color: '#ffeb3b',
      timestamp: Date.now()
    }

    this.createHighlight(highlightData)
  }

  private createHighlight(data: HighlightData): string {
    if (!this.selectionRange) {
      throw new Error('No selection range available')
    }

    const highlightId = `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Create highlight span
      const span = document.createElement('span')
      span.className = 'extension-highlight'
      span.dataset.highlightId = highlightId
      span.dataset.originalText = data.text
      span.dataset.timestamp = data.timestamp.toString()
      span.style.backgroundColor = `${data.color}40` // Add transparency
      
      if (data.note) {
        span.title = data.note
      }

      // Wrap the selected text
      this.selectionRange.surroundContents(span)
      
      // Store highlight reference
      this.highlights.set(highlightId, span)

      // Add click handler for highlight interaction
      span.addEventListener('click', (event) => {
        event.preventDefault()
        this.handleHighlightClick(highlightId, data)
      })

      // Clear selection
      window.getSelection()?.removeAllRanges()

      return highlightId
    } catch (error) {
      throw new Error('Failed to create highlight: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  private handleHighlightClick(highlightId: string, data: HighlightData) {
    chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_CLICKED',
      data: {
        highlightId,
        ...data
      }
    })
  }

  private clearAllHighlights() {
    this.highlights.forEach((element, id) => {
      try {
        // Replace highlight span with its text content
        const parent = element.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(element.textContent || ''), element)
          parent.normalize() // Merge adjacent text nodes
        }
      } catch (error) {
        console.warn('Failed to remove highlight:', id, error)
      }
    })

    this.highlights.clear()
  }

  private getSelectionContext(selectedText: string): string {
    if (!this.selectionRange) return ''

    try {
      const container = this.selectionRange.commonAncestorContainer
      const textContent = container.textContent || ''
      const selectedIndex = textContent.indexOf(selectedText)
      
      if (selectedIndex === -1) return ''

      const contextBefore = textContent.substring(Math.max(0, selectedIndex - 100), selectedIndex)
      const contextAfter = textContent.substring(selectedIndex + selectedText.length, selectedIndex + selectedText.length + 100)

      return `${contextBefore}[${selectedText}]${contextAfter}`
    } catch (error) {
      return ''
    }
  }

  private getSelectionRect(): { x: number; y: number } {
    if (!this.selectionRange) return { x: 0, y: 0 }

    try {
      const rect = this.selectionRange.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY
      }
    } catch (error) {
      return { x: 0, y: 0 }
    }
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScript()
  })
} else {
  new ContentScript()
}

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentScript
}
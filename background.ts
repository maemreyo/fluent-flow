// FluentFlow - Background Script
// This is the main background script that acts as a message router
// Following clean architecture: ONLY routing, NO business logic

import { handleApiMessage } from './lib/background/api-handler'
import { getAuthHandler } from './lib/background/auth-handler'
import { handleFeatureMessage } from './lib/background/feature-handler'
import { handleLoopMessage } from './lib/background/loop-handler'
import { handleRecordingMessage } from './lib/background/recording-handler'
import { handleStorageMessage } from './lib/background/storage-handler'

console.log('FluentFlow background script loaded')

// Initialize auth handler
const authHandler = getAuthHandler()

// Context menu setup
chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'main-action',
    title: 'Process with Extension',
    contexts: ['selection']
  });

  if (details.reason === 'install') {
    chrome.storage.local.get('hasRunBefore', (result) => {
      if (!result.hasRunBefore) {
        chrome.tabs.create({ url: 'tabs/onboarding.html' }); // Placeholder for onboarding page
        chrome.storage.local.set({ hasRunBefore: true });
      }
    });
  } else if (details.reason === 'update') {
    chrome.tabs.create({ url: 'tabs/whats-new.html' }); // Placeholder for what's new page
  }
});

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'main-action' && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_POPUP',
      selectedText: info.selectionText
    })
  }
})

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'main-action' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'GET_SELECTED_TEXT'
    })
  }
})

// Message router - ONLY routing logic, NO business logic
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only handle messages that have a 'type' property (non-Plasmo messages)
  // Plasmo messages are handled automatically by Plasmo's messaging system
  if (!message || typeof message.type === 'undefined') {
    // This is likely a Plasmo message, let it be handled by Plasmo
    // Don't log or process it here to avoid conflicts
    return false
  }

  console.log('Background received message:', message.type)

  switch (message.type) {
    case 'PROCESS_FEATURE':
      handleFeatureMessage(message.data, sendResponse)
      return true // Keep message channel open for async response

    case 'API_CALL':
      handleApiMessage(message.endpoint, message.data, sendResponse)
      return true

    case 'STORAGE_OPERATION':
      handleStorageMessage(message.operation, message.key, message.value, sendResponse)
      return true

    case 'SAVE_LOOP':
      handleLoopMessage('save', message.data, sendResponse)
      return true

    case 'SAVE_LOOPS':
      handleLoopMessage('save_multiple', message.loops, sendResponse)
      return true

    case 'LOAD_LOOP':
      handleLoopMessage('load', message.data, sendResponse)
      return true

    case 'DELETE_LOOP':
      handleLoopMessage('delete', message.data, sendResponse)
      return true

    case 'LIST_LOOPS':
      handleLoopMessage('list', message.data, sendResponse)
      return true

    case 'APPLY_LOOP':
      handleLoopMessage('apply', message.data, sendResponse)
      return true

    case 'SAVE_RECORDING':
      handleRecordingMessage('save', message.data, sendResponse)
      return true

    case 'LOAD_RECORDING':
      handleRecordingMessage('load', message.data, sendResponse)
      return true

    case 'LIST_RECORDINGS':
      handleRecordingMessage('list', message.data, sendResponse)
      return true

    case 'DELETE_RECORDING':
      handleRecordingMessage('delete', message.data, sendResponse)
      return true

    case 'UPDATE_RECORDING':
      handleRecordingMessage('update', message.data, sendResponse)
      return true

    // Authentication messages
    case 'GET_AUTH_STATE':
    case 'REFRESH_AUTH':
    case 'USER_LOGOUT':
    case 'CHECK_AUTH_STATUS':
      authHandler.handleAuthMessage(message).then(sendResponse)
      return true

    case 'OPEN_SIDE_PANEL':
      handleSidePanelOpen(message, sender)
      break

    case 'GET_CONFIG':
      // Simple sync response for configuration
      sendResponse({
        success: true,
        data: {
          version: chrome.runtime.getManifest().version,
          environment: process.env.NODE_ENV || 'development'
        }
      })
      break

    default:
      // Only log for actual typed messages, not Plasmo messages
      console.warn('Unknown message type:', message.type)
      sendResponse({
        success: false,
        error: `Unknown message type: ${message.type}`
      })
  }
})

// Side panel handler - utility function, not business logic
function handleSidePanelOpen(message: any, sender: chrome.runtime.MessageSender) {
  if (sender.tab?.id) {
    // Called from content script - use the tab ID
    chrome.sidePanel.open({ tabId: sender.tab.id })

    // If there's selectedText, send it to the sidepanel
    if (message.selectedText) {
      // Send data to sidepanel after a small delay to ensure it's open
      setTimeout(() => {
        chrome.runtime
          .sendMessage({
            type: 'SIDEPANEL_DATA',
            selectedText: message.selectedText,
            timestamp: message.timestamp
          })
          .catch(error => {
            console.log('Sidepanel not ready yet, this is normal:', error.message)
          })
      }, 500)
    }
  } else {
    // Called from popup or other extension context - get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id })

        // If there's selectedText, send it to the sidepanel
        if (message.selectedText) {
          setTimeout(() => {
            chrome.runtime
              .sendMessage({
                type: 'SIDEPANEL_DATA',
                selectedText: message.selectedText,
                timestamp: message.timestamp
              })
              .catch(error => {
                console.log('Sidepanel not ready yet, this is normal:', error.message)
              })
          }, 500)
        }
      }
    })
  }
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started')
})

// Handle extension suspend (cleanup)
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending')
})

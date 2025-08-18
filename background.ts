// Chrome Extension Starter - Background Script
// This is the main background script that acts as a message router
// Following clean architecture: ONLY routing, NO business logic

import { handleFeatureMessage } from "./lib/background/feature-handler"
import { handleApiMessage } from "./lib/background/api-handler"
import { handleStorageMessage } from "./lib/background/storage-handler"

console.log("Chrome Extension Starter background script loaded")

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "main-action",
    title: "Process with Extension",
    contexts: ["selection"]
  })
})

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "main-action" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_POPUP",
      selectedText: info.selectionText
    })
  }
})

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "main-action" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: "GET_SELECTED_TEXT"
    })
  }
})

// Message router - ONLY routing logic, NO business logic
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.type)

  switch (message.type) {
    case "PROCESS_FEATURE":
      handleFeatureMessage(message.data, sendResponse)
      return true // Keep message channel open for async response

    case "API_CALL":
      handleApiMessage(message.endpoint, message.data, sendResponse)
      return true

    case "STORAGE_OPERATION":
      handleStorageMessage(message.operation, message.key, message.value, sendResponse)
      return true

    case "OPEN_SIDE_PANEL":
      handleSidePanelOpen(message, sender)
      break

    case "GET_CONFIG":
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
      console.warn("Unknown message type:", message.type)
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
        chrome.runtime.sendMessage({
          type: "SIDEPANEL_DATA",
          selectedText: message.selectedText,
          timestamp: message.timestamp
        }).catch((error) => {
          console.log("Sidepanel not ready yet, this is normal:", error.message)
        })
      }, 500)
    }
  } else {
    // Called from popup or other extension context - get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
        
        // If there's selectedText, send it to the sidepanel
        if (message.selectedText) {
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: "SIDEPANEL_DATA",
              selectedText: message.selectedText,
              timestamp: message.timestamp
            }).catch((error) => {
              console.log("Sidepanel not ready yet, this is normal:", error.message)
            })
          }, 500)
        }
      }
    })
  }
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension started")
})

// Handle extension suspend (cleanup)
chrome.runtime.onSuspend.addListener(() => {
  console.log("Extension suspending")
})
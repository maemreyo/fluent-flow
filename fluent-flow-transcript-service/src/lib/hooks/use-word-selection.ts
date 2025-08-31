import { useCallback, useEffect, useState } from 'react'
import { wordSelectionService, type WordSelectionData, type SelectedWord } from '../services/word-selection-service'

// Import bridge service if available (for newtab integration)
let wordExplorerBridgeService: any = null
// Note: Bridge service is only available in the main Chrome extension context
// For now, we disable bridge integration in transcript service

export interface WordSelectionState {
  isSelecting: boolean
  selectedWords: SelectedWord[]
  isLoading: boolean
  error: string | null
}

export interface UseWordSelectionReturn {
  state: WordSelectionState
  addSelectedWord: (data: WordSelectionData) => Promise<boolean>
  removeSelectedWord: (wordId: string) => Promise<boolean>
  isWordSelected: (word: string) => Promise<boolean>
  clearAllWords: () => Promise<boolean>
  enableSelection: (containerId: string, sourceType: 'quiz' | 'vocabulary' | 'transcript', sourceId: string) => void
  disableSelection: (containerId: string) => void
  refreshWords: () => Promise<void>
}

export function useWordSelection(): UseWordSelectionReturn {
  const [state, setState] = useState<WordSelectionState>({
    isSelecting: false,
    selectedWords: [],
    isLoading: false,
    error: null
  })

  const refreshWords = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const words = await wordSelectionService.getSelectedWords()
      setState(prev => ({
        ...prev,
        selectedWords: words,
        isLoading: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load words'
      }))
    }
  }, [])

  const addSelectedWord = useCallback(async (data: WordSelectionData): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const cleanWord = wordSelectionService.extractCleanWord(data.word)
      const success = await wordSelectionService.addSelectedWord({
        word: cleanWord,
        context: data.context,
        sourceType: data.sourceType,
        sourceId: data.sourceId
      })
      
      if (success) {
        await refreshWords()
        
        // Also add to Word Explorer if bridge service is available
        if (wordExplorerBridgeService) {
          try {
            const selectedWords = await wordSelectionService.getSelectedWords()
            const latestWord = selectedWords.find(w => w.word.toLowerCase() === cleanWord.toLowerCase())
            if (latestWord) {
              await wordExplorerBridgeService.addWordToExplorer(latestWord)
            }
          } catch (bridgeError) {
            console.warn('Failed to add word to explorer:', bridgeError)
            // Don't fail the whole operation if bridge fails
          }
        }
      }
      
      setState(prev => ({ ...prev, isLoading: false }))
      return success
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to add word'
      }))
      return false
    }
  }, [refreshWords])

  const removeSelectedWord = useCallback(async (wordId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const success = await wordSelectionService.removeSelectedWord(wordId)
      if (success) {
        await refreshWords()
      }
      setState(prev => ({ ...prev, isLoading: false }))
      return success
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to remove word'
      }))
      return false
    }
  }, [refreshWords])

  const isWordSelected = useCallback(async (word: string): Promise<boolean> => {
    return await wordSelectionService.isWordSelected(word)
  }, [])

  const clearAllWords = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const success = await wordSelectionService.clearSelectedWords()
      if (success) {
        setState(prev => ({
          ...prev,
          selectedWords: [],
          isLoading: false
        }))
      }
      return success
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to clear words'
      }))
      return false
    }
  }, [])

  const handleTextSelection = useCallback((
    _event: MouseEvent,
    sourceType: 'quiz' | 'vocabulary' | 'transcript',
    sourceId: string
  ) => {
    console.log('Word selection: Text selection event triggered')
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      console.log('Word selection: No selection or collapsed')
      return
    }

    const selectedText = selection.toString().trim()
    console.log('Word selection: Selected text:', selectedText)
    if (!selectedText || selectedText.length < 2) {
      console.log('Word selection: Text too short')
      return
    }

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer.parentElement

    if (!container) {
      console.log('Word selection: No container found')
      return
    }

    const context = wordSelectionService.getWordContext(container, selectedText)
    const cleanWord = wordSelectionService.extractCleanWord(selectedText)

    console.log('Word selection: Showing tooltip for word:', cleanWord)
    
    // Show selection feedback
    const rect = range.getBoundingClientRect()
    showSelectionTooltip(rect, cleanWord, () => {
      console.log('Word selection: Adding word to selection')
      addSelectedWord({
        word: selectedText,
        context,
        sourceType,
        sourceId,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top
        }
      })
    })

    // Clear selection after a delay
    setTimeout(() => {
      selection.removeAllRanges()
    }, 100)
  }, [addSelectedWord])

  const showSelectionTooltip = useCallback((
    rect: DOMRect,
    word: string,
    onConfirm: () => void
  ) => {
    // Remove existing tooltip
    const existingTooltip = document.querySelector('.word-selection-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
    }

    // Create tooltip
    const tooltip = document.createElement('div')
    tooltip.className = 'word-selection-tooltip'
    tooltip.style.cssText = `
      position: fixed;
      top: ${rect.top - 50}px;
      left: ${rect.left + rect.width / 2 - 75}px;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: auto;
      cursor: pointer;
      transform: translateX(-50%);
      transition: opacity 0.2s;
    `
    
    tooltip.innerHTML = `
      <div style="text-align: center;">
        <div style="font-weight: 500; margin-bottom: 4px;">Add "${word}" to vocabulary?</div>
        <div style="font-size: 10px; opacity: 0.8;">Click to confirm</div>
      </div>
    `

    tooltip.addEventListener('click', () => {
      onConfirm()
      tooltip.remove()
    })

    document.body.appendChild(tooltip)

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.style.opacity = '0'
        setTimeout(() => tooltip.remove(), 200)
      }
    }, 3000)
  }, [])

  const enableSelection = useCallback((
    containerId: string,
    sourceType: 'quiz' | 'vocabulary' | 'transcript',
    sourceId: string
  ) => {
    const container = document.getElementById(containerId)
    if (!container) {
      console.log(`Word selection: Container not found: ${containerId}`)
      return
    }

    console.log(`Word selection: Enabling selection for ${containerId}`)
    const handler = (event: MouseEvent) => handleTextSelection(event, sourceType, sourceId)
    
    container.addEventListener('mouseup', handler)
    container.style.userSelect = 'text'
    container.style.cursor = 'text'

    setState(prev => ({ ...prev, isSelecting: true }))

    // Store handler for cleanup
    ;(container as any)._wordSelectionHandler = handler
  }, [handleTextSelection])

  const disableSelection = useCallback((containerId: string) => {
    const container = document.getElementById(containerId)
    if (!container) return

    const handler = (container as any)._wordSelectionHandler
    if (handler) {
      container.removeEventListener('mouseup', handler)
      delete (container as any)._wordSelectionHandler
    }

    container.style.userSelect = 'none'
    container.style.cursor = 'default'

    setState(prev => ({ ...prev, isSelecting: false }))

    // Remove any existing tooltips
    const tooltip = document.querySelector('.word-selection-tooltip')
    if (tooltip) tooltip.remove()
  }, [])

  // Load words on mount
  useEffect(() => {
    refreshWords()
  }, [refreshWords])

  return {
    state,
    addSelectedWord,
    removeSelectedWord,
    isWordSelected,
    clearAllWords,
    enableSelection,
    disableSelection,
    refreshWords
  }
}
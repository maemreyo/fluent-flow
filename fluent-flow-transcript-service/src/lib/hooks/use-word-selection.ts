import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  wordSelectionService,
  type SelectedWord,
  type WordSelectionData
} from '../services/word-selection-service'

// Import bridge service if available (for newtab integration)
const wordExplorerBridgeService: any = null
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
  enableSelection: (
    containerId: string,
    sourceType: 'quiz' | 'vocabulary' | 'transcript',
    sourceId: string
  ) => void
  disableSelection: (containerId: string) => void
  refreshWords: () => Promise<void>
}

export function useWordSelection(): UseWordSelectionReturn {
  const { user } = useAuth()
  const [state, setState] = useState<WordSelectionState>({
    isSelecting: false,
    selectedWords: [],
    isLoading: false,
    error: null
  })

  const refreshWords = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const words = await wordSelectionService.getSelectedWords(user?.id)
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
  }, [user?.id])

  const addSelectedWord = useCallback(
    async (data: WordSelectionData): Promise<boolean> => {
      setState(prev => ({ ...prev, isLoading: true }))
      try {
        const cleanWord = wordSelectionService.extractCleanWord(data.word)
        console.log('Adding word to selection:', cleanWord, 'from', data.sourceType)

        const success = await wordSelectionService.addSelectedWord(
          {
            word: cleanWord,
            context: data.context,
            sourceType: data.sourceType,
            sourceId: data.sourceId
          },
          user?.id
        )

        console.log('Word selection service result:', success)

        if (success) {
          await refreshWords()

          // Also add to user vocabulary deck for better integration with AI enhancement
          try {
            console.log('Attempting to add to vocabulary deck with AI enhancement...')
            const { userService } = await import('../services/user-service')
            const { vocabularyEnhancementService } = await import(
              '../services/vocabulary-enhancement-service'
            )

            if (user) {
              // Get AI enhancement data
              console.log('Enhancing vocabulary with AI...')
              const enhancedData = await vocabularyEnhancementService.enhanceVocabularyWithRetry(
                cleanWord,
                data.context,
                'intermediate'
              )

              console.log('AI enhancement result:', enhancedData)

              const vocabularyData = {
                text: cleanWord,
                definition:
                  enhancedData.definition_en || `A word/phrase selected from ${data.sourceType}`,
                definition_vi: enhancedData.definition_vi,
                example: enhancedData.example,
                context: data.context,
                difficulty: 'intermediate',
                item_type: cleanWord.includes(' ') ? 'phrase' : 'word',
                learning_status: 'new',
                part_of_speech: enhancedData.part_of_speech,
                pronunciation: enhancedData.pronunciation,
                synonyms: enhancedData.synonyms,
                antonyms: enhancedData.antonyms
              }

              console.log('Adding enhanced vocabulary data to deck:', vocabularyData)
              const result = await userService.addVocabularyToDeck(user.id, vocabularyData)

              if (result) {
                console.log('Successfully added enhanced word to vocabulary deck:', result)
              } else {
                console.warn('Failed to add word to vocabulary deck - no result returned')
              }
            } else {
              console.warn('No current user found for vocabulary deck')
            }
          } catch (bridgeError) {
            console.error('Error adding to vocabulary deck:', bridgeError)
          }

          if (wordExplorerBridgeService) {
            try {
              const selectedWords = await wordSelectionService.getSelectedWords(user?.id)
              const latestWord = selectedWords.find(
                w => w.word.toLowerCase() === cleanWord.toLowerCase()
              )
              if (latestWord) {
                await wordExplorerBridgeService.addWordToExplorer(latestWord)
              }
            } catch (bridgeError) {
              console.warn('Failed to add word to explorer:', bridgeError)
            }
          }
        } else {
          console.warn('Failed to add word to selection service')
        }

        setState(prev => ({ ...prev, isLoading: false }))
        return success
      } catch (error) {
        console.error('Error in addSelectedWord:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to add word'
        }))
        return false
      }
    },
    [user?.id, refreshWords]
  )

  const removeSelectedWord = useCallback(
    async (wordId: string): Promise<boolean> => {
      setState(prev => ({ ...prev, isLoading: true }))
      try {
        const success = await wordSelectionService.removeSelectedWord(wordId, user?.id)
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
    },
    [user?.id, refreshWords]
  )

  const isWordSelected = useCallback(
    async (word: string): Promise<boolean> => {
      return await wordSelectionService.isWordSelected(word, user?.id)
    },
    [user?.id]
  )

  const clearAllWords = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const success = await wordSelectionService.clearSelectedWords(user?.id)
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
  }, [user?.id])

  const handleTextSelection = useCallback(
    (_event: MouseEvent, sourceType: 'quiz' | 'vocabulary' | 'transcript', sourceId: string) => {
      // console.log('Word selection: Text selection event triggered')
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        // console.log('Word selection: No selection or collapsed')
        return
      }

      const selectedText = selection.toString().trim()
      // console.log('Word selection: Selected text:', selectedText)
      if (!selectedText || selectedText.length < 2) {
        // console.log('Word selection: Text too short')
        return
      }

      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer.parentElement

      if (!container) {
        // console.log('Word selection: No container found')
        return
      }

      const context = wordSelectionService.getWordContext(container, selectedText)
      const cleanWord = wordSelectionService.extractCleanWord(selectedText)

      // console.log('Word selection: Showing tooltip for word:', cleanWord)

      const rect = range.getBoundingClientRect()
      showSelectionTooltip(rect, cleanWord, () => {
        // console.log('Word selection: Adding word to selection')
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

      setTimeout(() => {
        selection.removeAllRanges()
      }, 100)
    },
    [addSelectedWord]
  )

  const showSelectionTooltip = useCallback((rect: DOMRect, word: string, onConfirm: () => void) => {
    const existingTooltip = document.querySelector('.word-selection-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
    }

    const tooltip = document.createElement('div')
    tooltip.className = 'word-selection-tooltip'
    tooltip.style.cssText = `
      position: fixed;
      top: ${rect.top - 60}px;
      left: ${rect.left + rect.width / 2}px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      pointer-events: auto;
      cursor: pointer;
      transform: translateX(-50%) translateY(-10px) scale(0.9);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      opacity: 0;
      animation: tooltip-appear 0.3s ease-out forwards;
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
    `

    if (!document.querySelector('#word-selection-styles')) {
      const style = document.createElement('style')
      style.id = 'word-selection-styles'
      style.textContent = `
        @keyframes tooltip-appear {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        @keyframes tooltip-success {
          0% {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            transform: translateX(-50%) translateY(0) scale(1);
          }
          50% {
            background: linear-gradient(135deg, #10b981, #059669);
            transform: translateX(-50%) translateY(-5px) scale(1.05);
          }
          100% {
            background: linear-gradient(135deg, #10b981, #059669);
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
      `
      document.head.appendChild(style)
    }

    tooltip.innerHTML = `
      <div style="text-align: center;">
        <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span style="font-size: 16px;">📚</span>
          <span>Add "${word.length > 20 ? word.slice(0, 20) + '...' : word}"</span>
        </div>
        <div style="font-size: 11px; opacity: 0.9;">Click to add to vocabulary</div>
      </div>
    `

    let isProcessing = false

    tooltip.addEventListener('click', async () => {
      if (isProcessing) return
      isProcessing = true

      tooltip.innerHTML = `
        <div style="text-align: center;">
          <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <div style="width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>Adding...</span>
          </div>
        </div>
      `

      const spinStyle = document.createElement('style')
      spinStyle.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(spinStyle)

      try {
        await onConfirm()

        tooltip.style.animation = 'tooltip-success 0.6s ease-out forwards'
        tooltip.innerHTML = `
          <div style="text-align: center;">
            <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span style="font-size: 16px;">✅</span>
              <span>Added successfully!</span>
            </div>
          </div>
        `

        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.style.opacity = '0'
            tooltip.style.transform = 'translateX(-50%) translateY(-10px) scale(0.9)'
            setTimeout(() => tooltip.remove(), 300)
          }
        }, 1500)
      } catch (error) {
        tooltip.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'
        tooltip.innerHTML = `
          <div style="text-align: center;">
            <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span style="font-size: 16px;">❌</span>
              <span>Failed to add</span>
            </div>
          </div>
        `

        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.style.opacity = '0'
            setTimeout(() => tooltip.remove(), 200)
          }
        }, 2000)
      }

      spinStyle.remove()
    })

    tooltip.addEventListener('mouseenter', () => {
      if (!isProcessing) {
        tooltip.style.transform = 'translateX(-50%) translateY(-2px) scale(1.02)'
        tooltip.style.boxShadow = '0 12px 40px rgba(0,0,0,0.25)'
      }
    })

    tooltip.addEventListener('mouseleave', () => {
      if (!isProcessing) {
        tooltip.style.transform = 'translateX(-50%) translateY(0) scale(1)'
        tooltip.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'
      }
    })

    document.body.appendChild(tooltip)

    const autoRemoveTimeout = setTimeout(() => {
      if (tooltip.parentNode && !isProcessing) {
        tooltip.style.opacity = '0'
        tooltip.style.transform = 'translateX(-50%) translateY(-10px) scale(0.9)'
        setTimeout(() => tooltip.remove(), 300)
      }
    }, 5000)

    tooltip.addEventListener('click', () => clearTimeout(autoRemoveTimeout))
  }, [])

  const enableSelection = useCallback(
    (containerId: string, sourceType: 'quiz' | 'vocabulary' | 'transcript', sourceId: string) => {
      const container = document.getElementById(containerId)
      if (!container) {
        // console.log(`Word selection: Container not found: ${containerId}`)
        return
      }

      // console.log(`Word selection: Enabling selection for ${containerId}`)
      const handler = (event: MouseEvent) => handleTextSelection(event, sourceType, sourceId)

      container.addEventListener('mouseup', handler)
      container.style.userSelect = 'text'
      container.style.cursor = 'text'

      setState(prev => ({ ...prev, isSelecting: true }))

      // Store handler for cleanup
      ;(container as any)._wordSelectionHandler = handler
    },
    [handleTextSelection]
  )

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

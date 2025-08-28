// Question Overlay Service - Handles injecting question overlay into YouTube page
import type { ConversationQuestions, QuestionPracticeResult } from '../types/fluent-flow-types'

export class QuestionOverlayService {
  private overlayContainer: HTMLDivElement | null = null
  private shadowRoot: ShadowRoot | null = null
  private isVisible: boolean = false

  constructor() {
    this.setupOverlayContainer()
  }

  private setupOverlayContainer(): void {
    // Create overlay container
    this.overlayContainer = document.createElement('div')
    this.overlayContainer.id = 'fluent-flow-question-overlay'
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
      cursor: move;
    `

    // Create shadow DOM for style isolation
    this.shadowRoot = this.overlayContainer.attachShadow({ mode: 'closed' })

    // Add styles to shadow DOM
    const styleSheet = document.createElement('style')
    styleSheet.textContent = this.getOverlayStyles()
    this.shadowRoot.appendChild(styleSheet)

    // Setup drag functionality
    this.setupDragFunctionality()

    // Append to body
    document.body.appendChild(this.overlayContainer)

    console.log('FluentFlow: Question overlay container created')
  }

  private setupDragFunctionality(): void {
    if (!this.overlayContainer) return

    let isDragging = false
    let dragStart = { x: 0, y: 0 }
    let elementStart = { x: 0, y: 0 }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if overlay is in minimized state
      const minimizedCard = this.shadowRoot?.querySelector('.minimized-card') as HTMLElement | null
      if (!minimizedCard) return // Only allow drag when minimized
      
      // For minimized overlay, allow drag from anywhere in the minimized card
      if (!target.closest('.minimized-card')) return

      isDragging = true
      dragStart.x = e.clientX
      dragStart.y = e.clientY
      
      const rect = this.overlayContainer!.getBoundingClientRect()
      elementStart.x = rect.left
      elementStart.y = rect.top

      e.preventDefault()
      
      // Add dragging visual feedback
      minimizedCard.style.cursor = 'grabbing'
      minimizedCard.style.opacity = '0.8'
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.overlayContainer) return

      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y

      let newX = elementStart.x + deltaX
      let newY = elementStart.y + deltaY

      // Constrain to viewport bounds
      const rect = this.overlayContainer.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      newX = Math.max(0, Math.min(newX, maxX))
      newY = Math.max(0, Math.min(newY, maxY))

      this.overlayContainer.style.left = `${newX}px`
      this.overlayContainer.style.top = `${newY}px`
      this.overlayContainer.style.right = 'auto'
    }

    const handleMouseUp = () => {
      isDragging = false
      
      // Remove visual feedback
      const minimizedCard = this.shadowRoot?.querySelector('.minimized-card') as HTMLElement | null
      if (minimizedCard) {
        minimizedCard.style.cursor = 'grab'
        minimizedCard.style.opacity = '1'
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    // Add event listener to the container
    this.overlayContainer.addEventListener('mousedown', handleMouseDown)
  }

  private getOverlayStyles(): string {
    return `
      .overlay-wrapper {
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* cspell:disable-line */
        font-size: 14px;
        line-height: 1.4;
      }
      
      .overlay-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        border: 2px solid #3b82f6;
        padding: 16px;
        max-width: 400px;
        width: 100%;
      }
      
      .overlay-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        cursor: move;
        padding: 4px 0;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
      .overlay-header:hover {
        background-color: rgba(59, 130, 246, 0.05);
      }
      
      .overlay-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .extension-icon {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        flex-shrink: 0;
      }
      
      .overlay-title {
        font-size: 14px;
        font-weight: 500;
        color: #3b82f6;
      }
      
      .overlay-difficulty {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
      }
      
      .difficulty-easy {
        background-color: #dcfce7;
        color: #166534;
      }
      
      .difficulty-medium {
        background-color: #fef3c7;
        color: #92400e;
      }
      
      .difficulty-hard {
        background-color: #fef2f2;
        color: #991b1b;
      }
      
      .overlay-controls {
        display: flex;
        gap: 4px;
      }
      
      .overlay-btn {
        padding: 4px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .overlay-btn:hover {
        background-color: #f3f4f6;
      }
      
      .overlay-btn svg {
        width: 16px;
        height: 16px;
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #e5e7eb;
        border-radius: 4px;
        margin-bottom: 16px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background-color: #3b82f6;
        transition: width 0.3s ease;
      }
      
      .question-text {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        line-height: 1.5;
        margin-bottom: 16px;
      }
      
      .options-container {
        margin-bottom: 16px;
      }
      
      .option-btn {
        width: 100%;
        text-align: left;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        background: white;
        cursor: pointer;
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .option-btn:hover {
        border-color: #d1d5db;
        background-color: #f9fafb;
      }
      
      .option-btn.selected {
        border-color: #3b82f6;
        background-color: #eff6ff;
        color: #1d4ed8;
      }
      
      .option-letter {
        font-weight: 600;
        margin-right: 8px;
      }
      
      .navigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .nav-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        border-radius: 4px;
        transition: colors 0.2s ease;
      }
      
      .nav-btn:hover:not(:disabled) {
        background-color: #f3f4f6;
      }
      
      .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .nav-btn.primary {
        background-color: #3b82f6;
        color: white;
        font-weight: 500;
      }
      
      .nav-btn.primary:hover:not(:disabled) {
        background-color: #2563eb;
      }
      
      .nav-btn svg {
        width: 16px;
        height: 16px;
      }
      
      .results-card {
        text-align: center;
      }
      
      .results-score {
        font-size: 32px;
        font-weight: bold;
        color: #059669;
        margin-bottom: 8px;
      }
      
      .results-text {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 16px;
      }
      
      .results-btn {
        width: 100%;
        background-color: #3b82f6;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }
      
      .results-btn:hover {
        background-color: #2563eb;
      }
      
      .minimized-card {
        background-color: #3b82f6;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 8px 12px;
        min-width: 120px;
        cursor: grab;
        transition: opacity 0.2s ease, transform 0.1s ease;
        user-select: none;
      }
      
      .minimized-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .minimized-card:active {
        cursor: grabbing;
      }
      
      .minimized-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
      }
      
      .minimized-btn {
        padding: 4px;
        border: none;
        background: transparent;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .minimized-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .minimized-btn svg {
        width: 12px;
        height: 12px;
      }
    `
  }

  public showQuestions(questions: ConversationQuestions): void {
    if (!this.shadowRoot) return

    this.isVisible = true

    // Clear existing content
    const existingOverlay = this.shadowRoot.querySelector('.overlay-wrapper')
    if (existingOverlay) {
      existingOverlay.remove()
    }

    // Create overlay wrapper
    const wrapper = document.createElement('div')
    wrapper.className = 'overlay-wrapper'

    // Create the overlay content
    wrapper.innerHTML = this.createOverlayHTML(questions, 0, {}, false, [])

    // Add event listeners
    this.attachEventListeners(wrapper, questions)

    // Append to shadow root
    this.shadowRoot.appendChild(wrapper)

    console.log('FluentFlow: Question overlay displayed', questions)
  }

  private createOverlayHTML(
    questions: ConversationQuestions,
    currentIndex: number,
    selectedAnswers: Record<string, string>,
    showResults: boolean,
    results: QuestionPracticeResult[],
    isMinimized: boolean = false
  ): string {
    if (showResults) {
      const correctAnswers = results.filter(r => r.isCorrect).length
      const score = Math.round((correctAnswers / questions.questions.length) * 100)

      return `
        <div class="overlay-card results-card">
          <div class="overlay-header">
            <h3 style="color: #059669; font-size: 18px; font-weight: 600; margin: 0;">Complete!</h3>
            <button class="overlay-btn close-btn" data-action="close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="results-score">${score}%</div>
          <p class="results-text">${correctAnswers}/${questions.questions.length} correct</p>
          <button class="results-btn" data-action="close">Close Practice</button>
        </div>
      `
    }

    if (isMinimized) {
      return `
        <div class="minimized-card">
          <div class="minimized-content">
            <img src="${chrome.runtime.getURL('assets/icon.png')}" alt="FluentFlow" class="extension-icon" style="filter: brightness(0) invert(1);" />
            <span>Q ${currentIndex + 1}/${questions.questions.length}</span>
            <button class="minimized-btn" data-action="expand">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <button class="minimized-btn" data-action="close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      `
    }

    const currentQuestion = questions.questions[currentIndex]
    const progress = ((currentIndex + 1) / questions.questions.length) * 100
    const selectedAnswer = selectedAnswers[currentQuestion.id]

    return `
      <div class="overlay-card">
        <div class="overlay-header">
          <div class="overlay-header-left">
            <img src="${chrome.runtime.getURL('assets/icon.png')}" alt="FluentFlow" class="extension-icon" />
            <span class="overlay-title">Question ${currentIndex + 1} of ${questions.questions.length}</span>
            <span class="overlay-difficulty difficulty-${currentQuestion.difficulty}">
              ${currentQuestion.difficulty}
            </span>
          </div>
          <div class="overlay-controls">
            <button class="overlay-btn" data-action="minimize">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
              </svg>
            </button>
            <button class="overlay-btn" data-action="close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        
        <div class="question-text">${currentQuestion.question}</div>
        
        <div class="options-container">
          ${currentQuestion.options
            .map((option, index) => {
              const letter = ['A', 'B', 'C', 'D'][index]
              const isSelected = selectedAnswer === letter
              return `
              <button class="option-btn ${isSelected ? 'selected' : ''}" data-answer="${letter}">
                <span class="option-letter">${letter}.</span>${option}
              </button>
            `
            })
            .join('')}
        </div>
        
        <div class="navigation">
          <button class="nav-btn" data-action="previous" ${currentIndex === 0 ? 'disabled' : ''}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Previous
          </button>
          
          <button class="nav-btn primary" data-action="next" ${!selectedAnswer ? 'disabled' : ''}>
            ${currentIndex === questions.questions.length - 1 ? 'Finish' : 'Next'}
            ${
              currentIndex !== questions.questions.length - 1
                ? `
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            `
                : ''
            }
          </button>
        </div>
      </div>
    `
  }

  private attachEventListeners(wrapper: HTMLElement, questions: ConversationQuestions): void {
    // Store state on the wrapper element to persist across re-attachments
    if (!wrapper.dataset.currentIndex) wrapper.dataset.currentIndex = '0'
    if (!wrapper.dataset.selectedAnswers) wrapper.dataset.selectedAnswers = '{}'
    if (!wrapper.dataset.results) wrapper.dataset.results = '[]'
    if (!wrapper.dataset.isMinimized) wrapper.dataset.isMinimized = 'false'

    let currentIndex = parseInt(wrapper.dataset.currentIndex!)
    let selectedAnswers: Record<string, string> = JSON.parse(wrapper.dataset.selectedAnswers!)
    let results: QuestionPracticeResult[] = JSON.parse(wrapper.dataset.results!)
    let isMinimized = wrapper.dataset.isMinimized === 'true'

    const updateOverlay = (showResults: boolean = false) => {
      // Save state back to wrapper
      wrapper.dataset.currentIndex = currentIndex.toString()
      wrapper.dataset.selectedAnswers = JSON.stringify(selectedAnswers)
      wrapper.dataset.results = JSON.stringify(results)
      wrapper.dataset.isMinimized = isMinimized.toString()

      wrapper.innerHTML = this.createOverlayHTML(
        questions,
        currentIndex,
        selectedAnswers,
        showResults,
        results,
        isMinimized
      )
      this.attachEventListeners(wrapper, questions) // Reattach listeners
    }

    // Handle all button clicks
    wrapper.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const button = target.closest('button') as HTMLButtonElement
      if (!button) return

      const action = button.dataset.action
      const answer = button.dataset.answer

      if (answer) {
        // Handle answer selection
        selectedAnswers[questions.questions[currentIndex].id] = answer
        updateOverlay()
        return
      }

      switch (action) {
        case 'close':
          this.hideOverlay()
          break

        case 'minimize':
          isMinimized = true
          updateOverlay()
          break

        case 'expand':
          isMinimized = false
          updateOverlay()
          break

        case 'previous':
          if (currentIndex > 0) {
            currentIndex--
            updateOverlay()
          }
          break

        case 'next':
          const currentQuestion = questions.questions[currentIndex]
          if (!selectedAnswers[currentQuestion.id]) return

          // Record result
          const isCorrect = selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer
          const result: QuestionPracticeResult = {
            questionId: currentQuestion.id,
            selectedAnswer: selectedAnswers[currentQuestion.id],
            isCorrect,
            timeSpent: 10, // Simplified for overlay
            attemptedAt: new Date()
          }

          results.push(result)

          if (currentIndex < questions.questions.length - 1) {
            currentIndex++
            updateOverlay()
          } else {
            // Show results
            updateOverlay(true)

            // Notify completion
            const correctCount = results.filter(r => r.isCorrect).length
            const score = Math.round((correctCount / questions.questions.length) * 100)

            // Send completion message
            chrome.runtime.sendMessage({
              type: 'OVERLAY_QUESTIONS_COMPLETED',
              results,
              score
            })
          }
          break
      }
    })
  }

  public hideOverlay(): void {
    if (this.shadowRoot) {
      const overlay = this.shadowRoot.querySelector('.overlay-wrapper')
      if (overlay) {
        overlay.remove()
      }
    }
    this.isVisible = false
    console.log('FluentFlow: Question overlay hidden')
  }

  public isOverlayVisible(): boolean {
    return this.isVisible
  }

  public destroy(): void {
    if (this.overlayContainer && this.overlayContainer.parentNode) {
      this.overlayContainer.parentNode.removeChild(this.overlayContainer)
    }
    this.overlayContainer = null
    this.shadowRoot = null
    this.isVisible = false
    console.log('FluentFlow: Question overlay service destroyed')
  }
}

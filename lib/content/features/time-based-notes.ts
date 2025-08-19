// Time-Based Notes Feature for Language Learning
// Allows users to add timestamped notes during video playback

import type { TimestampedNote, RecordingSession, VideoNotes, NoteCategory } from '../../types/fluent-flow-types'
import type { YouTubePlayerIntegration } from './loop'
import type { UIUtilities } from './recording'

export class TimeBasedNotesFeature {
  private currentVideoNotes: VideoNotes | null = null
  private activeSession: RecordingSession | null = null
  private notesContainer: HTMLElement | null = null
  private noteInput: HTMLElement | null = null
  private isNoteTakingMode: boolean = false

  // Default note categories for language learning
  private readonly defaultCategories: NoteCategory[] = [
    { id: 'vocab', name: 'Vocabulary', color: '#3b82f6', icon: '📝' },
    { id: 'grammar', name: 'Grammar', color: '#10b981', icon: '📚' },
    { id: 'pronunciation', name: 'Pronunciation', color: '#f59e0b', icon: '🗣️' },
    { id: 'question', name: 'Question', color: '#ef4444', icon: '❓' },
    { id: 'observation', name: 'Observation', color: '#8b5cf6', icon: '👁️' }
  ]

  constructor(
    private player: YouTubePlayerIntegration,
    private ui: UIUtilities
  ) {}

  // Initialize notes for current video
  public async initializeVideoNotes(): Promise<void> {
    const videoInfo = this.player.getVideoInfo()
    if (!videoInfo.id) {
      console.warn('FluentFlow Notes: No video ID available')
      return
    }

    try {
      // Load existing video notes or create new ones
      this.currentVideoNotes = await this.loadVideoNotes(videoInfo.id)
      
      if (!this.currentVideoNotes) {
        this.currentVideoNotes = {
          videoId: videoInfo.id,
          videoTitle: videoInfo.title || 'Unknown Video',
          videoUrl: videoInfo.url || window.location.href,
          totalNotes: 0,
          sessions: [],
          allNotes: [],
          lastUpdated: new Date()
        }
      }

      console.log('FluentFlow Notes: Video notes initialized', this.currentVideoNotes)
    } catch (error) {
      console.error('FluentFlow Notes: Failed to initialize video notes', error)
      this.ui.showToast('Failed to load notes for this video')
    }
  }

  // Start a new recording session with notes
  public startNotesSession(): RecordingSession {
    const videoInfo = this.player.getVideoInfo()
    
    this.activeSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      videoId: videoInfo.id || 'unknown',
      videoTitle: videoInfo.title || 'Unknown Video',
      videoUrl: videoInfo.url || window.location.href,
      duration: 0,
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.ui.showToast('Notes session started - Press N to add notes')
    return this.activeSession
  }

  // Add a timestamped note at current video time
  public async addTimestampedNote(
    content: string, 
    type: TimestampedNote['type'] = 'observation',
    tags?: string[]
  ): Promise<void> {
    const currentTime = this.player.getCurrentTime()
    if (currentTime === null) {
      this.ui.showToast('Cannot get current video time')
      return
    }

    if (!this.currentVideoNotes) {
      await this.initializeVideoNotes()
    }

    if (!this.activeSession) {
      this.activeSession = this.startNotesSession()
    }

    const note: TimestampedNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      videoId: this.currentVideoNotes!.videoId,
      timestamp: currentTime,
      content: content.trim(),
      type,
      tags,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Add to active session and video notes
    this.activeSession.notes.push(note)
    this.currentVideoNotes!.allNotes.push(note)
    this.currentVideoNotes!.totalNotes++
    this.currentVideoNotes!.lastUpdated = new Date()

    // Save to storage
    await this.saveVideoNotes()
    
    const timeString = this.ui.formatTime(currentTime)
    this.ui.showToast(`Note added at ${timeString}: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`)
    
    console.log('FluentFlow Notes: Added timestamped note', note)
  }

  // End current notes session
  public async endNotesSession(): Promise<void> {
    if (!this.activeSession || !this.currentVideoNotes) {
      return
    }

    // Update session duration
    this.activeSession.duration = Date.now() - this.activeSession.createdAt.getTime()
    this.activeSession.updatedAt = new Date()

    // Add session to video notes
    this.currentVideoNotes.sessions.push({ ...this.activeSession })
    this.currentVideoNotes.lastUpdated = new Date()

    // Save to storage
    await this.saveVideoNotes()

    const noteCount = this.activeSession.notes.length
    this.ui.showToast(`Session ended with ${noteCount} note${noteCount !== 1 ? 's' : ''}`)

    this.activeSession = null
    console.log('FluentFlow Notes: Session ended', this.currentVideoNotes)
  }

  // Toggle note-taking mode
  public toggleNoteTakingMode(): void {
    this.isNoteTakingMode = !this.isNoteTakingMode
    
    if (this.isNoteTakingMode) {
      this.showNoteInput()
      this.ui.showToast('Note-taking mode ON - Type notes and press Enter')
    } else {
      this.hideNoteInput()
      this.ui.showToast('Note-taking mode OFF')
    }
  }

  // Get notes for current video
  public getCurrentVideoNotes(): VideoNotes | null {
    return this.currentVideoNotes
  }

  // Get notes at specific timestamp (±2 seconds tolerance)
  public getNotesAtTimestamp(timestamp: number): TimestampedNote[] {
    if (!this.currentVideoNotes) return []
    
    return this.currentVideoNotes.allNotes.filter(note => 
      Math.abs(note.timestamp - timestamp) <= 2
    )
  }

  // Get all notes for current video, sorted by timestamp
  public getAllNotes(): TimestampedNote[] {
    if (!this.currentVideoNotes) return []
    
    return [...this.currentVideoNotes.allNotes].sort((a, b) => a.timestamp - b.timestamp)
  }

  // Export notes to text format
  public exportNotesToText(): string {
    if (!this.currentVideoNotes || this.currentVideoNotes.allNotes.length === 0) {
      return 'No notes available for this video.'
    }

    const notes = this.getAllNotes()
    const header = `Notes for: ${this.currentVideoNotes.videoTitle}\nVideo URL: ${this.currentVideoNotes.videoUrl}\nTotal Notes: ${this.currentVideoNotes.totalNotes}\nLast Updated: ${this.currentVideoNotes.lastUpdated.toLocaleString()}\n\n`
    
    const notesText = notes.map(note => {
      const timeString = this.ui.formatTime(note.timestamp)
      const category = this.defaultCategories.find(cat => cat.id === note.type)
      const categoryIcon = category ? category.icon : '📝'
      
      return `[${timeString}] ${categoryIcon} ${note.content}${note.tags ? ` #${note.tags.join(' #')}` : ''}`
    }).join('\n')

    return header + notesText
  }

  // Show notes overlay on video
  public showNotesOverlay(): void {
    if (!this.currentVideoNotes || this.currentVideoNotes.allNotes.length === 0) {
      this.ui.showToast('No notes available for this video')
      return
    }

    // Create notes overlay
    this.createNotesOverlay()
  }

  // Clean up when video changes
  public async onVideoChange(): Promise<void> {
    if (this.activeSession) {
      await this.endNotesSession()
    }
    
    this.currentVideoNotes = null
    this.hideNoteInput()
    this.hideNotesOverlay()
  }

  // Private methods
  private async loadVideoNotes(videoId: string): Promise<VideoNotes | null> {
    try {
      const stored = localStorage.getItem(`fluent_flow_notes_${videoId}`)
      if (!stored) return null

      const data = JSON.parse(stored)
      // Convert date strings back to Date objects
      data.lastUpdated = new Date(data.lastUpdated)
      data.sessions.forEach((session: RecordingSession) => {
        session.createdAt = new Date(session.createdAt)
        session.updatedAt = new Date(session.updatedAt)
        session.notes.forEach((note: TimestampedNote) => {
          note.createdAt = new Date(note.createdAt)
          note.updatedAt = new Date(note.updatedAt)
        })
      })
      data.allNotes.forEach((note: TimestampedNote) => {
        note.createdAt = new Date(note.createdAt)
        note.updatedAt = new Date(note.updatedAt)
      })

      return data
    } catch (error) {
      console.error('FluentFlow Notes: Failed to load video notes', error)
      return null
    }
  }

  private async saveVideoNotes(): Promise<void> {
    if (!this.currentVideoNotes) return

    try {
      const key = `fluent_flow_notes_${this.currentVideoNotes.videoId}`
      localStorage.setItem(key, JSON.stringify(this.currentVideoNotes))
      console.log('FluentFlow Notes: Video notes saved', this.currentVideoNotes)
    } catch (error) {
      console.error('FluentFlow Notes: Failed to save video notes', error)
      this.ui.showToast('Failed to save notes')
    }
  }

  private showNoteInput(): void {
    if (this.noteInput) return

    this.noteInput = document.createElement('div')
    this.noteInput.className = 'fluent-flow-note-input'
    this.noteInput.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 12px;
        z-index: 10000;
        min-width: 300px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <div style="color: #3b82f6; font-size: 12px; margin-bottom: 8px; font-weight: 600;">
          📝 Add Note (${this.ui.formatTime(this.player.getCurrentTime() || 0)})
        </div>
        <input 
          type="text" 
          id="ff-note-input" 
          placeholder="Type your note and press Enter..."
          style="
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid #4b5563;
            border-radius: 4px;
            padding: 8px;
            color: white;
            font-size: 14px;
            outline: none;
          "
        >
        <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;">
          ${this.defaultCategories.map(cat => 
            `<button class="ff-note-category" data-type="${cat.id}" style="
              background: ${cat.color}22; 
              border: 1px solid ${cat.color}; 
              color: ${cat.color}; 
              padding: 2px 6px; 
              border-radius: 3px; 
              font-size: 10px; 
              cursor: pointer;
            ">${cat.icon} ${cat.name}</button>`
          ).join('')}
        </div>
      </div>
    `

    document.body.appendChild(this.noteInput)

    // Setup event handlers
    const input = this.noteInput.querySelector('#ff-note-input') as HTMLInputElement
    const categoryButtons = this.noteInput.querySelectorAll('.ff-note-category') as NodeListOf<HTMLButtonElement>
    
    let selectedType: TimestampedNote['type'] = 'observation'

    input.focus()
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        this.addTimestampedNote(input.value, selectedType)
        input.value = ''
        input.focus()
      } else if (e.key === 'Escape') {
        this.hideNoteInput()
        this.isNoteTakingMode = false
      }
    })

    categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        categoryButtons.forEach(b => b.style.background = b.dataset.type === button.dataset.type ? 
          this.defaultCategories.find(c => c.id === b.dataset.type)?.color + '44' : 
          this.defaultCategories.find(c => c.id === b.dataset.type)?.color + '22')
        selectedType = button.dataset.type as TimestampedNote['type']
      })
    })
  }

  private hideNoteInput(): void {
    if (this.noteInput) {
      this.noteInput.remove()
      this.noteInput = null
    }
  }

  private createNotesOverlay(): void {
    this.hideNotesOverlay()

    this.notesContainer = document.createElement('div')
    this.notesContainer.className = 'fluent-flow-notes-overlay'
    this.notesContainer.innerHTML = `
      <div style="
        position: fixed;
        top: 60px;
        right: 20px;
        width: 350px;
        max-height: 500px;
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid #374151;
        border-radius: 8px;
        padding: 16px;
        z-index: 10000;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      ">
        <div style="
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #374151;
        ">
          <h3 style="color: #3b82f6; font-size: 14px; margin: 0; font-weight: 600;">
            📝 Video Notes (${this.currentVideoNotes!.totalNotes})
          </h3>
          <button id="ff-close-notes" style="
            background: none; 
            border: none; 
            color: #9ca3af; 
            font-size: 18px; 
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
          ">×</button>
        </div>
        <div id="ff-notes-list">
          ${this.renderNotesList()}
        </div>
      </div>
    `

    document.body.appendChild(this.notesContainer)

    // Setup close handler
    const closeButton = this.notesContainer.querySelector('#ff-close-notes')
    closeButton?.addEventListener('click', () => this.hideNotesOverlay())
  }

  private renderNotesList(): string {
    const notes = this.getAllNotes()
    
    if (notes.length === 0) {
      return '<div style="color: #9ca3af; text-align: center; padding: 20px; font-size: 14px;">No notes for this video yet</div>'
    }

    return notes.map(note => {
      const category = this.defaultCategories.find(cat => cat.id === note.type)
      const timeString = this.ui.formatTime(note.timestamp)
      
      return `
        <div class="ff-note-item" data-timestamp="${note.timestamp}" style="
          margin-bottom: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-left: 3px solid ${category?.color || '#6b7280'};
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s ease;
        ">
          <div style="
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 6px;
          ">
            <span style="color: ${category?.color || '#6b7280'}; font-size: 12px; font-weight: 600;">
              ${category?.icon || '📝'} ${timeString}
            </span>
            <span style="color: #9ca3af; font-size: 10px;">
              ${note.type}
            </span>
          </div>
          <div style="color: white; font-size: 13px; line-height: 1.4;">
            ${note.content}
          </div>
          ${note.tags ? `<div style="margin-top: 6px;">
            ${note.tags.map(tag => `<span style="
              background: rgba(59, 130, 246, 0.2); 
              color: #60a5fa; 
              font-size: 10px; 
              padding: 2px 6px; 
              border-radius: 3px; 
              margin-right: 4px;
            ">#${tag}</span>`).join('')}
          </div>` : ''}
        </div>
      `
    }).join('')
  }

  private hideNotesOverlay(): void {
    if (this.notesContainer) {
      this.notesContainer.remove()
      this.notesContainer = null
    }
  }

  // Cleanup
  public destroy(): void {
    if (this.activeSession) {
      this.endNotesSession()
    }
    
    this.hideNoteInput()
    this.hideNotesOverlay()
    this.currentVideoNotes = null
  }
}
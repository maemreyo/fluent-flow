// FluentFlow Loop State Machine - Single Source of Truth
// Manages all loop states with clear transitions and no conflicts

export type LoopStateType = 
  | 'idle'           // No loop configured
  | 'setting-start'  // User is setting start point
  | 'setting-end'    // User is setting end point  
  | 'configured'     // Loop is set up but not active
  | 'active'         // Loop is currently running
  | 'paused'         // Loop is configured but temporarily paused

export interface LoopStateData {
  startTime: number | null
  endTime: number | null
  title?: string
}

export interface LoopStateContext {
  state: LoopStateType
  data: LoopStateData
  canTransitionTo: (newState: LoopStateType) => boolean
  transition: (newState: LoopStateType, data?: Partial<LoopStateData>) => void
}

export class LoopStateMachine {
  private currentState: LoopStateType = 'idle'
  private stateData: LoopStateData = { startTime: null, endTime: null }
  private listeners: Array<(context: LoopStateContext) => void> = []

  // Valid state transitions - Made more flexible for user scenarios
  private readonly validTransitions: Record<LoopStateType, LoopStateType[]> = {
    'idle': ['idle', 'setting-start', 'setting-end', 'configured'], // Allow self-transitions
    'setting-start': ['idle', 'setting-start', 'setting-end', 'configured'],
    'setting-end': ['idle', 'setting-start', 'setting-end', 'configured'], 
    'configured': ['idle', 'active', 'setting-start', 'setting-end', 'configured'], // Allow self-updates
    'active': ['idle', 'paused', 'configured', 'active'], // Allow self-transitions
    'paused': ['idle', 'active', 'configured', 'paused']
  }

  public getContext(): LoopStateContext {
    return {
      state: this.currentState,
      data: { ...this.stateData },
      canTransitionTo: (newState) => this.canTransitionTo(newState),
      transition: (newState, data) => this.transition(newState, data)
    }
  }

  public canTransitionTo(newState: LoopStateType): boolean {
    return this.validTransitions[this.currentState].includes(newState)
  }

  public transition(newState: LoopStateType, data?: Partial<LoopStateData>): boolean {
    console.log(`FluentFlow State: ${this.currentState} → ${newState}`, data)

    if (!this.canTransitionTo(newState)) {
      console.warn(`FluentFlow: Invalid transition from ${this.currentState} to ${newState}`)
      return false
    }

    const oldState = this.currentState
    this.currentState = newState

    // Update data if provided
    if (data) {
      this.stateData = { ...this.stateData, ...data }
    }

    // Validate state data consistency
    this.validateStateData()

    // Notify listeners
    this.notifyListeners()

    console.log(`FluentFlow State: Transitioned from ${oldState} to ${newState}`, this.stateData)
    return true
  }

  private validateStateData(): void {
    switch (this.currentState) {
      case 'idle':
        // Clear all data when idle
        this.stateData = { startTime: null, endTime: null }
        break
      
      case 'configured':
      case 'active':
      case 'paused':
        // These states require both start and end times
        if (this.stateData.startTime === null || this.stateData.endTime === null) {
          console.warn('FluentFlow: State requires both start and end times, falling back to idle')
          this.currentState = 'idle'
          this.stateData = { startTime: null, endTime: null }
        }
        break
    }
  }

  public subscribe(listener: (context: LoopStateContext) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    const context = this.getContext()
    this.listeners.forEach(listener => {
      try {
        listener(context)
      } catch (error) {
        console.error('FluentFlow: Error in state listener:', error)
      }
    })
  }

  // Convenience methods
  public isIdle(): boolean { return this.currentState === 'idle' }
  public isSettingStart(): boolean { return this.currentState === 'setting-start' }
  public isSettingEnd(): boolean { return this.currentState === 'setting-end' }
  public isConfigured(): boolean { return this.currentState === 'configured' }
  public isActive(): boolean { return this.currentState === 'active' }
  public isPaused(): boolean { return this.currentState === 'paused' }
  public isLooping(): boolean { return this.currentState === 'active' }
  public hasLoop(): boolean { 
    return ['configured', 'active', 'paused'].includes(this.currentState)
  }

  // Reset to initial state
  public reset(): void {
    this.transition('idle')
  }
}
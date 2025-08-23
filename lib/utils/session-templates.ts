// Session Templates - Business Logic Layer
// Following SoC: Pure functions for template management and session planning

export interface SessionTemplate {
  id: string
  name: string
  description: string
  type: 'pronunciation' | 'listening' | 'vocabulary' | 'conversation' | 'mixed'
  duration: number // in minutes
  steps: SessionStep[]
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  createdAt: Date
  isDefault: boolean
  usageCount: number
  lastUsed?: Date
}

export interface SessionStep {
  id: string
  type: 'loop_practice' | 'recording' | 'comparison' | 'note_taking' | 'vocabulary'
  title: string
  description: string
  duration: number // in minutes
  settings: StepSettings
  order: number
}

export interface StepSettings {
  // Loop practice settings
  loopCount?: number
  playbackSpeed?: number
  
  // Recording settings
  recordingDuration?: number
  maxAttempts?: number
  
  // Comparison settings
  comparisonMode?: 'alternating' | 'side_by_side'
  
  // Note taking settings
  notePrompts?: string[]
  
  // Vocabulary settings
  focusWords?: string[]
  contextSentences?: boolean
}

export interface SessionPlan {
  templateId: string
  videoId: string
  videoTitle: string
  startTime: number
  endTime: number
  currentStep: number
  completedSteps: string[]
  notes: string
  vocabulary: string[]
  createdAt: Date
  estimatedCompletion: Date
}

/**
 * Default session templates for common practice patterns
 */
export function getDefaultTemplates(): SessionTemplate[] {
  return [
    {
      id: 'pronunciation_focus',
      name: 'Pronunciation Focus',
      description: 'Intensive pronunciation practice with recording and comparison',
      type: 'pronunciation',
      duration: 15,
      difficulty: 'beginner',
      isDefault: true,
      usageCount: 0,
      createdAt: new Date(),
      tags: ['pronunciation', 'speaking', 'accent'],
      steps: [
        {
          id: 'listen_loop',
          type: 'loop_practice',
          title: 'Listen & Repeat',
          description: 'Listen to the segment 3-5 times to understand rhythm and intonation',
          duration: 5,
          order: 1,
          settings: {
            loopCount: 5,
            playbackSpeed: 0.8
          }
        },
        {
          id: 'record_practice',
          type: 'recording',
          title: 'Record Your Attempt',
          description: 'Record yourself speaking the segment',
          duration: 5,
          order: 2,
          settings: {
            recordingDuration: 30,
            maxAttempts: 3
          }
        },
        {
          id: 'compare_audio',
          type: 'comparison',
          title: 'Compare & Improve',
          description: 'Compare your recording with the original',
          duration: 5,
          order: 3,
          settings: {
            comparisonMode: 'alternating'
          }
        }
      ]
    },
    {
      id: 'listening_comprehension',
      name: 'Listening Comprehension',
      description: 'Focus on understanding and note-taking',
      type: 'listening',
      duration: 20,
      difficulty: 'intermediate',
      isDefault: true,
      usageCount: 0,
      createdAt: new Date(),
      tags: ['listening', 'comprehension', 'notes'],
      steps: [
        {
          id: 'initial_listen',
          type: 'loop_practice',
          title: 'Initial Listen',
          description: 'Listen without pausing to get general understanding',
          duration: 5,
          order: 1,
          settings: {
            loopCount: 2,
            playbackSpeed: 1.0
          }
        },
        {
          id: 'detailed_notes',
          type: 'note_taking',
          title: 'Detailed Notes',
          description: 'Take notes on key vocabulary and phrases',
          duration: 10,
          order: 2,
          settings: {
            notePrompts: [
              'What are the main topics discussed?',
              'List new vocabulary words',
              'Note interesting expressions or phrases'
            ]
          }
        },
        {
          id: 'vocabulary_focus',
          type: 'vocabulary',
          title: 'Vocabulary Practice',
          description: 'Focus on new words and their context',
          duration: 5,
          order: 3,
          settings: {
            contextSentences: true
          }
        }
      ]
    },
    {
      id: 'conversation_prep',
      name: 'Conversation Preparation',
      description: 'Prepare for real conversations with varied practice',
      type: 'conversation',
      duration: 25,
      difficulty: 'advanced',
      isDefault: true,
      usageCount: 0,
      createdAt: new Date(),
      tags: ['conversation', 'speaking', 'fluency'],
      steps: [
        {
          id: 'listen_analysis',
          type: 'loop_practice',
          title: 'Analyze Speech Patterns',
          description: 'Study natural speech rhythm and intonation',
          duration: 5,
          order: 1,
          settings: {
            loopCount: 3,
            playbackSpeed: 1.0
          }
        },
        {
          id: 'shadow_practice',
          type: 'recording',
          title: 'Shadow Speaking',
          description: 'Speak along with the audio for fluency',
          duration: 8,
          order: 2,
          settings: {
            recordingDuration: 60,
            maxAttempts: 5
          }
        },
        {
          id: 'vocabulary_extraction',
          type: 'vocabulary',
          title: 'Extract Key Vocabulary',
          description: 'Identify and practice key conversational phrases',
          duration: 7,
          order: 3,
          settings: {
            focusWords: [],
            contextSentences: true
          }
        },
        {
          id: 'final_comparison',
          type: 'comparison',
          title: 'Final Assessment',
          description: 'Compare your final attempt with original',
          duration: 5,
          order: 4,
          settings: {
            comparisonMode: 'side_by_side'
          }
        }
      ]
    }
  ]
}

/**
 * Calculates estimated completion time for a template
 */
export function calculateTemplateCompletion(template: SessionTemplate, startTime: Date): Date {
  const totalMinutes = template.steps.reduce((acc, step) => acc + step.duration, 0)
  return new Date(startTime.getTime() + totalMinutes * 60 * 1000)
}

/**
 * Validates if a session plan is complete
 */
export function isSessionComplete(plan: SessionPlan, template: SessionTemplate): boolean {
  return plan.completedSteps.length === template.steps.length
}

/**
 * Gets the next step in a session plan
 */
export function getNextStep(plan: SessionPlan, template: SessionTemplate): SessionStep | null {
  const currentStepIndex = plan.currentStep
  if (currentStepIndex >= template.steps.length) {
    return null
  }
  return template.steps[currentStepIndex]
}

/**
 * Calculates session progress percentage
 */
export function calculateSessionProgress(plan: SessionPlan, template: SessionTemplate): number {
  return (plan.completedSteps.length / template.steps.length) * 100
}

/**
 * Suggests templates based on user's practice history
 */
export function suggestTemplates(practiceData: {
  totalSessions: number
  avgSessionTime: number
  recordingCount: number
  mostPracticedType: string
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
}): SessionTemplate[] {
  const templates = getDefaultTemplates()
  
  // Filter by skill level
  const levelTemplates = templates.filter(t => t.difficulty === practiceData.skillLevel)
  
  // Sort by relevance
  return levelTemplates.sort((a, b) => {
    // Prioritize templates matching most practiced type
    if (a.type === practiceData.mostPracticedType && b.type !== practiceData.mostPracticedType) {
      return -1
    }
    if (b.type === practiceData.mostPracticedType && a.type !== practiceData.mostPracticedType) {
      return 1
    }
    
    // Prioritize duration matching average session time
    const aDiff = Math.abs(a.duration - practiceData.avgSessionTime)
    const bDiff = Math.abs(b.duration - practiceData.avgSessionTime)
    return aDiff - bDiff
  })
}

/**
 * Creates a custom template from user input
 */
export function createCustomTemplate(
  name: string,
  description: string,
  type: SessionTemplate['type'],
  steps: Omit<SessionStep, 'id' | 'order'>[],
  difficulty: SessionTemplate['difficulty'] = 'intermediate'
): SessionTemplate {
  const orderedSteps: SessionStep[] = steps.map((step, index) => ({
    ...step,
    id: `step_${Date.now()}_${index}`,
    order: index + 1
  }))

  return {
    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    type,
    duration: orderedSteps.reduce((acc, step) => acc + step.duration, 0),
    steps: orderedSteps,
    tags: [type],
    difficulty,
    createdAt: new Date(),
    isDefault: false,
    usageCount: 0
  }
}

/**
 * Updates template usage statistics
 */
export function updateTemplateUsage(template: SessionTemplate): SessionTemplate {
  return {
    ...template,
    usageCount: template.usageCount + 1,
    lastUsed: new Date()
  }
}
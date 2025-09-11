'use client'

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

interface TourStep {
  element: string
  popover: {
    title: string
    description: string
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
  }
}

interface UseHighlightTourOptions {
  steps: TourStep[]
  enabled: boolean
  onComplete?: () => void
}

export function useHighlightTour({ steps, enabled, onComplete }: UseHighlightTourOptions) {
  useEffect(() => {
    if (!enabled || steps.length === 0) return

    // Wait a bit for DOM to render
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        steps: steps.map(step => ({
          ...step,
          popover: {
            ...step.popover,
            side: step.popover.side || 'bottom',
            align: step.popover.align || 'start',
          }
        })),
        onDestroyed: () => {
          onComplete?.()
        }
      })

      driverObj.drive()
    }, 500)

    return () => clearTimeout(timer)
  }, [enabled, steps, onComplete])
}

// Preset tours for common scenarios
export const PRACTICE_TOUR_STEPS: TourStep[] = [
  {
    element: '[data-tour="practice-button"]',
    popover: {
      title: 'Practice Solo',
      description: 'Click here to start individual practice session with this loop',
      side: 'top'
    }
  },
  {
    element: '[data-tour="group-session-button"]', 
    popover: {
      title: 'Group Session',
      description: 'Create a group study session to practice with friends',
      side: 'top'
    }
  }
]
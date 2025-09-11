'use client'

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '../styles/driver-custom.css'

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
  storageKey?: string
  forceShow?: boolean
}

export function useHighlightTour({ steps, enabled, onComplete, storageKey = 'fluent-flow-tour-shown', forceShow = false }: UseHighlightTourOptions) {
  useEffect(() => {
    if (!enabled || steps.length === 0) return

    // Check if tour has been shown before (unless forceShow is true)
    if (!forceShow) {
      const tourShown = localStorage.getItem(storageKey)
      if (tourShown === 'true') return
    }

    // Wait a bit for DOM to render
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        progressText: 'Step {{current}} of {{total}}',
        nextBtnText: 'Next →',
        prevBtnText: '← Previous',
        doneBtnText: 'Got it!',
        showButtons: ['next', 'previous', 'close'],
        disableActiveInteraction: false,
        allowClose: true,
        smoothScroll: true,
        animate: true,
        popoverClass: 'fluent-flow-tour',
        steps: steps.map(step => ({
          ...step,
          popover: {
            ...step.popover,
            side: step.popover.side || 'bottom',
            align: step.popover.align || 'start',
          }
        })),
        onDestroyed: (element, step, options) => {
          // Mark tour as shown when destroyed (either completed or closed)
          localStorage.setItem(storageKey, 'true')
          onComplete?.()
        },
        onHighlighted: (element) => {
          // Add custom highlight animation
          if (element && 'style' in element) {
            (element as HTMLElement).style.transition = 'all 0.3s ease'
          }
        }
      })

      driverObj.drive()
    }, 500)

    return () => clearTimeout(timer)
  }, [enabled, steps, onComplete, storageKey, forceShow])
}

// Function to manually trigger a tour
export function startTour(steps: TourStep[], options?: { storageKey?: string }) {
  const { storageKey = 'fluent-flow-tour-shown' } = options || {}
  
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: '→',
    prevBtnText: '←',
    doneBtnText: 'Got it!',
    showButtons: ['next', 'previous', 'close'],
    disableActiveInteraction: false,
    allowClose: true,
    smoothScroll: true,
    animate: true,
    popoverClass: 'fluent-flow-tour',
    steps: steps.map(step => ({
      ...step,
      popover: {
        ...step.popover,
        side: step.popover.side || 'bottom',
        align: step.popover.align || 'start',
      }
    })),
    onDestroyed: () => {
      // Mark tour as shown when destroyed (either completed or closed)
      localStorage.setItem(storageKey, 'true')
    },
    onHighlighted: (element) => {
      // Add custom highlight animation
      if (element && 'style' in element) {
        (element as HTMLElement).style.transition = 'all 0.3s ease'
      }
    }
  })

  driverObj.drive()
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
      title: 'Study Together',
      description: 'Create a group study session to practice with friends',
      side: 'top'
    }
  }
]
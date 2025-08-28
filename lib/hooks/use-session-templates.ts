import { useState, useEffect } from 'react'
import { sessionTemplatesService } from '../services/session-templates-service'
import type { SessionTemplate, SessionPlan } from '../utils/session-templates'

/**
 * Custom hook for managing session templates and active plans
 */
export function useSessionTemplates(allSessions: any[], currentVideo: any) {
  const [templates, setTemplates] = useState<SessionTemplate[]>([])
  const [activePlans, setActivePlans] = useState<(SessionPlan & { id: string })[]>([])
  const [completedPlans, setCompletedPlans] = useState<(SessionPlan & { id: string })[]>([])

  const loadTemplates = async () => {
    try {
      const userTemplates = await sessionTemplatesService.getTemplates()
      setTemplates(userTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadSessionPlans = async () => {
    try {
      const active = await sessionTemplatesService.getActiveSessionPlans()
      const completed = await sessionTemplatesService.getCompletedSessionPlans()
      setActivePlans(active)
      setCompletedPlans(completed)
    } catch (error) {
      console.error('Failed to load session plans:', error)
    }
  }

  const handleStartSession = async (templateId: string) => {
    if (!currentVideo) {
      alert('Please select a YouTube video first')
      return
    }

    try {
      const planId = await sessionTemplatesService.createSessionPlan(
        templateId,
        currentVideo.videoId,
        currentVideo.title,
        0, // Start time
        currentVideo.duration || 300 // End time or default 5 minutes
      )
      await loadSessionPlans()
      console.log('Session plan created:', planId)
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handleContinueSession = async (planId: string) => {
    try {
      const plans = await sessionTemplatesService.getSessionPlans()
      const plan = plans.find(p => p.id === planId)

      if (plan && currentVideo?.videoId === plan.videoId) {
        // Continue current session
        console.log('Continuing session:', planId)
      } else if (plan) {
        // Navigate to video for this session
        const videoUrl = `https://www.youtube.com/watch?v=${plan.videoId}&t=${plan.startTime}s`
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { url: videoUrl })
        }
      }
    } catch (error) {
      console.error('Failed to continue session:', error)
    }
  }

  const handleCreateTemplate = () => {
    // TODO: Implement template creation modal
    console.log('Create template requested')
  }

  const handleViewPlan = (planId: string) => {
    // TODO: Implement plan details modal
    console.log('View plan requested:', planId)
  }

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  // Update session plans when session data changes
  useEffect(() => {
    loadSessionPlans()
  }, [allSessions])

  return {
    templates,
    activePlans,
    completedPlans,
    handleStartSession,
    handleContinueSession,
    handleCreateTemplate,
    handleViewPlan,
    loadTemplates,
    loadSessionPlans
  }
}
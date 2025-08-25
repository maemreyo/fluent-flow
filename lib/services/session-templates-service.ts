// Session Templates Service - Data Layer
// Following SoC: Handles data persistence and retrieval for session templates

import {
  calculateTemplateCompletion,
  getDefaultTemplates,
  updateTemplateUsage,
  type SessionPlan,
  type SessionTemplate
} from '../utils/session-templates'

export class SessionTemplatesService {
  private readonly templatesKey = 'fluent_flow_session_templates'
  private readonly plansKey = 'fluent_flow_session_plans'

  /**
   * Retrieves all session templates from storage
   */
  async getTemplates(): Promise<SessionTemplate[]> {
    try {
      const result = await chrome.storage.local.get([this.templatesKey])
      const templatesData = result[this.templatesKey]

      if (!templatesData || templatesData.length === 0) {
        // Initialize with default templates
        const defaultTemplates = getDefaultTemplates()
        await this.saveTemplates(defaultTemplates)
        return defaultTemplates
      }

      // Parse dates back from JSON
      return templatesData.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        lastUsed: template.lastUsed ? new Date(template.lastUsed) : undefined
      }))
    } catch (error) {
      console.error('Failed to load templates:', error)
      return getDefaultTemplates()
    }
  }

  /**
   * Saves templates to storage
   */
  async saveTemplates(templates: SessionTemplate[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.templatesKey]: templates
      })
    } catch (error) {
      console.error('Failed to save templates:', error)
      throw new Error('Failed to save templates to storage')
    }
  }

  /**
   * Creates a new custom template
   */
  async createTemplate(
    templateData: Omit<SessionTemplate, 'id' | 'createdAt' | 'usageCount' | 'isDefault'>
  ): Promise<string> {
    const templates = await this.getTemplates()

    const newTemplate: SessionTemplate = {
      ...templateData,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      usageCount: 0,
      isDefault: false
    }

    templates.push(newTemplate)
    await this.saveTemplates(templates)

    return newTemplate.id
  }

  /**
   * Updates an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<SessionTemplate>): Promise<boolean> {
    try {
      const templates = await this.getTemplates()
      const templateIndex = templates.findIndex(t => t.id === templateId)

      if (templateIndex === -1) {
        return false
      }

      templates[templateIndex] = { ...templates[templateIndex], ...updates }
      await this.saveTemplates(templates)
      return true
    } catch (error) {
      console.error('Failed to update template:', error)
      return false
    }
  }

  /**
   * Deletes a template (cannot delete default templates)
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const templates = await this.getTemplates()
      const template = templates.find(t => t.id === templateId)

      if (!template || template.isDefault) {
        return false // Cannot delete default templates
      }

      const filteredTemplates = templates.filter(t => t.id !== templateId)
      await this.saveTemplates(filteredTemplates)
      return true
    } catch (error) {
      console.error('Failed to delete template:', error)
      return false
    }
  }

  /**
   * Records template usage and updates statistics
   */
  async recordTemplateUsage(templateId: string): Promise<void> {
    try {
      const templates = await this.getTemplates()
      const templateIndex = templates.findIndex(t => t.id === templateId)

      if (templateIndex !== -1) {
        templates[templateIndex] = updateTemplateUsage(templates[templateIndex])
        await this.saveTemplates(templates)
      }
    } catch (error) {
      console.error('Failed to record template usage:', error)
    }
  }

  /**
   * Creates a session plan from a template
   */
  async createSessionPlan(
    templateId: string,
    videoId: string,
    videoTitle: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    try {
      const templates = await this.getTemplates()
      const template = templates.find(t => t.id === templateId)

      if (!template) {
        throw new Error('Template not found')
      }

      const plans = await this.getSessionPlans()
      const now = new Date()

      const newPlan: SessionPlan = {
        templateId,
        videoId,
        videoTitle,
        startTime,
        endTime,
        currentStep: 0,
        completedSteps: [],
        notes: '',
        vocabulary: [],
        createdAt: now,
        estimatedCompletion: calculateTemplateCompletion(template, now)
      }

      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      plans.push({ ...newPlan, id: planId })
      await this.saveSessionPlans(plans)

      // Record template usage
      await this.recordTemplateUsage(templateId)

      return planId
    } catch (error) {
      console.error('Failed to create session plan:', error)
      throw new Error('Failed to create session plan')
    }
  }

  /**
   * Retrieves all session plans from storage
   */
  async getSessionPlans(): Promise<(SessionPlan & { id: string })[]> {
    try {
      const result = await chrome.storage.local.get([this.plansKey])
      const plansData = result[this.plansKey]

      if (!plansData) return []

      // Parse dates back from JSON
      return plansData.map((plan: any) => ({
        ...plan,
        createdAt: new Date(plan.createdAt),
        estimatedCompletion: new Date(plan.estimatedCompletion)
      }))
    } catch (error) {
      console.error('Failed to load session plans:', error)
      return []
    }
  }

  /**
   * Saves session plans to storage
   */
  async saveSessionPlans(plans: (SessionPlan & { id: string })[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.plansKey]: plans
      })
    } catch (error) {
      console.error('Failed to save session plans:', error)
      throw new Error('Failed to save session plans to storage')
    }
  }

  /**
   * Updates session plan progress
   */
  async updateSessionPlan(planId: string, updates: Partial<SessionPlan>): Promise<boolean> {
    try {
      const plans = await this.getSessionPlans()
      const planIndex = plans.findIndex(p => p.id === planId)

      if (planIndex === -1) {
        return false
      }

      plans[planIndex] = { ...plans[planIndex], ...updates }
      await this.saveSessionPlans(plans)
      return true
    } catch (error) {
      console.error('Failed to update session plan:', error)
      return false
    }
  }

  /**
   * Gets active (incomplete) session plans
   */
  async getActiveSessionPlans(): Promise<(SessionPlan & { id: string })[]> {
    const allPlans = await this.getSessionPlans()
    const templates = await this.getTemplates()

    return allPlans.filter(plan => {
      const template = templates.find(t => t.id === plan.templateId)
      return template && plan.completedSteps.length < template.steps.length
    })
  }

  /**
   * Gets completed session plans for history tracking
   */
  async getCompletedSessionPlans(): Promise<(SessionPlan & { id: string })[]> {
    const allPlans = await this.getSessionPlans()
    const templates = await this.getTemplates()

    return allPlans
      .filter(plan => {
        const template = templates.find(t => t.id === plan.templateId)
        return template && plan.completedSteps.length === template.steps.length
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Deletes a session plan
   */
  async deleteSessionPlan(planId: string): Promise<boolean> {
    try {
      const plans = await this.getSessionPlans()
      const filteredPlans = plans.filter(p => p.id !== planId)

      if (filteredPlans.length === plans.length) {
        return false // Plan not found
      }

      await this.saveSessionPlans(filteredPlans)
      return true
    } catch (error) {
      console.error('Failed to delete session plan:', error)
      return false
    }
  }

  /**
   * Gets templates filtered by type and difficulty
   */
  async getFilteredTemplates(filters: {
    type?: SessionTemplate['type']
    difficulty?: SessionTemplate['difficulty']
    tags?: string[]
  }): Promise<SessionTemplate[]> {
    const templates = await this.getTemplates()

    return templates.filter(template => {
      if (filters.type && template.type !== filters.type) return false
      if (filters.difficulty && template.difficulty !== filters.difficulty) return false
      if (filters.tags && !filters.tags.some(tag => template.tags.includes(tag))) return false
      return true
    })
  }
}

// Singleton instance
export const sessionTemplatesService = new SessionTemplatesService()

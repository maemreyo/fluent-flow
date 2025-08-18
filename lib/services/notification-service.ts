import { STORAGE_KEYS } from '../utils/constants'
import { errorService } from './error-service'
import { logger } from './logger-service'

export interface ChromeNotificationData {
  id: string
  title: string
  message: string
  type: 'basic' | 'image' | 'list' | 'progress'
  priority: 'low' | 'normal' | 'high' | 'critical'
  iconUrl?: string
  imageUrl?: string
  items?: Array<{ title: string; message: string }>
  progress?: number
  buttons?: Array<{ title: string; action: string }>
  timestamp: number
  persistent?: boolean
  silent?: boolean
  requireInteraction?: boolean
  contextMessage?: string
  eventTime?: number
  tag?: string
  data?: any
}

export interface NotificationConfig {
  enabled: boolean
  showInBrowser: boolean
  playSound: boolean
  showBadge: boolean
  maxNotifications: number
  defaultIcon: string
  autoCloseDelay: number // milliseconds, 0 = no auto close
  enableActionButtons: boolean
}

export interface NotificationHistory {
  id: string
  notification: ChromeNotificationData
  shown: boolean
  clicked: boolean
  dismissed: boolean
  buttonClicked?: string
  shownAt?: number
  clickedAt?: number
  dismissedAt?: number
}

export class NotificationService {
  private config: NotificationConfig
  private activeNotifications: Set<string> = new Set()
  private notificationHistory: NotificationHistory[] = []

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: true,
      showInBrowser: true,
      playSound: false,
      showBadge: true,
      maxNotifications: 50,
      defaultIcon: '/icons/icon-48.png',
      autoCloseDelay: 5000,
      enableActionButtons: true,
      ...config
    }

    this.initializeNotificationHandlers()
    this.loadHistory()
  }

  private initializeNotificationHandlers(): void {
    if (!this.config.enabled || typeof chrome === 'undefined') return

    try {
      // Handle notification clicks
      chrome.notifications?.onClicked?.addListener((notificationId) => {
        this.handleNotificationClick(notificationId)
      })

      // Handle notification button clicks
      chrome.notifications?.onButtonClicked?.addListener((notificationId, buttonIndex) => {
        this.handleButtonClick(notificationId, buttonIndex)
      })

      // Handle notification close
      chrome.notifications?.onClosed?.addListener((notificationId, byUser) => {
        this.handleNotificationClose(notificationId, byUser)
      })

      logger.info('Notification handlers initialized', 'NotificationService')
    } catch (error) {
      errorService.reportError(
        error as Error,
        'NotificationService initialization',
        { config: this.config }
      )
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.NOTIFICATIONS)
      this.notificationHistory = result[STORAGE_KEYS.NOTIFICATIONS] || []
      
      // Clean old history (keep last 100 notifications)
      if (this.notificationHistory.length > this.config.maxNotifications) {
        this.notificationHistory = this.notificationHistory
          .sort((a, b) => (b.shownAt || 0) - (a.shownAt || 0))
          .slice(0, this.config.maxNotifications)
        
        await this.saveHistory()
      }
    } catch (error) {
      logger.error('Failed to load notification history', 'NotificationService', error)
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.NOTIFICATIONS]: this.notificationHistory
      })
    } catch (error) {
      logger.error('Failed to save notification history', 'NotificationService', error)
    }
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private createChromeNotificationOptions(data: ChromeNotificationData): chrome.notifications.NotificationOptions {
    const options: chrome.notifications.NotificationOptions = {
      type: data.type as chrome.notifications.TemplateType,
      iconUrl: data.iconUrl || this.config.defaultIcon,
      title: data.title,
      message: data.message,
      contextMessage: data.contextMessage,
      priority: this.mapPriority(data.priority),
      eventTime: data.eventTime,
      silent: data.silent,
      requireInteraction: data.requireInteraction
    }

    if (data.type === 'image' && data.imageUrl) {
      options.imageUrl = data.imageUrl
    }

    if (data.type === 'list' && data.items) {
      options.items = data.items
    }

    if (data.type === 'progress' && data.progress !== undefined) {
      options.progress = Math.max(0, Math.min(100, data.progress))
    }

    if (this.config.enableActionButtons && data.buttons) {
      options.buttons = data.buttons.map(btn => ({ title: btn.title }))
    }

    return options
  }

  private mapPriority(priority: ChromeNotificationData['priority']): number {
    const priorityMap = { low: -1, normal: 0, high: 1, critical: 2 }
    return priorityMap[priority] || 0
  }

  private async handleNotificationClick(notificationId: string): Promise<void> {
    try {
      const historyItem = this.notificationHistory.find(item => item.id === notificationId)
      if (historyItem) {
        historyItem.clicked = true
        historyItem.clickedAt = Date.now()
        await this.saveHistory()
        
        logger.info('Notification clicked', 'NotificationService', { notificationId })
        
        // Handle custom data if present
        if (historyItem.notification.data?.action) {
          await this.executeAction(historyItem.notification.data.action, historyItem.notification.data)
        }
      }
    } catch (error) {
      errorService.reportError(error as Error, 'Notification click handling')
    }
  }

  private async handleButtonClick(notificationId: string, buttonIndex: number): Promise<void> {
    try {
      const historyItem = this.notificationHistory.find(item => item.id === notificationId)
      if (historyItem && historyItem.notification.buttons) {
        const button = historyItem.notification.buttons[buttonIndex]
        if (button) {
          historyItem.buttonClicked = button.action
          await this.saveHistory()
          
          logger.info('Notification button clicked', 'NotificationService', { 
            notificationId, 
            buttonIndex, 
            action: button.action 
          })
          
          await this.executeAction(button.action, historyItem.notification.data)
        }
      }
    } catch (error) {
      errorService.reportError(error as Error, 'Notification button click handling')
    }
  }

  private async handleNotificationClose(notificationId: string, byUser: boolean): Promise<void> {
    try {
      this.activeNotifications.delete(notificationId)
      
      const historyItem = this.notificationHistory.find(item => item.id === notificationId)
      if (historyItem) {
        historyItem.dismissed = true
        historyItem.dismissedAt = Date.now()
        await this.saveHistory()
        
        logger.debug('Notification closed', 'NotificationService', { 
          notificationId, 
          byUser 
        })
      }
    } catch (error) {
      errorService.reportError(error as Error, 'Notification close handling')
    }
  }

  private async executeAction(action: string, data?: any): Promise<void> {
    try {
      switch (action) {
        case 'open_options':
          await chrome.runtime.openOptionsPage()
          break
        case 'open_popup':
          // Trigger popup opening - implementation depends on your popup logic
          logger.info('Popup open action triggered', 'NotificationService')
          break
        case 'open_sidepanel':
          if (chrome.sidePanel) {
            await chrome.sidePanel.open({ tabId: data?.tabId })
          }
          break
        case 'open_url':
          if (data?.url) {
            await chrome.tabs.create({ url: data.url })
          }
          break
        default:
          logger.warn('Unknown notification action', 'NotificationService', { action, data })
      }
    } catch (error) {
      errorService.reportError(error as Error, 'Notification action execution', { action, data })
    }
  }

  private async updateBadge(count?: number): Promise<void> {
    if (!this.config.showBadge) return

    try {
      const badgeCount = count !== undefined ? count : this.activeNotifications.size
      const badgeText = badgeCount > 0 ? badgeCount.toString() : ''
      
      await chrome.action?.setBadgeText({ text: badgeText })
      await chrome.action?.setBadgeBackgroundColor({ color: '#ff4444' })
    } catch (error) {
      logger.warn('Failed to update badge', 'NotificationService', error)
    }
  }

  // Public methods
  async show(notificationData: Partial<ChromeNotificationData>): Promise<string> {
    if (!this.config.enabled) {
      logger.debug('Notifications disabled', 'NotificationService')
      return ''
    }

    try {
      const notification: ChromeNotificationData = {
        id: this.generateNotificationId(),
        title: 'Extension Notification',
        message: 'No message provided',
        type: 'basic',
        priority: 'normal',
        timestamp: Date.now(),
        ...notificationData
      }

      if (this.config.showInBrowser && chrome.notifications) {
        const options = this.createChromeNotificationOptions(notification)
        
        chrome.notifications.create(notification.id, options as any)
        this.activeNotifications.add(notification.id)
        
        // Auto-close if configured
        if (this.config.autoCloseDelay > 0 && !notification.persistent) {
          setTimeout(() => {
            this.close(notification.id)
          }, this.config.autoCloseDelay)
        }
      }

      // Add to history
      const historyItem: NotificationHistory = {
        id: notification.id,
        notification,
        shown: true,
        clicked: false,
        dismissed: false,
        shownAt: Date.now()
      }
      
      this.notificationHistory.unshift(historyItem)
      await this.saveHistory()
      await this.updateBadge()

      logger.info('Notification shown', 'NotificationService', { 
        id: notification.id, 
        title: notification.title 
      })

      return notification.id
    } catch (error) {
      errorService.reportError(error as Error, 'Show notification', notificationData)
      return ''
    }
  }

  async close(notificationId: string): Promise<boolean> {
    try {
      if (chrome.notifications) {
        await chrome.notifications.clear(notificationId)
      }
      
      this.activeNotifications.delete(notificationId)
      await this.updateBadge()
      
      logger.debug('Notification closed', 'NotificationService', { notificationId })
      return true
    } catch (error) {
      errorService.reportError(error as Error, 'Close notification', { notificationId })
      return false
    }
  }

  async closeAll(): Promise<void> {
    try {
      if (chrome.notifications) {
        chrome.notifications.getAll((notifications) => {
          Object.keys(notifications).forEach(id => {
            chrome.notifications.clear(id)
          })
        })
      }
      
      this.activeNotifications.clear()
      await this.updateBadge(0)
      
      logger.info('All notifications closed', 'NotificationService')
    } catch (error) {
      errorService.reportError(error as Error, 'Close all notifications')
    }
  }

  async update(notificationId: string, updates: Partial<ChromeNotificationData>): Promise<boolean> {
    try {
      const historyItem = this.notificationHistory.find(item => item.id === notificationId)
      if (!historyItem) {
        return false
      }

      // Update the stored notification data
      Object.assign(historyItem.notification, updates)
      
      // Update the Chrome notification if it's still active
      if (this.activeNotifications.has(notificationId) && chrome.notifications) {
        const options = this.createChromeNotificationOptions(historyItem.notification)
        await chrome.notifications.update(notificationId, options)
      }
      
      await this.saveHistory()
      
      logger.debug('Notification updated', 'NotificationService', { notificationId, updates })
      return true
    } catch (error) {
      errorService.reportError(error as Error, 'Update notification', { notificationId, updates })
      return false
    }
  }

  // Convenience methods for common notification types
  async showInfo(title: string, message: string, options?: Partial<ChromeNotificationData>): Promise<string> {
    return await this.show({
      title,
      message,
      type: 'basic',
      priority: 'normal',
      iconUrl: '/icons/info.png',
      ...options
    })
  }

  async showWarning(title: string, message: string, options?: Partial<ChromeNotificationData>): Promise<string> {
    return await this.show({
      title,
      message,
      type: 'basic',
      priority: 'high',
      iconUrl: '/icons/warning.png',
      requireInteraction: true,
      ...options
    })
  }

  async showError(title: string, message: string, options?: Partial<ChromeNotificationData>): Promise<string> {
    return await this.show({
      title,
      message,
      type: 'basic',
      priority: 'critical',
      iconUrl: '/icons/error.png',
      requireInteraction: true,
      persistent: true,
      ...options
    })
  }

  async showSuccess(title: string, message: string, options?: Partial<ChromeNotificationData>): Promise<string> {
    return await this.show({
      title,
      message,
      type: 'basic',
      priority: 'normal',
      iconUrl: '/icons/success.png',
      ...options
    })
  }

  // History and statistics
  async getHistory(limit: number = 20): Promise<NotificationHistory[]> {
    await this.loadHistory()
    return this.notificationHistory.slice(0, limit)
  }

  async getStats(): Promise<{
    total: number
    active: number
    clicked: number
    dismissed: number
    byPriority: Record<string, number>
    byType: Record<string, number>
  }> {
    await this.loadHistory()
    
    const stats = {
      total: this.notificationHistory.length,
      active: this.activeNotifications.size,
      clicked: 0,
      dismissed: 0,
      byPriority: {} as Record<string, number>,
      byType: {} as Record<string, number>
    }
    
    this.notificationHistory.forEach(item => {
      if (item.clicked) stats.clicked++
      if (item.dismissed) stats.dismissed++
      
      const priority = item.notification.priority
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
      
      const type = item.notification.type
      stats.byType[type] = (stats.byType[type] || 0) + 1
    })
    
    return stats
  }

  async clearHistory(): Promise<void> {
    try {
      this.notificationHistory = []
      await chrome.storage.local.remove(STORAGE_KEYS.NOTIFICATIONS)
      logger.info('Notification history cleared', 'NotificationService')
    } catch (error) {
      errorService.reportError(error as Error, 'Clear notification history')
    }
  }

  // Configuration methods
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Notification config updated', 'NotificationService', config)
  }

  getConfig(): NotificationConfig {
    return { ...this.config }
  }

  getActiveNotifications(): string[] {
    return Array.from(this.activeNotifications)
  }
}

// Create singleton instance
export const notificationService = new NotificationService()
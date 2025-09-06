interface NotificationService {
  sendGroupInvitation(params: {
    recipientEmail: string
    groupName: string
    inviterName: string
    inviteCode: string
    inviteUrl: string
    message?: string
  }): Promise<void>

  sendSessionNotification(params: {
    recipientEmails: string[]
    groupName: string
    sessionTitle: string
    sessionUrl: string
    scheduledAt?: string
  }): Promise<void>
}

// In-app notification implementation (stores notifications in database)
class InAppNotificationService implements NotificationService {
  async sendGroupInvitation(params: {
    recipientEmail: string
    groupName: string
    inviterName: string
    inviteCode: string
    inviteUrl: string
    message?: string
  }): Promise<void> {
    console.log('📧 Group Invitation Notification:', {
      to: params.recipientEmail,
      subject: `You're invited to join "${params.groupName}" on FluentFlow`,
      content: `${params.inviterName} has invited you to join the study group "${params.groupName}".
      
${params.message ? `Personal message: ${params.message}` : ''}

To join the group:
1. Visit: ${params.inviteUrl}
2. Or use invite code: ${params.inviteCode}

Start learning together on FluentFlow!`
    })

    // TODO: Store in-app notification in database
    // For now, we'll log the notification details
  }

  async sendSessionNotification(params: {
    recipientEmails: string[]
    groupName: string
    sessionTitle: string
    sessionUrl: string
    scheduledAt?: string
  }): Promise<void> {
    for (const email of params.recipientEmails) {
      console.log('📧 Session Notification:', {
        to: email,
        subject: `New quiz session in "${params.groupName}"`,
        content: `A new quiz session "${params.sessionTitle}" has been created in your study group "${params.groupName}".

${params.scheduledAt ? `Scheduled for: ${new Date(params.scheduledAt).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}` : 'The session is available now.'}

Join the session: ${params.sessionUrl}

Happy learning!`
      })
    }

    // TODO: Store in-app notifications in database
    // For now, we'll log the notification details
  }
}

// Email service implementation (for future integration with email providers)
class EmailNotificationService implements NotificationService {
  constructor(private config?: {
    provider: 'resend' | 'sendgrid' | 'nodemailer'
    apiKey?: string
  }) {}

  async sendGroupInvitation(params: {
    recipientEmail: string
    groupName: string
    inviterName: string
    inviteCode: string
    inviteUrl: string
    message?: string
  }): Promise<void> {
    // TODO: Implement actual email sending when email service is configured
    console.log('📧 [EMAIL SERVICE] Group Invitation would be sent:', {
      provider: this.config?.provider,
      to: params.recipientEmail,
      from: 'noreply@fluentflow.com',
      subject: `You're invited to join "${params.groupName}" on FluentFlow`,
      template: 'group-invitation',
      data: params
    })
  }

  async sendSessionNotification(params: {
    recipientEmails: string[]
    groupName: string
    sessionTitle: string
    sessionUrl: string
    scheduledAt?: string
  }): Promise<void> {
    // TODO: Implement actual email sending when email service is configured
    console.log('📧 [EMAIL SERVICE] Session notifications would be sent:', {
      provider: this.config?.provider,
      recipients: params.recipientEmails,
      from: 'noreply@fluentflow.com',
      subject: `New quiz session in "${params.groupName}"`,
      template: 'session-notification',
      data: params
    })
  }
}

// Factory function to create notification service based on environment
export function createNotificationService(): NotificationService {
  // Check for email service configuration in environment variables
  const emailProvider = process.env.EMAIL_PROVIDER as 'resend' | 'sendgrid' | 'nodemailer'
  const apiKey = process.env.EMAIL_API_KEY

  if (emailProvider && apiKey) {
    console.log(`📧 Using ${emailProvider} email service for notifications`)
    return new EmailNotificationService({ provider: emailProvider, apiKey })
  }

  console.log('📧 Using in-app notification service (email service not configured)')
  return new InAppNotificationService()
}

export const notificationService = createNotificationService()
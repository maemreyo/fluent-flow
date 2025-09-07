import { getSupabaseServiceRole } from '../supabase/service-role'

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

    // Store in-app notification in database
    try {
      const supabase = getSupabaseServiceRole()
      if (supabase) {
        // Try to find user by checking existing profiles table which links to auth users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', params.recipientEmail)
          .limit(1)
        
        if (profiles && profiles.length > 0) {
          const userId = profiles[0].id
          await supabase.from('social_notifications').insert({
            user_id: userId,
            type: 'group_invite',
            title: `You're invited to join "${params.groupName}"`,
            message: `${params.inviterName} has invited you to join the study group "${params.groupName}".${params.message ? ` Message: "${params.message}"` : ''}`,
            data: {
              groupName: params.groupName,
              inviterName: params.inviterName,
              inviteCode: params.inviteCode,
              inviteUrl: params.inviteUrl,
              message: params.message
            },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          })
          console.log(`✅ In-app group invitation notification stored for ${params.recipientEmail}`)
        } else {
          console.log(`📧 User ${params.recipientEmail} not found in system - invitation will be processed when they join`)
        }
      }
    } catch (error) {
      console.error('Failed to store in-app group invitation notification:', error)
      // Don't throw error - notification logging already happened above
    }
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

      // Store in-app notification in database
      try {
        const supabase = getSupabaseServiceRole()
        if (supabase) {
          // Try to find user by checking existing profiles table which links to auth users
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .limit(1)
          
          if (profiles && profiles.length > 0) {
            const userId = profiles[0].id
            await supabase.from('social_notifications').insert({
              user_id: userId,
              type: 'message', // Using 'message' type for session notifications
              title: `New quiz session in "${params.groupName}"`,
              message: `A new quiz session "${params.sessionTitle}" has been created in your study group "${params.groupName}".${params.scheduledAt ? ` Scheduled for: ${new Date(params.scheduledAt).toLocaleDateString()}` : ' Available now!'}`,
              data: {
                groupName: params.groupName,
                sessionTitle: params.sessionTitle,
                sessionUrl: params.sessionUrl,
                scheduledAt: params.scheduledAt,
                isSessionNotification: true
              },
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            })
            console.log(`✅ In-app session notification stored for ${email}`)
          } else {
            console.log(`📧 User ${email} not found in system - skipping in-app notification`)
          }
        }
      } catch (error) {
        console.error(`Failed to store in-app session notification for ${email}:`, error)
        // Don't throw error - notification logging already happened above
      }
    }
  }
}

// Email service implementation (for future integration with email providers)
class EmailNotificationService implements NotificationService {
  private resend: any = null

  constructor(private config?: {
    provider: 'resend' | 'sendgrid' | 'nodemailer'
    apiKey?: string
  }) {
    // Initialize Resend if configured
    if (config?.provider === 'resend' && config.apiKey) {
      try {
        // Dynamic import for Resend to avoid bundling issues
        import('resend').then(({ Resend }) => {
          this.resend = new Resend(config.apiKey!)
        }).catch(error => {
          console.warn('Failed to initialize Resend:', error)
        })
      } catch (error) {
        console.warn('Failed to initialize Resend:', error)
      }
    }
  }

  async sendGroupInvitation(params: {
    recipientEmail: string
    groupName: string
    inviterName: string
    inviteCode: string
    inviteUrl: string
    message?: string
  }): Promise<void> {
    if (this.resend && this.config?.provider === 'resend') {
      try {
        await this.resend.emails.send({
          from: 'FluentFlow <noreply@fluentflow.com>',
          to: [params.recipientEmail],
          subject: `You're invited to join "${params.groupName}" on FluentFlow`,
          html: this.generateInvitationEmailHTML(params),
          text: this.generateInvitationEmailText(params)
        })
        console.log(`✅ Group invitation email sent to ${params.recipientEmail}`)
        return
      } catch (error) {
        console.error('Failed to send group invitation email:', error)
        // Fall through to logging
      }
    }

    // Fallback to logging when email service is not configured or fails
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
    if (this.resend && this.config?.provider === 'resend') {
      try {
        await this.resend.emails.send({
          from: 'FluentFlow <noreply@fluentflow.com>',
          to: params.recipientEmails,
          subject: `New quiz session in "${params.groupName}"`,
          html: this.generateSessionEmailHTML(params),
          text: this.generateSessionEmailText(params)
        })
        console.log(`✅ Session notification emails sent to ${params.recipientEmails.length} recipients`)
        return
      } catch (error) {
        console.error('Failed to send session notification emails:', error)
        // Fall through to logging
      }
    }

    // Fallback to logging when email service is not configured or fails
    console.log('📧 [EMAIL SERVICE] Session notifications would be sent:', {
      provider: this.config?.provider,
      recipients: params.recipientEmails,
      from: 'noreply@fluentflow.com',
      subject: `New quiz session in "${params.groupName}"`,
      template: 'session-notification',
      data: params
    })
  }

  private generateInvitationEmailHTML(params: {
    recipientEmail: string
    groupName: string
    inviterName: string
    inviteCode: string
    inviteUrl: string
    message?: string
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're invited to join ${params.groupName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">You're invited to FluentFlow!</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">${params.inviterName} has invited you to join the study group:</p>
            <h2 style="color: #1e40af; background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">${params.groupName}</h2>
            ${params.message ? `<p style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-style: italic;">"${params.message}"</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${params.inviteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">Join Group</a>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Or use group code: <strong>${params.inviteCode}</strong><br>
              This invitation link will expire in 7 days.
            </p>
          </div>
        </body>
      </html>
    `
  }

  private generateInvitationEmailText(params: {
    recipientEmail: string
    groupName: string
    inviterName: string
    inviteCode: string
    inviteUrl: string
    message?: string
  }): string {
    return `
You're invited to FluentFlow!

${params.inviterName} has invited you to join the study group: ${params.groupName}

${params.message ? `Message: "${params.message}"` : ''}

Join the group: ${params.inviteUrl}

Or use group code: ${params.inviteCode}

This invitation link will expire in 7 days.
    `.trim()
  }

  private generateSessionEmailHTML(params: {
    recipientEmails: string[]
    groupName: string
    sessionTitle: string
    sessionUrl: string
    scheduledAt?: string
  }): string {
    const scheduledText = params.scheduledAt 
      ? `<p style="background: #fef3c7; padding: 15px; border-radius: 8px; color: #92400e;"><strong>Scheduled for:</strong> ${new Date(params.scheduledAt).toLocaleString()}</p>`
      : `<p style="background: #dcfce7; padding: 15px; border-radius: 8px; color: #166534;"><strong>Available now!</strong> Join the session when you're ready.</p>`

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Quiz Session - ${params.groupName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">New Quiz Session Available!</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">A new quiz session has been created in your study group:</p>
            <h2 style="color: #1e40af; background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">${params.groupName}</h2>
            <h3 style="color: #374151; margin: 15px 0;">${params.sessionTitle}</h3>
            ${scheduledText}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${params.sessionUrl}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">Start Quiz</a>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              This session will be available for 24 hours. Good luck!
            </p>
          </div>
        </body>
      </html>
    `
  }

  private generateSessionEmailText(params: {
    recipientEmails: string[]
    groupName: string
    sessionTitle: string
    sessionUrl: string
    scheduledAt?: string
  }): string {
    const scheduledText = params.scheduledAt 
      ? `Scheduled for: ${new Date(params.scheduledAt).toLocaleString()}`
      : `Available now! Join the session when you're ready.`

    return `
New Quiz Session Available!

A new quiz session has been created in your study group: ${params.groupName}

Session: ${params.sessionTitle}

${scheduledText}

Start quiz: ${params.sessionUrl}

This session will be available for 24 hours. Good luck!
    `.trim()
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
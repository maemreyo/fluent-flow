import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../lib/cors'
import { v4 as uuidv4 } from 'uuid'
import { PermissionManager } from '../../../../../lib/permissions'
import { notificationService } from '../../../../../lib/services/notification-service'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { groupId } = await params
    const body = await request.json()
    const { emails, message } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return corsResponse({ error: 'Emails are required' }, 400)
    }

    // Get user membership and group settings for permission checking
    const { data: membershipData, error: membershipError } = await supabase
      .from('study_group_members')
      .select(`
        role,
        study_groups!inner(
          id,
          name,
          group_code,
          is_private,
          user_role:role,
          created_by,
          settings
        )
      `)
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membershipData) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Use PermissionManager to check invitation permission
    const group = {
      ...membershipData.study_groups,
      user_role: membershipData.role
    }
    const permissions = new PermissionManager(user, group, null)

    if (!permissions.canInviteMembers()) {
      return corsResponse({ error: 'You do not have permission to invite members to this group' }, 403)
    }

    // Use group data from membership query
    const groupInfo = group

    // Create invitations for each email
    const invitations = []
    const errors = []
    
    for (const email of emails) {
      try {
        // Check if user is already a member
        const { data: existingMember, error: memberError } = await supabase
          .from('study_group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_email', email)
          .maybeSingle()

        if (memberError && memberError.code !== 'PGRST116') {
          errors.push(`Error checking membership for ${email}: ${memberError.message}`)
          continue
        }

        if (existingMember) {
          errors.push(`${email} is already a member of this group`)
          continue
        }

        // Check if there's already a pending invitation
        const { data: existingInvite, error: inviteError } = await supabase
          .from('group_invitations')
          .select('id, status')
          .eq('group_id', groupId)
          .eq('email', email)
          .eq('status', 'pending')
          .maybeSingle()

        if (inviteError && inviteError.code !== 'PGRST116') {
          errors.push(`Error checking existing invitation for ${email}: ${inviteError.message}`)
          continue
        }

        if (existingInvite) {
          errors.push(`${email} already has a pending invitation`)
          continue
        }

        // Create invitation
        const invitationId = uuidv4()
        const inviteToken = uuidv4()
        
        const { data: invitation, error: createError } = await supabase
          .from('group_invitations')
          .insert({
            id: invitationId,
            group_id: groupId,
            email: email,
            invited_by: user.id,
            invite_token: inviteToken,
            message: message || `You've been invited to join "${(groupInfo as any).name}" study group!`,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          })
          .select()
          .single()

        if (createError) {
          errors.push(`Failed to create invitation for ${email}: ${createError.message}`)
          continue
        }

        invitations.push({
          email,
          invitationId: invitation.id,
          inviteToken,
          inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/groups/join?token=${inviteToken}`,
          groupName: (groupInfo as any).name
        })

      } catch (error) {
        errors.push(`Unexpected error for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Send invitation notifications
    try {
      const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'FluentFlow User'
      
      for (const invitation of invitations) {
        await notificationService.sendGroupInvitation({
          recipientEmail: invitation.email,
          groupName: invitation.groupName,
          inviterName,
          inviteCode: (groupInfo as any).group_code,
          inviteUrl: invitation.inviteUrl,
          message
        })
      }
      console.log(`✅ Sent ${invitations.length} invitation notification(s)`)
    } catch (notificationError) {
      console.error('Failed to send invitation notifications:', notificationError)
      // Don't fail the request if notifications fail - the invitations were still created
    }

    const response = {
      success: true,
      invitations: invitations.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully created ${invitations.length} invitation${invitations.length !== 1 ? 's' : ''}${errors.length > 0 ? ` with ${errors.length} error${errors.length !== 1 ? 's' : ''}` : ''}`
    }

    return corsResponse(response)
  } catch (error) {
    console.error('Error in group invite POST:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}
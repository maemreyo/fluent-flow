'use client'

import { useState } from 'react'
import { Crown, Share2, Shield, MoreVertical, UserCheck, UserX, Trash2 } from 'lucide-react'
import { GroupMember } from '../types'
import InviteMemberModal from '../../../../components/groups/InviteMemberModal'
import { JoinRequestsSection } from './JoinRequestsSection'
import { FullscreenModal } from '../../../../components/ui/dialog'

interface MembersTabProps {
  members: GroupMember[]
  memberCount: number
  canManage: boolean
  canInviteMembers?: boolean
  groupId: string
  groupName: string
  groupCode: string
  onRefreshMembers?: () => void
  currentUserId?: string
  currentUserRole?: string
  groupSettings?: {
    maxAdminCount?: number
    adminCanManageMembers?: boolean
  }
}

export function MembersTab({
  members,
  memberCount,
  canManage,
  canInviteMembers,
  groupId,
  groupName,
  groupCode,
  onRefreshMembers,
  currentUserId,
  currentUserRole,
  groupSettings
}: MembersTabProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [memberActions, setMemberActions] = useState<{[key: string]: boolean}>({})
  const [confirmAction, setConfirmAction] = useState<{
    action: 'promote' | 'demote' | 'remove'
    member: GroupMember
    newRole?: string
  } | null>(null)
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const handleMemberAction = async (action: 'promote' | 'demote' | 'remove', member: GroupMember, newRole?: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${member.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action === 'promote' || action === 'demote' ? 'changeRole' : action,
          newRole: newRole
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to perform action')
      }

      // Refresh members list
      onRefreshMembers?.()
      setConfirmAction(null)
    } catch (error) {
      console.error('Failed to perform member action:', error)
      alert(`Failed to ${action} member: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const canManageSpecificMember = (member: GroupMember) => {
    // Can't manage yourself
    if (member.user_id === currentUserId) return false
    
    // Only owners and admins can manage members (if setting allows)
    const canManageMembers = canManage && (groupSettings?.adminCanManageMembers !== false)
    if (!canManageMembers) return false

    // Can't manage owners
    if (member.role === 'owner') return false

    // Admins can't manage other admins unless you're the owner
    if (member.role === 'admin' && currentUserRole !== 'owner') return false

    return true
  }

  const canPromoteMember = (member: GroupMember) => {
    if (!canManageSpecificMember(member)) return false
    if (member.role !== 'member') return false

    // Check admin count limit
    const currentAdminCount = members.filter(m => m.role === 'admin').length
    const maxAdmins = groupSettings?.maxAdminCount || 3
    
    return currentAdminCount < maxAdmins
  }

  const toggleMemberActions = (memberId: string) => {
    setMemberActions(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }))
  }

  return (
    <div className="space-y-8">
      {/* Join Requests Section */}
      <JoinRequestsSection
        groupId={groupId}
        canManageMembers={canManage}
        onMemberAdded={onRefreshMembers}
      />

      {/* Members Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            Members ({memberCount})
          </h2>
          {(canInviteMembers ?? canManage) && (
            <button 
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Invite Members
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
            <div
              key={member.user_id}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl relative"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {member.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{member.username}</p>
                  {getRoleIcon(member.role)}
                </div>
                <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                <p className="text-xs text-gray-500">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>

              {/* Member Actions Menu */}
              {canManageSpecificMember(member) && (
                <div className="relative">
                  <button
                    onClick={() => toggleMemberActions(member.user_id)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {memberActions[member.user_id] && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                      {/* Promote to Admin */}
                      {canPromoteMember(member) && (
                        <button
                          onClick={() => {
                            setConfirmAction({ action: 'promote', member, newRole: 'admin' })
                            setMemberActions({})
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                        >
                          <UserCheck className="w-4 h-4" />
                          Promote to Admin
                        </button>
                      )}

                      {/* Demote Admin */}
                      {member.role === 'admin' && canManageSpecificMember(member) && (
                        <button
                          onClick={() => {
                            setConfirmAction({ action: 'demote', member, newRole: 'member' })
                            setMemberActions({})
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <UserX className="w-4 h-4" />
                          Demote to Member
                        </button>
                      )}

                      {/* Remove Member */}
                      <button
                        onClick={() => {
                          setConfirmAction({ action: 'remove', member })
                          setMemberActions({})
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Member
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          groupId={groupId}
          groupName={groupName}
          groupCode={groupCode}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            onRefreshMembers?.()
          }}
        />
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <FullscreenModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          className="w-full max-w-md"
          closeOnBackdropClick={false}
        >
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {confirmAction.action === 'promote' && 'Promote Member'}
              {confirmAction.action === 'demote' && 'Demote Admin'}
              {confirmAction.action === 'remove' && 'Remove Member'}
            </h3>
            <p className="mb-6 text-gray-600">
              {confirmAction.action === 'promote' && 
                `Are you sure you want to promote ${confirmAction.member.username} to admin? They will gain administrative privileges in this group.`
              }
              {confirmAction.action === 'demote' && 
                `Are you sure you want to demote ${confirmAction.member.username} to member? They will lose their administrative privileges.`
              }
              {confirmAction.action === 'remove' && 
                `Are you sure you want to remove ${confirmAction.member.username} from this group? This action cannot be undone.`
              }
            </p>

            {confirmAction.action === 'promote' && (
              <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Current admins: {members.filter(m => m.role === 'admin').length} / {groupSettings?.maxAdminCount || 3}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMemberAction(confirmAction.action, confirmAction.member, confirmAction.newRole)}
                className={`rounded-lg px-4 py-2 text-white transition-colors ${
                  confirmAction.action === 'remove' 
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction.action === 'demote'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmAction.action === 'promote' && 'Promote'}
                {confirmAction.action === 'demote' && 'Demote'}
                {confirmAction.action === 'remove' && 'Remove'}
              </button>
            </div>
          </div>
        </FullscreenModal>
      )}
    </div>
  )
}

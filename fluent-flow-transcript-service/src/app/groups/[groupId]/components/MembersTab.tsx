'use client'

import { useState } from 'react'
import { Crown, Share2, Shield } from 'lucide-react'
import { GroupMember } from '../types'
import InviteMemberModal from '../../../../components/groups/InviteMemberModal'

interface MembersTabProps {
  members: GroupMember[]
  memberCount: number
  canManage: boolean
  groupId: string
  groupName: string
  groupCode: string
  onRefreshMembers?: () => void
}

export function MembersTab({
  members,
  memberCount,
  canManage,
  groupId,
  groupName,
  groupCode,
  onRefreshMembers
}: MembersTabProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Members ({memberCount})
        </h2>
        {canManage && (
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
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl"
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
          </div>
        ))}
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
    </div>
  )
}

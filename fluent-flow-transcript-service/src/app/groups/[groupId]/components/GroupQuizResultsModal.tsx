'use client'

import { FullscreenModal } from '@/components/ui/dialog'
import { GroupQuizResults } from '../../../../components/groups/GroupQuizResults'

interface GroupQuizResultsModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  groupId: string
  sessionTitle?: string
}

export function GroupQuizResultsModal({
  isOpen,
  onClose,
  sessionId,
  groupId,
  sessionTitle
}: GroupQuizResultsModalProps) {
  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-6xl w-[95vw] bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-50/95 backdrop-blur-xl border-white/20 shadow-2xl"
    >
      <div className="p-6">
        <div className="pb-4">
          <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
            Quiz Results - {sessionTitle || 'Session Results'}
          </h2>
        </div>
        
        <div className="max-h-[calc(95vh-8rem)] overflow-y-auto">
          <GroupQuizResults 
            sessionId={sessionId}
            groupId={groupId}
          />
        </div>
      </div>
    </FullscreenModal>
  )
}
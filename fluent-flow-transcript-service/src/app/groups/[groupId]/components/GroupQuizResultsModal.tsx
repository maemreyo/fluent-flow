'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-50/95 backdrop-blur-xl border-white/20 shadow-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
            Quiz Results - {sessionTitle || 'Session Results'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="custom-scrollbar max-h-[calc(95vh-120px)] overflow-y-auto pr-2">
          <GroupQuizResults
            groupId={groupId}
            sessionId={sessionId}
            sessionTitle={sessionTitle}
          />
        </div>

        {/* Custom scrollbar styles */}
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.5);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
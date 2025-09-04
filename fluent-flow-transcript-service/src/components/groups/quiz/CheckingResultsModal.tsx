'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CheckingResultsModalProps {
  isOpen: boolean
}

export function CheckingResultsModal({ isOpen }: CheckingResultsModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm"
      >
        <DialogHeader className="items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Checking Results
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            Please wait while we check for any previous results...
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

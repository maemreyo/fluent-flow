'use client'

import { AlertTriangle, Clock, Target } from 'lucide-react'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Separator } from '../../ui/separator'
import { Alert, AlertDescription } from '../../ui/alert'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../../ui/dialog'

interface PresetConfirmationDialogProps {
  isOpen: boolean
  currentPreset: {
    id: string
    name: string
    distribution: {
      easy: number
      medium: number
      hard: number
    }
    createdAt: Date
  }
  newPreset: {
    id: string
    name: string
    distribution: {
      easy: number
      medium: number
      hard: number
    }
  }
  onConfirm: () => void
  onCancel: () => void
}

export function PresetConfirmationDialog({
  isOpen,
  currentPreset,
  newPreset,
  onConfirm,
  onCancel
}: PresetConfirmationDialogProps) {
  const currentTotal = currentPreset.distribution.easy + currentPreset.distribution.medium + currentPreset.distribution.hard
  const newTotal = newPreset.distribution.easy + newPreset.distribution.medium + newPreset.distribution.hard
  const timeSinceCreation = Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl border-amber-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Replace Existing Questions?
              </DialogTitle>
              <DialogDescription className="mt-1">
                You already have questions generated from another preset
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Preset Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-900">Current Preset:</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {currentPreset.name}
              </Badge>
            </div>
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                      Easy: {currentPreset.distribution.easy}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                      Medium: {currentPreset.distribution.medium}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                      Hard: {currentPreset.distribution.hard}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-600">{currentTotal} total</Badge>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock className="h-3 w-3" />
                      {timeSinceCreation < 1 ? 'Just now' : `${timeSinceCreation}m ago`}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* New Preset Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-gray-900">New Preset:</span>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {newPreset.name}
              </Badge>
            </div>
            <Alert className="border-indigo-200 bg-indigo-50">
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                      Easy: {newPreset.distribution.easy}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
                      Medium: {newPreset.distribution.medium}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                      Hard: {newPreset.distribution.hard}
                    </Badge>
                  </div>
                  <Badge className="bg-indigo-600">{newTotal} total</Badge>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Warning Message */}
          <Alert variant="destructive" className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-medium">This will permanently replace your current questions</p>
                <p className="text-sm">
                  The existing {currentTotal} questions will be deleted and cannot be recovered. 
                  New questions will be generated according to the selected preset.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700"
          >
            Replace & Generate New Questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
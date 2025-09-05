'use client'

import { AlertTriangle, Clock, Target } from 'lucide-react'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

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
  if (!isOpen) return null

  const currentTotal = currentPreset.distribution.easy + currentPreset.distribution.medium + currentPreset.distribution.hard
  const newTotal = newPreset.distribution.easy + newPreset.distribution.medium + newPreset.distribution.hard
  const timeSinceCreation = Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 border-amber-200 bg-white shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Replace Existing Questions?
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                You already have questions generated from another preset
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Preset Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Current Preset: {currentPreset.name}
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{currentPreset.distribution.easy}</div>
                    <div className="text-xs text-gray-500">Easy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{currentPreset.distribution.medium}</div>
                    <div className="text-xs text-gray-500">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{currentPreset.distribution.hard}</div>
                    <div className="text-xs text-gray-500">Hard</div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-lg font-bold text-blue-600">{currentTotal}</div>
                  <div className="text-xs text-gray-500">total questions</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3" />
                    {timeSinceCreation < 1 ? 'Just now' : `${timeSinceCreation}m ago`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Preset Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              New Preset: {newPreset.name}
            </h3>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{newPreset.distribution.easy}</div>
                    <div className="text-xs text-gray-500">Easy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{newPreset.distribution.medium}</div>
                    <div className="text-xs text-gray-500">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{newPreset.distribution.hard}</div>
                    <div className="text-xs text-gray-500">Hard</div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-lg font-bold text-indigo-600">{newTotal}</div>
                  <div className="text-xs text-gray-500">total questions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">This will permanently replace your current questions</p>
                <p className="text-xs text-amber-700 mt-1">
                  The existing {currentTotal} questions will be deleted and cannot be recovered. 
                  New questions will be generated according to the selected preset.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Replace & Generate New Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
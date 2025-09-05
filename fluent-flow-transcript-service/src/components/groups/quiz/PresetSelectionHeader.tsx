'use client'

import { ArrowLeft, Brain, Home, Users } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '../../ui/breadcrumb'
import { Button } from '../../ui/button'
import { CurrentPresetStatus } from './CurrentPresetStatus'

interface PresetSelectionHeaderProps {
  onGoBack: () => void
  currentPreset?: {
    id: string
    name: string
    distribution: { easy: number; medium: number; hard: number }
    createdAt: Date
  } | null
}

export function PresetSelectionHeader({ onGoBack, currentPreset }: PresetSelectionHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Group
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                Quiz Setup
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button onClick={onGoBack} variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-3 w-3" />
          Back to Group
        </Button>
      </div>

      {/* Header Content */}
      <div className="space-y-4 text-center">
        {/* <div>
          <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
            Choose Quiz Preset
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Select an intelligent preset tailored to your group's learning goals. Each preset is optimized 
            for different skill levels and time constraints.
          </p>
        </div> */}

        {/* Current Preset Status */}
        {currentPreset && <CurrentPresetStatus currentPreset={currentPreset} />}
      </div>
    </div>
  )
}

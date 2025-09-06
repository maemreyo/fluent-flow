'use client'

import { Clock, Users, Sparkles } from 'lucide-react'

interface MemberWaitingViewProps {
  onlineParticipants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  sessionTitle?: string
  currentStep: 'preset-selection' | 'question-generation' | 'ready-to-start'
}

export function MemberWaitingView({ 
  onlineParticipants, 
  sessionTitle = "Group Quiz Session",
  currentStep = 'preset-selection'
}: MemberWaitingViewProps) {
  const getStepInfo = () => {
    switch (currentStep) {
      case 'preset-selection':
        return {
          title: 'Waiting for Quiz Setup',
          description: 'The session owner is selecting the quiz preset...',
          icon: Clock,
          color: 'text-blue-600'
        }
      case 'question-generation':
        return {
          title: 'Generating Questions',
          description: 'Questions are being generated for the selected preset...',
          icon: Sparkles,
          color: 'text-purple-600'
        }
      case 'ready-to-start':
        return {
          title: 'Ready to Start!',
          description: 'Questions ready! Waiting for owner to start the session...',
          icon: Users,
          color: 'text-green-600'
        }
      default:
        return {
          title: 'Please Wait',
          description: 'Setting up the quiz session...',
          icon: Clock,
          color: 'text-gray-600'
        }
    }
  }

  const stepInfo = getStepInfo()
  const StepIcon = stepInfo.icon

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
          {sessionTitle}
        </h1>
        <p className="text-lg text-gray-600">Group Quiz Session</p>
      </div>

      {/* Main Waiting Area */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Status Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${
              currentStep === 'preset-selection' ? 'from-blue-100 to-indigo-100' :
              currentStep === 'question-generation' ? 'from-purple-100 to-pink-100' :
              'from-green-100 to-emerald-100'
            }`}>
              <StepIcon className={`h-8 w-8 ${stepInfo.color}`} />
            </div>
            
            <h2 className="mb-3 text-2xl font-bold text-gray-900">
              {stepInfo.title}
            </h2>
            
            <p className="mb-6 text-gray-600">
              {stepInfo.description}
            </p>

            {/* Loading Animation */}
            <div className="mx-auto mb-4 flex h-2 w-32 overflow-hidden rounded-full bg-gray-200">
              <div className={`h-full animate-pulse rounded-full ${
                currentStep === 'preset-selection' ? 'bg-blue-500' :
                currentStep === 'question-generation' ? 'bg-purple-500' :
                'bg-green-500'
              } transition-all duration-300`} 
              style={{ 
                width: currentStep === 'preset-selection' ? '33%' : 
                       currentStep === 'question-generation' ? '66%' : '100%'
              }} />
            </div>

            <p className="text-sm text-gray-500">
              {currentStep === 'ready-to-start' 
                ? 'The owner will start the session shortly. Please stay tuned!' 
                : 'Please wait while the session is being prepared by the owner...'
              }
            </p>
          </div>
        </div>

        {/* Participants Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              Session Participants
            </h3>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
              {onlineParticipants.length} online
            </span>
          </div>

          <div className="space-y-3">
            {onlineParticipants.slice(0, 8).map((participant) => (
              <div key={participant.user_id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    participant.is_online ? 'bg-green-400' : 'bg-gray-300'
                  }`} />
                  <span className="font-medium text-gray-900">
                    {participant.user_email?.split('@')[0] || `User ${participant.user_id?.slice(-4) || 'Unknown'}`}
                  </span>
                </div>
                <span className={`text-sm ${
                  participant.is_online ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {participant.is_online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
            
            {onlineParticipants.length > 8 && (
              <div className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-500">
                +{onlineParticipants.length - 8} more participants
              </div>
            )}
            
            {onlineParticipants.length === 0 && (
              <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
                No participants online yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Session Progress</h3>
        
        <div className="flex items-center justify-between">
          {[
            { key: 'preset-selection', label: 'Preset Selection', step: 1 },
            { key: 'question-generation', label: 'Question Generation', step: 2 },
            { key: 'ready-to-start', label: 'Ready to Start', step: 3 }
          ].map((item, index) => (
            <div key={item.key} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                currentStep === item.key || 
                (currentStep === 'question-generation' && item.key === 'preset-selection') ||
                (currentStep === 'ready-to-start' && item.key !== 'ready-to-start')
                  ? 'border-green-500 bg-green-500 text-white' 
                  : 'border-gray-300 bg-white text-gray-500'
              }`}>
                {currentStep === item.key || 
                 (currentStep === 'question-generation' && item.key === 'preset-selection') ||
                 (currentStep === 'ready-to-start' && item.key !== 'ready-to-start')
                  ? '✓' : item.step}
              </div>
              
              {index < 2 && (
                <div className={`mx-4 h-0.5 w-16 ${
                  (currentStep === 'question-generation' && index === 0) ||
                  (currentStep === 'ready-to-start' && index < 2)
                    ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
              
              <span className={`ml-2 text-sm ${
                currentStep === item.key ? 'font-semibold text-gray-900' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
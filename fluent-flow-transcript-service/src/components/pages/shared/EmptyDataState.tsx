'use client'

import { ComponentType } from 'react'

interface EmptyDataStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

export function EmptyDataState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: EmptyDataStateProps) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto max-w-md">
        {Icon && (
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
            <Icon className="h-10 w-10 text-indigo-600" />
          </div>
        )}
        
        <h3 className="mb-3 text-xl font-semibold text-gray-800">
          {title}
        </h3>
        
        {description && (
          <p className="mb-8 text-gray-600">
            {description}
          </p>
        )}
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
            >
              {actionLabel}
            </button>
          )}
          
          {onSecondaryAction && secondaryActionLabel && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center rounded-2xl border-2 border-indigo-200 bg-white/80 px-6 py-3 font-semibold text-indigo-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-indigo-300 hover:bg-indigo-50"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
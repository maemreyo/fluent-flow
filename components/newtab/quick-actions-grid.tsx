import React from 'react'
import type { QuickAction } from '../../lib/utils/newtab-analytics'

interface QuickActionsGridProps {
  actions: QuickAction[]
  onAction: (actionId: string, data?: any) => void
}

export function QuickActionsGrid({ actions, onAction }: QuickActionsGridProps) {
  const getActionColor = (actionId: string) => {
    switch (actionId) {
      case 'resume_video':
        return 'bg-green-500 hover:bg-green-600'
      case 'continue_session':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'random_video':
        return 'bg-purple-500 hover:bg-purple-600'
      case 'focus_timer':
        return 'bg-orange-500 hover:bg-orange-600'
      case 'vocabulary_review':
        return 'bg-indigo-500 hover:bg-indigo-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id, action.data)}
            className={`p-4 rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95 ${getActionColor(action.id)}`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="text-sm font-semibold mb-1">{action.title}</div>
            <div className="text-xs opacity-90">{action.description}</div>
          </button>
        ))}
      </div>

      {/* Add Custom Action Button */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors duration-200">
          <div className="text-lg mb-1">➕</div>
          <div className="text-sm font-medium">Customize Actions</div>
        </button>
      </div>
    </div>
  )
}
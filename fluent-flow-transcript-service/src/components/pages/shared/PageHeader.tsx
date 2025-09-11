'use client'

import { ReactNode, ComponentType } from 'react'
import { Search } from 'lucide-react'

export interface PageAction {
  label: string
  action: () => void
  icon?: ComponentType<{ className?: string }>
  variant?: 'primary' | 'secondary'
}

export interface PageTab {
  key: string
  label: string
  onPrefetch?: () => void
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: PageAction[]
  tabs?: PageTab[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  children?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  actions = [],
  tabs = [],
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children
}: PageHeaderProps) {

  const renderAction = (action: PageAction, index: number) => {
    const Icon = action.icon
    const isPrimary = action.variant !== 'secondary'
    
    return (
      <button
        key={index}
        onClick={action.action}
        className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold shadow-lg transition-all duration-300 hover:scale-105 ${
          isPrimary
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
            : 'border-2 border-indigo-200 bg-white/80 text-indigo-700 backdrop-blur-sm hover:border-indigo-300 hover:bg-indigo-50'
        }`}
      >
        {Icon && <Icon className="h-5 w-5" />}
        {action.label}
      </button>
    )
  }

  return (
    <div className="mb-8">
      {/* Title and Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-gray-600">{subtitle}</p>
          )}
        </div>

        {actions.length > 0 && (
          <div className="flex gap-3">
            {actions.map(renderAction)}
          </div>
        )}
      </div>

      {(tabs.length > 0 || onSearchChange || children) && (
        <>
          {/* Tab Navigation */}
          {tabs.length > 0 && (
            <div className="mb-6 flex items-center gap-4">
              <div className="flex rounded-2xl border border-white/20 bg-white/80 p-1 shadow-lg backdrop-blur-sm">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange?.(tab.key)}
                    onMouseEnter={() => tab.onPrefetch?.()}
                    className={`rounded-xl px-6 py-2 font-semibold transition-all duration-300 ${
                      activeTab === tab.key
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          {onSearchChange && (
            <div className="mb-6 flex items-center gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white/80 py-3 pl-10 pr-4 shadow-lg backdrop-blur-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
            </div>
          )}

          {/* Custom children */}
          {children}
        </>
      )}
    </div>
  )
}
'use client'

import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${className}`}>
      {/* Animated background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-blob absolute left-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-2000 absolute right-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-gradient-to-r from-pink-400/20 to-orange-400/20 mix-blend-multiply blur-xl filter"></div>
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto max-w-7xl px-6 py-8">
        {children}
      </div>
    </div>
  )
}
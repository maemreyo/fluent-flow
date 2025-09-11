'use client'

import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
              Fluent Flow
            </h1>
            <p className="text-gray-600">Learn languages with AI-powered conversations</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
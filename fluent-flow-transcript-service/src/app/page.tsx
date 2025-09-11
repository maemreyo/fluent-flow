'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard')
      } else {
        router.replace('/groups') // or '/auth/signin' if you have an auth page
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking auth and redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-800">Loading Fluent Flow...</h3>
      </div>
    </div>
  )
}
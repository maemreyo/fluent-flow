'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      // Store the current URL to redirect back after login
      const currentUrl = pathname
      const redirectUrl = `/auth/signin?redirectTo=${encodeURIComponent(currentUrl)}`
      router.replace(redirectUrl)
    }
  }, [isAuthenticated, isLoading, requireAuth, router, pathname])

  // Show loading while auth is being determined
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If auth is required but user is not authenticated, don't render children
  // (redirect will happen in useEffect)
  if (requireAuth && !isAuthenticated) {
    return null
  }

  return <>{children}</>
}

// Higher-order component version
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireAuth?: boolean }
) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute requireAuth={options?.requireAuth}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
  
  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
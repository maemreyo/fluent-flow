'use client'

import { ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { AuthPrompt } from '../../auth/AuthPrompt'
import { MasterHeader } from '../../layout/MasterHeader'
import { PageLayout } from './PageLayout'

interface AuthenticatedPageProps {
  children: ReactNode
  title: string
  subtitle?: string
  onAuthSuccess?: () => void
  onAuthClose?: () => void
  requireAuth?: boolean
  showNavigation?: boolean
}

export function AuthenticatedPage({
  children,
  title,
  subtitle,
  onAuthSuccess,
  onAuthClose,
  requireAuth = true,
  showNavigation = true
}: AuthenticatedPageProps) {
  const { isAuthenticated, isLoading } = useAuth()

  const handleAuthSuccess = () => {
    onAuthSuccess?.()
  }

  const handleAuthClose = () => {
    onAuthClose?.()
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading...</span>
        </div>
      </PageLayout>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <PageLayout>
        <AuthPrompt
          onClose={handleAuthClose}
          onAuthSuccess={handleAuthSuccess}
          title={title}
          subtitle={subtitle || `Sign in to access ${title.toLowerCase()}`}
        />
      </PageLayout>
    )
  }

  return (
    <>
      <MasterHeader showNavigation={showNavigation} />
      <PageLayout className={showNavigation ? 'pt-16' : ''}>
        {children}
      </PageLayout>
    </>
  )
}
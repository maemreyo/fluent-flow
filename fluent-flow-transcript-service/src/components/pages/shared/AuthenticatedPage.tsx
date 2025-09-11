'use client'

import { ReactNode } from 'react'
import { ProtectedRoute } from '../../auth/ProtectedRoute'
import { MasterHeader } from '../../layout/MasterHeader'
import { PageLayout } from './PageLayout'

interface AuthenticatedPageProps {
  children: ReactNode
  title?: string
  subtitle?: string
  requireAuth?: boolean
  showNavigation?: boolean
}

export function AuthenticatedPage({
  children,
  requireAuth = true,
  showNavigation = true
}: AuthenticatedPageProps) {
  return (
    <ProtectedRoute requireAuth={requireAuth}>
      <MasterHeader showNavigation={showNavigation} />
      <PageLayout className={showNavigation ? 'pt-16' : ''}>
        {children}
      </PageLayout>
    </ProtectedRoute>
  )
}
'use client'

import { Button } from '../../../../components/ui/button'

interface ErrorViewProps {
  error: string | null
  onRetry: () => void
}

export function ErrorView({ error, onRetry }: ErrorViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">Error</h1>
        <p className="mb-4 text-gray-600">{error || 'An unknown error occurred'}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </div>
  )
}

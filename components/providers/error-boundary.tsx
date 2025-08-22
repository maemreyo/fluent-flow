import React, { Component, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
            <CardDescription className="text-red-600">
              {this.state.error?.message || 'An unexpected error occurred'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={this.handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// React Query Error Boundary specifically for queries
export function QueryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('React Query Error:', error)
        // Could send to error reporting service
      }}
      fallback={
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-orange-800 font-medium">
              Failed to load data
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Please refresh the page or try again later
            </p>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Enhanced error boundary specifically for React Query with transcript and question operations
export function QueryOperationErrorBoundary({ 
  children, 
  operation = 'data operation' 
}: { 
  children: ReactNode
  operation?: string 
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`React Query ${operation} Error:`, error, errorInfo)
        
        // Enhanced error reporting with operation context
        if (error.message.includes('API not configured')) {
          console.warn(`${operation} failed: API configuration missing`)
        } else if (error.message.includes('not provided')) {
          console.error(`${operation} failed: Missing service dependency`)
        } else if (error.message.includes('VIDEO_NOT_FOUND')) {
          console.warn(`${operation} failed: Video not found or unavailable`)
        }
      }}
      fallback={
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm text-amber-800 font-medium">
              {operation} temporarily unavailable
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Data may be cached from a previous session
            </p>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
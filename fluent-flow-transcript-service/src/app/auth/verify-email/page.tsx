'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!supabase) {
        setStatus('error')
        setMessage('Authentication service not available')
        return
      }

      const token = searchParams.get('token')
      const type = searchParams.get('type')

      if (!token || type !== 'signup') {
        setStatus('error')
        setMessage('Invalid or missing verification parameters')
        return
      }

      try {
        // For email verification, we need to use the token hash approach
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) {
          if (error.message.includes('expired')) {
            setStatus('expired')
            setMessage('Verification link has expired')
          } else {
            setStatus('error')
            setMessage(error.message)
          }
          return
        }

        setStatus('success')
        setMessage('Email verified successfully! You can now sign in.')
        
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.replace('/auth/signin')
        }, 3000)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'An unexpected error occurred')
      }
    }

    verifyEmail()
  }, [router, searchParams])

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <span>Redirecting to sign in...</span>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            </div>
          </div>
        )

      case 'expired':
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Link Expired</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                href="/auth/signup"
                className="block w-full"
              >
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                  Create New Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        )

      case 'error':
      default:
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h2>
            <Alert className="border-red-200 bg-red-50 mb-6">
              <AlertDescription className="text-red-700">
                {message}
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <Link
                href="/auth/signup"
                className="block w-full"
              >
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                  Try Again
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )
    }
  }

  return (
    <Card className="border-white/20 bg-white/90 backdrop-blur-sm shadow-xl max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold text-gray-900">
          <Mail className="h-8 w-8 text-indigo-600" />
          Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}
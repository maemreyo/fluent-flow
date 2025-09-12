'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  // Check if we have valid tokens from the email link fragment
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) {
      setIsValidToken(false)
      setError('Invalid or missing reset token. Please request a new password reset.')
      return
    }

    const params = new URLSearchParams(hash.substring(1)) // remove #
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setIsValidToken(false)
      setError('Invalid or missing reset token data. Please request a new password reset.')
      return
    }

    // Set the session for the Supabase client so the updateUser call is authenticated
    supabase!.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      .then(({ error }) => {
        if (error) {
          setIsValidToken(false)
          setError('Failed to validate reset token. It might be expired.')
        } else {
          setIsValidToken(true)
        }
      })
  }, [])

  const validateForm = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    return true
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError('Authentication service not available')
      return
    }

    if (!validateForm()) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Password updated successfully! You will be redirected to dashboard.')
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.replace('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="w-full">
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-6xl font-bold text-transparent">
            Fluent Flow
          </h1>
          <p className="text-gray-800 text-xl font-medium">Learn languages with AI-powered conversations</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="w-full">
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-6xl font-bold text-transparent">
            Fluent Flow
          </h1>
          <p className="text-gray-800 text-xl font-medium">Learn languages with AI-powered conversations</p>
        </div>
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Invalid Reset Link
          </h2>
        </div>
        <div className="text-center">
          <Alert className="border-red-200 bg-red-50/90 backdrop-blur-sm rounded-xl mb-8">
            <AlertDescription className="text-red-700 text-base">
              {error}
            </AlertDescription>
          </Alert>
          <Link
            href="/auth/forgot-password"
            className="text-lg font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
          >
            Request a new password reset
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-6xl font-bold text-transparent">
          Fluent Flow
        </h1>
        <p className="text-gray-800 text-xl font-medium">Learn languages with AI-powered conversations</p>
      </div>

      {/* Form Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          Reset Password
        </h2>
        <p className="text-gray-700 text-lg">Enter your new password</p>
      </div>

      {/* Form Section - Direct on background */}
      <form onSubmit={handleResetPassword} className="space-y-6">
        {error && (
          <Alert className="border-red-200 bg-red-50/90 backdrop-blur-sm rounded-xl">
            <AlertDescription className="text-red-700 text-base">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50/90 backdrop-blur-sm rounded-xl">
            <AlertDescription className="text-green-700 text-base">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-base font-semibold text-gray-800 mb-4">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-16 pr-16 py-5 h-16 border-0 bg-white/80 backdrop-blur-md focus:bg-white/95 rounded-2xl text-lg shadow-lg focus:shadow-xl hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-transparent placeholder:text-gray-400"
                placeholder="Enter your new password"
                required
                disabled={isLoading}
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:text-indigo-500 transition-colors duration-300 p-1 rounded-lg hover:bg-gray-100/50"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-6 w-6" />
                ) : (
                  <Eye className="h-6 w-6" />
                )}
              </button>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-base font-semibold text-gray-800 mb-4">
              Confirm New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-16 pr-16 py-5 h-16 border-0 bg-white/80 backdrop-blur-md focus:bg-white/95 rounded-2xl text-lg shadow-lg focus:shadow-xl hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-transparent placeholder:text-gray-400"
                placeholder="Confirm your new password"
                required
                disabled={isLoading}
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:text-indigo-500 transition-colors duration-300 p-1 rounded-lg hover:bg-gray-100/50"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-6 w-6" />
                ) : (
                  <Eye className="h-6 w-6" />
                )}
              </button>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
          disabled={isLoading || !password || !confirmPassword}
          style={{
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Updating Password...
            </>
          ) : (
            <>
              Update Password
              <ArrowRight className="ml-2 h-6 w-6" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
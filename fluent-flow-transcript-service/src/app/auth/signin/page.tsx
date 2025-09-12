'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo)
    }
  }, [isAuthenticated, router, redirectTo])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError('Authentication service not available')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(error.message)
        return
      }

      // Redirect will be handled by the auth state change
      router.replace(redirectTo)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
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
          Welcome Back
        </h2>
        <p className="text-gray-700 text-lg">Sign in to your account to continue</p>
      </div>

      {/* Form Section - Direct on background */}
      <form onSubmit={handleSignIn} className="space-y-6">
        {error && (
          <Alert className="border-red-200 bg-red-50/90 backdrop-blur-sm rounded-xl">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-base font-semibold text-gray-800 mb-4">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-16 pr-5 py-5 h-16 border-0 bg-white/80 backdrop-blur-md focus:bg-white/95 rounded-2xl text-lg shadow-lg focus:shadow-xl hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-transparent placeholder:text-gray-400"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-semibold text-gray-800 mb-4">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-16 pr-16 py-5 h-16 border-0 bg-white/80 backdrop-blur-md focus:bg-white/95 rounded-2xl text-lg shadow-lg focus:shadow-xl hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-transparent placeholder:text-gray-400"
                placeholder="Enter your password"
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
        </div>

        <div className="flex items-center justify-end pt-2">
          <Link
            href="/auth/forgot-password"
            className="text-base font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
          disabled={isLoading || !email || !password}
          style={{
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-6 w-6" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-10 text-center">
        <p className="text-gray-700 text-lg">
          Don't have an account?{' '}
          <Link
            href={`/auth/signup${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
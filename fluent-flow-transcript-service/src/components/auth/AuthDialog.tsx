'use client'

import { useState } from 'react'
import { X, User, Lock, Mail, Star, BookOpen, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: (user: any) => void
}

export const AuthDialog = ({ isOpen, onClose, onAuthSuccess }: AuthDialogProps) => {
  const [isSignIn, setIsSignIn] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError('Authentication service unavailable')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isSignIn) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) throw error
        
        if (data.user) {
          onAuthSuccess(data.user)
          onClose()
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              email_confirmed: true // For demo purposes
            }
          }
        })
        
        if (error) throw error
        
        if (data.user) {
          onAuthSuccess(data.user)
          onClose()
        }
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    {
      icon: <Star className="h-5 w-5 text-yellow-500" />,
      title: "Save Favorites",
      description: "Star quizzes and access them anytime from your Extension"
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      title: "Track Progress",
      description: "See your learning progress and performance over time"
    },
    {
      icon: <BookOpen className="h-5 w-5 text-blue-500" />,
      title: "Personal Vocabulary",
      description: "Build your vocabulary collection across all your sessions"
    },
    {
      icon: <Users className="h-5 w-5 text-purple-500" />,
      title: "Sync Across Devices",
      description: "Access your data on any device with FluentFlow Extension"
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isSignIn ? 'Welcome Back!' : 'Join FluentFlow'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isSignIn 
                ? 'Sign in to access your personal learning data' 
                : 'Create account to unlock powerful learning features'
              }
            </p>
          </div>

          {/* Benefits Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              {isSignIn ? 'Access Your Features' : 'Unlock These Features'}
            </h3>
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-shrink-0 mt-0.5">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">{benefit.title}</h4>
                    <p className="text-gray-600 text-xs">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isSignIn ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                isSignIn ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignIn(!isSignIn)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {isSignIn 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Continue without account */}
          <div className="mt-4 text-center border-t pt-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Continue as guest (limited features)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
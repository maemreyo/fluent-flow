'use client'

import { useState } from 'react'
import { User, Mail, Lock, Star, TrendingUp, BookOpen, X, Sparkles, Trophy, Shield } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'
import { supabase } from '../../lib/supabase/client'

interface AuthPromptProps {
  onClose: () => void
  onAuthSuccess: (user: any) => void
  title?: string
  subtitle?: string
}

export function AuthPrompt({ onClose, onAuthSuccess, title, subtitle }: AuthPromptProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError('')

    try {
      if (!supabase) {
        throw new Error('Authentication service not available')
      }

      if (!isSignUp) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) throw error
        
        if (data.user) {
          onAuthSuccess(data.user)
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
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Track Your Progress",
      description: "Save your quiz results and see improvement over time",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: <Star className="h-4 w-4" />,
      title: "Favorite Quizzes",
      description: "Star your favorite topics and access them quickly",
      gradient: "from-yellow-500 to-orange-600"
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      title: "Personal Vocabulary",
      description: "Build your vocabulary collection across all sessions",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: <Trophy className="h-4 w-4" />,
      title: "Achievement System",
      description: "Unlock achievements as you learn and improve",
      gradient: "from-purple-500 to-pink-600"
    }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-20 right-20 w-40 h-40 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-40 h-40 bg-gradient-to-r from-pink-400/30 to-orange-400/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <Card className="relative w-full max-w-4xl mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Shield className="h-8 w-8" />
              </div>
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            
            <h2 className="text-3xl font-bold mb-2">
              {title || "Save Your Learning Progress!"}
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {subtitle || "Sign in to unlock personalized features and track your learning journey"}
            </p>
          </div>
        </div>

        <CardContent className="p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Benefits Section */}
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Why Sign In?</h3>
                <p className="text-gray-600">Unlock powerful features to enhance your learning experience</p>
              </div>
              
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="group p-4 rounded-2xl border-2 border-gray-100 hover:border-white hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-gray-50"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl bg-gradient-to-r ${benefit.gradient} shadow-lg`}>
                        <div className="text-white">
                          {benefit.icon}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{benefit.title}</h4>
                        <p className="text-sm text-gray-600">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth Form */}
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl p-6 border-2 border-gray-100">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h3>
                <p className="text-gray-600">
                  {isSignUp ? 'Join thousands of learners' : 'Continue your learning journey'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Create one"
                  }
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { User, LogIn, Mail, Lock, Crown, Star, TrendingUp, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Separator } from '../ui/separator'

interface AuthHeaderProps {
  user: any
  isAuthenticated: boolean
  onAuthSuccess: (user: any) => void
  onSignOut?: () => void
  showBenefits?: boolean
}

export const AuthHeader = ({ 
  user, 
  isAuthenticated, 
  onAuthSuccess, 
  onSignOut,
  showBenefits = true 
}: AuthHeaderProps) => {
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [isSignIn, setIsSignIn] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setShowAuthForm(false)
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
          setShowAuthForm(false)
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
      icon: <Star className="h-3 w-3" />,
      title: "Save Favorites",
      description: "Star quizzes and access them anytime from your Extension",
      badge: "Premium"
    },
    {
      icon: <TrendingUp className="h-3 w-3" />,
      title: "Track Progress",
      description: "See your learning progress and performance over time",
      badge: "Analytics"
    },
    {
      icon: <BookOpen className="h-3 w-3" />,
      title: "Personal Vocabulary",
      description: "Build your vocabulary collection across all your sessions",
      badge: "Learning"
    }
  ]

  if (isAuthenticated && user) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-green-800">Signed in</h3>
                <p className="text-sm text-green-600 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                  Premium Active
                </Badge>
              </div>
              {onSignOut && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="h-auto px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-100"
                >
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showAuthForm) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {isSignIn ? 'Sign In' : 'Join FluentFlow'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isSignIn 
                    ? 'Sign in to access your personal learning data' 
                    : 'Create account to unlock powerful learning features'
                  }
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuthForm(false)}
              className="h-auto p-1 text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {showBenefits && (
            <div className="grid gap-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-white/50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="font-medium text-xs">{benefit.title}</h4>
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {benefit.badge}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2 bg-red-100 border border-red-200 rounded-md">
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xs"
              >
                {loading ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isSignIn ? 'Signing In...' : 'Creating...'}</span>
                  </div>
                ) : (
                  isSignIn ? 'Sign In' : 'Create Account'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSignIn(!isSignIn)}
                className="h-8 text-xs"
              >
                {isSignIn ? 'Sign up' : 'Sign in'}
              </Button>
            </div>
          </form>

          <p className="text-muted-foreground text-xs text-center">
            Free account • No credit card required
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Sign In for Premium Experience</h3>
              <p className="text-sm text-blue-600">Unlock powerful features and sync your progress</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAuthForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Sign In / Sign Up
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
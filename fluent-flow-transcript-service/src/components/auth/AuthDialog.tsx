'use client'

import { useState } from 'react'
import { User, Lock, Mail, Star, BookOpen, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

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
      icon: <Star className="h-4 w-4" />,
      title: "Save Favorites",
      description: "Star quizzes and access them anytime from your Extension",
      badge: "Premium"
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Track Progress",
      description: "See your learning progress and performance over time",
      badge: "Analytics"
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      title: "Personal Vocabulary",
      description: "Build your vocabulary collection across all your sessions",
      badge: "Learning"
    },
    {
      icon: <Users className="h-4 w-4" />,
      title: "Sync Across Devices",
      description: "Access your data on any device with FluentFlow Extension",
      badge: "Sync"
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
{isSignIn ? 'Sign In' : 'Join FluentFlow'}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {isSignIn 
                  ? 'Sign in to access your personal learning data' 
                  : 'Create account to unlock powerful learning features'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6">
          <Separator />
        </div>

        {/* Benefits Section */}
        <div className="px-6 py-4">
          <h3 className="font-semibold mb-4 text-center">
            {isSignIn ? 'Access Your Features' : 'Unlock These Features'}
          </h3>
          <div className="grid gap-3">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                      {benefit.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{benefit.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {benefit.badge}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="px-6">
          <Separator />
        </div>

        {/* Form */}
        <div className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-3">
                  <p className="text-destructive text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isSignIn ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                isSignIn ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-4">
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSignIn(!isSignIn)}
              className="text-sm"
            >
              {isSignIn 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </Button>
          </div>

          <Separator />

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground text-sm"
            >
              Continue as guest (limited features)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
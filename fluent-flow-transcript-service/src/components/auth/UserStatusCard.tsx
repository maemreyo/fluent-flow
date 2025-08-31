'use client'

import { User, LogIn, Star, TrendingUp, BookOpen, Crown } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback } from '../ui/avatar'

interface UserStatusCardProps {
  user: any
  isAuthenticated: boolean
  onSignInClick?: () => void
  onSignOut?: () => void
  showBenefits?: boolean
}

export const UserStatusCard = ({ 
  user, 
  isAuthenticated, 
  onSignInClick, 
  onSignOut,
  showBenefits = true 
}: UserStatusCardProps) => {
  if (isAuthenticated && user) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">Signed in</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                Premium Active
              </Badge>
            </div>
          </div>
          
          {onSignOut && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                Sign out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
          <LogIn className="h-6 w-6 text-white" />
        </div>
        
        <CardTitle className="text-lg">
          Sign In for Premium Experience
        </CardTitle>
        
        <CardDescription>
          Unlock powerful features and sync your progress across devices
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {showBenefits && (
          <div className="grid gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">Save Favorites</h4>
                  <Badge variant="outline" className="text-xs">Star</Badge>
                </div>
                <p className="text-muted-foreground text-xs">Access starred quizzes from your Extension</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">Track Progress</h4>
                  <Badge variant="outline" className="text-xs">Analytics</Badge>
                </div>
                <p className="text-muted-foreground text-xs">Monitor your learning journey over time</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">Personal Vocabulary</h4>
                  <Badge variant="outline" className="text-xs">Learning</Badge>
                </div>
                <p className="text-muted-foreground text-xs">Build vocabulary across all sessions</p>
              </div>
            </div>
          </div>
        )}

        {onSignInClick && (
          <Button
            onClick={onSignInClick}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Sign In / Sign Up
          </Button>
        )}
        
        {!onSignInClick && (
          <div className="text-center text-sm text-muted-foreground">
            Authentication dialog not available
          </div>
        )}

        <p className="text-muted-foreground text-xs text-center">
          Free account • No credit card required
        </p>
      </CardContent>
    </Card>
  )
}
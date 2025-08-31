'use client'

import { User, LogIn, Star, TrendingUp, BookOpen, Crown } from 'lucide-react'

interface UserStatusCardProps {
  user: any
  isAuthenticated: boolean
  onSignInClick: () => void
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
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Welcome back!</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-green-700">Premium Features Active</span>
          </div>
        </div>
        
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <LogIn className="h-6 w-6 text-white" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sign In for Premium Experience
        </h3>
        
        <p className="text-gray-600 text-sm mb-6">
          Unlock powerful features and sync your progress across devices
        </p>

        {showBenefits && (
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="flex items-center space-x-3 text-left">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Save Favorites</h4>
                <p className="text-gray-600 text-xs">Access starred quizzes from your Extension</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-left">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Track Progress</h4>
                <p className="text-gray-600 text-xs">Monitor your learning journey over time</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-left">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Personal Vocabulary</h4>
                <p className="text-gray-600 text-xs">Build vocabulary across all sessions</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onSignInClick}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-[1.02]"
        >
          Sign In / Sign Up
        </button>

        <p className="text-gray-500 text-xs mt-3">
          Free account • No credit card required
        </p>
      </div>
    </div>
  )
}
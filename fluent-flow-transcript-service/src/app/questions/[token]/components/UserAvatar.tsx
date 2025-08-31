'use client'

import { User, LogOut, Settings, Trophy } from 'lucide-react'
import { Button } from '../../../../components/ui/button'

interface UserAvatarProps {
  user: any
  isAuthenticated: boolean
  authLoading: boolean
  onSignOut?: () => void
}

export function UserAvatar({ 
  user, 
  isAuthenticated, 
  authLoading,
  onSignOut 
}: UserAvatarProps) {
  if (authLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 animate-pulse"></div>
        <div className="hidden sm:block">
          <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm">
        <User className="w-5 h-5 text-gray-500" />
        <span className="hidden sm:inline text-sm font-medium text-gray-600">Guest</span>
      </div>
    )
  }

  const userEmail = user?.email || 'Unknown User'
  const initials = userEmail
    .split('@')[0]
    .split('.')
    .map((part: string) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)

  return (
    <div className="flex items-center gap-3">
      {/* User Avatar */}
      <div className="relative group">
        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {initials}
        </div>
        
        {/* User Menu Dropdown */}
        <div className="absolute right-0 top-12 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-4">
            {/* User Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200/50">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">
                  {userEmail.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userEmail}
                </p>
              </div>
            </div>
            
            {/* Menu Items */}
            <div className="py-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-sm">Progress</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </Button>
              
              <div className="pt-2 border-t border-gray-200/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Welcome Text */}
      <div className="hidden sm:block">
        <p className="text-sm font-medium text-gray-700">
          Welcome back!
        </p>
        <p className="text-xs text-gray-500">
          {userEmail.split('@')[0]}
        </p>
      </div>
    </div>
  )
}
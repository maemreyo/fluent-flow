'use client'

import { User, LogOut, Settings, Crown } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface UserAvatarProps {
  user?: any
  isAuthenticated: boolean
  onSignOut?: () => void
}

export const UserAvatar = ({ user, isAuthenticated, onSignOut }: UserAvatarProps) => {
  if (!isAuthenticated || !user) {
    return (
      <Avatar className="w-8 h-8 cursor-pointer">
        <AvatarFallback className="bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
    )
  }

  const userInitials = user.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-1 rounded-full">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        {/* User Info Header */}
        <div className="px-3 py-2">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Crown className="h-3 w-3 text-yellow-500" />
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  Premium
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {onSignOut && (
          <DropdownMenuItem 
            onClick={onSignOut}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
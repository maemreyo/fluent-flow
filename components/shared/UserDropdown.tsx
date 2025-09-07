import { useState } from 'react'
import { ChevronDown, Loader2, LogOut, Settings, UserX } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { getAvatarInitials, getAvatarBackgroundColor, getUserDisplayName } from '../../lib/utils/user-avatar'

interface UserDropdownProps {
  user: any
  checkingAuth: boolean
  onSignOut?: () => void
}

export function UserDropdown({ user, checkingAuth, onSignOut }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (checkingAuth) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        <UserX className="h-4 w-4" />
        <span className="text-xs">Sign in</span>
      </Button>
    )
  }

  const initials = getAvatarInitials(user.email || '')
  const backgroundColor = getAvatarBackgroundColor(user.email || '')
  const displayName = getUserDisplayName(user)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 px-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
            style={{ backgroundColor }}
          >
            {initials}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 p-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ backgroundColor }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => {
            // Open Chrome extension options/settings page
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.openOptionsPage()
            } else {
              // Fallback for non-Chrome environments
              console.log('Navigate to profile settings - Chrome API not available')
            }
          }}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false)
            onSignOut?.()
          }}
          className="flex items-center gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
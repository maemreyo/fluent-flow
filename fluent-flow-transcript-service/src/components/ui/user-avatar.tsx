'use client'

import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  email?: string | null
  username?: string | null
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'size-6 text-xs',
  md: 'size-8 text-sm',
  lg: 'size-10 text-base',
  xl: 'size-12 text-lg'
}

export function UserAvatar({ 
  email, 
  username, 
  imageUrl, 
  size = 'md', 
  className 
}: UserAvatarProps) {
  const getInitials = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email && email.includes('@')) {
      return email.split('@')[0].slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getDisplayName = (email?: string | null, username?: string | null) => {
    if (username && username.trim()) {
      return username.trim()
    }
    if (email && email.includes('@')) {
      return email.split('@')[0]
    }
    return 'User'
  }

  const initials = getInitials(email, username)
  const displayName = getDisplayName(email, username)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && (
        <AvatarImage 
          src={imageUrl} 
          alt={displayName}
        />
      )}
      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
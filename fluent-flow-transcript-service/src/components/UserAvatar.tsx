interface UserAvatarProps {
  email: string
  displayName?: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

export function UserAvatar({ email, displayName, size = 'sm', showName = false }: UserAvatarProps) {
  const getAvatarInitials = (email: string): string => {
    if (!email) return '?'
    
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    
    const username = parts[0]
    if (username.length >= 2) {
      return (username[0] + username[1]).toUpperCase()
    }
    
    return username[0]?.toUpperCase() || '?'
  }

  const getAvatarBackgroundColor = (email: string): string => {
    const colors = [
      '#ef4444', // red-500
      '#f97316', // orange-500
      '#eab308', // yellow-500
      '#22c55e', // green-500
      '#06b6d4', // cyan-500
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
    ]
    
    if (!email) return colors[0]
    
    const hash = email.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  const getUserDisplayName = (email: string): string => {
    if (displayName) return displayName
    
    if (email) {
      const username = email.split('@')[0]
      return username.replace(/[._-]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }
    
    return 'User'
  }

  const initials = getAvatarInitials(email)
  const backgroundColor = getAvatarBackgroundColor(email)
  const name = getUserDisplayName(email)

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-full font-medium text-white ${sizeClasses[size]}`}
        style={{ backgroundColor }}
      >
        {initials}
      </div>
      {showName && (
        <span className="text-sm font-medium text-gray-700">{name}</span>
      )}
    </div>
  )
}
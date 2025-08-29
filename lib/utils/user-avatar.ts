/**
 * User Avatar Utilities
 * Generate avatars and user display components
 */

/**
 * Generate avatar initials from email
 */
export function getAvatarInitials(email: string): string {
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

/**
 * Generate avatar background color based on email
 */
export function getAvatarBackgroundColor(email: string): string {
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

/**
 * Get user display name from user object
 */
export function getUserDisplayName(user: any): string {
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }
  
  if (user?.email) {
    const username = user.email.split('@')[0]
    return username.replace(/[._-]/g, ' ')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  return 'User'
}
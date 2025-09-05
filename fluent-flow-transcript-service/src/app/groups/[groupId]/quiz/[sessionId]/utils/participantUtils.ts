export const getInitials = (email?: string | null, username?: string | null) => {
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
  return '??'
}

export const getDisplayName = (email?: string | null, username?: string | null) => {
  if (username && username.trim()) {
    return username.trim()
  }
  if (email && email.includes('@')) {
    return email.split('@')[0]
  }
  return 'Unknown User'
}
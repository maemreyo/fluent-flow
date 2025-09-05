'use client'

interface GroupQuizSessionHeaderProps {
  session: any
  participants: any[]
  user: any
  isAuthenticated: boolean
}

export function GroupQuizSessionHeader({ 
  session, 
  participants, 
  user, 
  isAuthenticated 
}: GroupQuizSessionHeaderProps) {
  return (
    <div className="border-b border-white/20 bg-white/60 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold text-gray-800">
            {session?.quiz_title || 'Group Quiz Session'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Live Session
            </span>
            <span>{participants.length} participants</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800">{user.email || 'You'}</div>
              <div className="text-xs text-gray-500">
                {isAuthenticated ? 'Authenticated' : 'Guest'}
              </div>
            </div>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 font-semibold text-white">
            {(user?.email || 'U')[0].toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
import { Loader2, User, UserX } from 'lucide-react'

interface AuthStatusProps {
  user: any
  checkingAuth: boolean
}

export function AuthStatus({ user, checkingAuth }: AuthStatusProps) {
  if (checkingAuth) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <User className="h-4 w-4" />
        <span className="text-xs">Synced</span>
      </div>
    )
  }

  return (
    <div
      className="flex cursor-pointer items-center gap-2 text-orange-600 hover:text-orange-700"
      onClick={() => chrome.runtime.openOptionsPage()}
      title="Click to sign in for cloud sync"
    >
      <UserX className="h-4 w-4" />
      <span className="text-xs">Sign in</span>
    </div>
  )
}
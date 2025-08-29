import { UserDropdown } from './UserDropdown'

interface AuthStatusProps {
  user: any
  checkingAuth: boolean
  onSignOut?: () => void
}

export function AuthStatus({ user, checkingAuth, onSignOut }: AuthStatusProps) {
  return <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={onSignOut} />
}
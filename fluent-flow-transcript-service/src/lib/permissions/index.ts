// Centralized Permission Management System
export type UserRole = 'owner' | 'admin' | 'member' | 'guest'
export type Permission = 
  | 'group.manage'
  | 'group.invite' 
  | 'group.settings'
  | 'session.create'
  | 'session.manage'
  | 'session.delete'
  | 'quiz.manage'
  | 'quiz.start'
  | 'quiz.generate'
  | 'preset.select'

interface User {
  id: string
  role?: string
}

interface Session {
  created_by: string
}

interface Group {
  user_role?: string
  created_by?: string
}

// Permission definitions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'group.manage',
    'group.invite', 
    'group.settings',
    'session.create',
    'session.manage',
    'session.delete',
    'quiz.manage',
    'quiz.start',
    'quiz.generate',
    'preset.select'
  ],
  admin: [
    'group.manage',
    'group.invite',
    'session.create', 
    'session.manage',
    'session.delete',
    'quiz.manage',
    'quiz.start',
    'quiz.generate',
    'preset.select'
  ],
  member: [],
  guest: []
}

export class PermissionManager {
  constructor(
    private user: User | null,
    private group?: Group | null,
    private session?: Session | null
  ) {}

  // Core permission check
  hasPermission(permission: Permission): boolean {
    if (!this.user) return false

    const userRole = (this.group?.user_role as UserRole) || 'guest'
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []

    // Check role-based permissions
    if (rolePermissions.includes(permission)) return true

    // Check session ownership
    if (this.session && this.session.created_by === this.user.id) {
      const sessionOwnerPermissions: Permission[] = [
        'session.manage',
        'quiz.manage', 
        'quiz.start',
        'quiz.generate',
        'preset.select'
      ]
      return sessionOwnerPermissions.includes(permission)
    }

    return false
  }

  // Convenience methods
  canManageGroup(): boolean {
    return this.hasPermission('group.manage')
  }

  canManageSession(): boolean {
    return this.hasPermission('session.manage')
  }

  canManageQuiz(): boolean {
    return this.hasPermission('quiz.manage')
  }

  canStartQuiz(): boolean {
    return this.hasPermission('quiz.start')
  }

  canSelectPresets(): boolean {
    return this.hasPermission('preset.select')
  }

  canGenerateQuestions(): boolean {
    return this.hasPermission('quiz.generate')
  }

  canInviteMembers(): boolean {
    return this.hasPermission('group.invite')
  }

  canDeleteSession(): boolean {
    return this.hasPermission('session.delete')
  }

  // Role checks
  isOwner(): boolean {
    return (this.group?.user_role as UserRole) === 'owner'
  }

  isAdmin(): boolean {
    return (this.group?.user_role as UserRole) === 'admin'
  }

  isMember(): boolean {
    return (this.group?.user_role as UserRole) === 'member'
  }

  isSessionCreator(): boolean {
    return this.session?.created_by === this.user?.id
  }

  // Get user display info
  getRoleDisplay(): string {
    const role = (this.group?.user_role as UserRole) || 'guest'
    switch (role) {
      case 'owner': return 'Owner'
      case 'admin': return 'Admin' 
      case 'member': return 'Member'
      default: return 'Guest'
    }
  }

  // Get all permissions for current user
  getAllPermissions(): Permission[] {
    if (!this.user) return []

    const userRole = (this.group?.user_role as UserRole) || 'guest'
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []

    // Add session owner permissions
    if (this.session && this.session.created_by === this.user.id) {
      const sessionOwnerPermissions: Permission[] = [
        'session.manage',
        'quiz.manage',
        'quiz.start', 
        'quiz.generate',
        'preset.select'
      ]
      return [...new Set([...rolePermissions, ...sessionOwnerPermissions])]
    }

    return rolePermissions
  }
}
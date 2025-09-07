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
  settings?: {
    // Role Management Settings
    allowMemberInvitations?: boolean
    requireApprovalForJoining?: boolean
    maxAdminCount?: number
    adminCanManageMembers?: boolean
    adminCanDeleteSessions?: boolean
    
    // Session Control Settings
    onlyAdminsCanCreateSessions?: boolean
    onlyAdminsCanStartQuiz?: boolean
    maxConcurrentSessions?: number
    requireSessionApproval?: boolean
    allowQuizRetakes?: boolean
    
    // Enhanced Quiz Settings
    shuffleQuestions?: boolean
    shuffleAnswers?: boolean
    showCorrectAnswers?: boolean
    defaultQuizTimeLimit?: number
    allowSkippingQuestions?: boolean
    enforceQuizTimeLimit?: boolean
  }
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
  member: [
    'quiz.start',
    'preset.select'
  ],
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
    // Check if only admins/owners can start quiz based on group settings
    if (this.group?.settings?.onlyAdminsCanStartQuiz) {
      return this.isOwner() || this.isAdmin() || this.isSessionCreator()
    }
    return this.hasPermission('quiz.start') || this.isMember()
  }

  canSelectPresets(): boolean {
    return this.hasPermission('preset.select')
  }

  canGenerateQuestions(): boolean {
    return this.hasPermission('quiz.generate')
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

  // ============ NEW: Settings-based Permission Methods ============

  // Role Management Permissions
  canInviteMembers(): boolean {
    if (!this.group?.settings?.allowMemberInvitations) {
      return this.hasPermission('group.invite') // Only admins/owners by default
    }
    return this.hasPermission('group.invite') || this.isMember() // Members can invite if setting enabled
  }

  canManageMembers(): boolean {
    if (!this.isAdmin() && !this.isOwner()) return false
    if (this.isAdmin()) {
      return this.group?.settings?.adminCanManageMembers !== false // Default true
    }
    return true // Owners always can
  }

  canDeleteSessions(): boolean {
    if (this.isOwner()) return true
    if (this.isAdmin()) {
      return this.group?.settings?.adminCanDeleteSessions !== false // Default true
    }
    return this.isSessionCreator()
  }

  // Session Control Permissions
  canCreateSessions(): boolean {
    if (this.group?.settings?.onlyAdminsCanCreateSessions) {
      return this.isOwner() || this.isAdmin()
    }
    return this.hasPermission('session.create') || this.isMember() // Members can create by default
  }

  canStartQuizWithoutApproval(): boolean {
    if (this.group?.settings?.requireSessionApproval) {
      return this.isOwner() || this.isAdmin()
    }
    return this.canStartQuiz() // Normal permission check
  }

  // Enhanced Quiz Settings Access
  getQuizSettings(): {
    shuffleQuestions: boolean
    shuffleAnswers: boolean
    showCorrectAnswers: boolean
    timeLimit: number | null
    allowSkipping: boolean
  } {
    const settings = this.group?.settings
    return {
      shuffleQuestions: settings?.shuffleQuestions || false,
      shuffleAnswers: settings?.shuffleAnswers || false,
      showCorrectAnswers: settings?.showCorrectAnswers !== false, // Default true
      timeLimit: settings?.enforceQuizTimeLimit ? (settings?.defaultQuizTimeLimit || 30) : null,
      allowSkipping: settings?.allowSkippingQuestions || false
    }
  }

  canRetakeQuiz(): boolean {
    return this.group?.settings?.allowQuizRetakes !== false // Default true
  }

  // Validation Methods
  canPromoteToAdmin(currentAdminCount?: number): boolean {
    if (!this.canManageMembers()) return false
    const maxAdmins = this.group?.settings?.maxAdminCount || 3
    
    // If current admin count is provided, check against limit
    if (typeof currentAdminCount === 'number') {
      return currentAdminCount < maxAdmins
    }
    
    // If no count provided, assume we can promote (API will do the actual check)
    return true
  }
}
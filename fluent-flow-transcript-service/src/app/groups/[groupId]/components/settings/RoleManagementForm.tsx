'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface RoleManagementFormProps {
  allowMemberInvitations: boolean
  requireApprovalForJoining: boolean
  maxAdminCount: number
  adminCanManageMembers: boolean
  adminCanDeleteSessions: boolean
  onAllowMemberInvitationsChange: (value: boolean) => void
  onRequireApprovalChange: (value: boolean) => void
  onMaxAdminCountChange: (value: number) => void
  onAdminCanManageMembersChange: (value: boolean) => void
  onAdminCanDeleteSessionsChange: (value: boolean) => void
}

export function RoleManagementForm({
  allowMemberInvitations,
  requireApprovalForJoining,
  maxAdminCount,
  adminCanManageMembers,
  adminCanDeleteSessions,
  onAllowMemberInvitationsChange,
  onRequireApprovalChange,
  onMaxAdminCountChange,
  onAdminCanManageMembersChange,
  onAdminCanDeleteSessionsChange
}: RoleManagementFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
        <CardDescription>
          Configure member roles and permissions within your group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Member Invitations */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Allow Member Invitations</Label>
            <CardDescription>
              Let regular members invite new people to the group
            </CardDescription>
          </div>
          <Switch
            checked={allowMemberInvitations}
            onCheckedChange={onAllowMemberInvitationsChange}
          />
        </div>

        {/* Approval Required */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Require Approval for Joining</Label>
            <CardDescription>
              New members need owner/admin approval before joining
            </CardDescription>
          </div>
          <Switch
            checked={requireApprovalForJoining}
            onCheckedChange={onRequireApprovalChange}
          />
        </div>

        {/* Max Admin Count */}
        <div className="space-y-2">
          <Label htmlFor="max-admin-count">Maximum Admin Count</Label>
          <CardDescription>
            Limit the number of administrators in this group (1-10)
          </CardDescription>
          <Input
            id="max-admin-count"
            type="number"
            min="1"
            max="10"
            value={maxAdminCount}
            onChange={(e) => onMaxAdminCountChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
          />
        </div>

        {/* Admin Permissions */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-sm text-muted-foreground">Admin Permissions</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Admins Can Manage Members</Label>
              <CardDescription>
                Allow admins to promote, demote, and remove members
              </CardDescription>
            </div>
            <Switch
              checked={adminCanManageMembers}
              onCheckedChange={onAdminCanManageMembersChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Admins Can Delete Sessions</Label>
              <CardDescription>
                Allow admins to delete quiz sessions created by others
              </CardDescription>
            </div>
            <Switch
              checked={adminCanDeleteSessions}
              onCheckedChange={onAdminCanDeleteSessionsChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
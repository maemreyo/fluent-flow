'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface PrivacySettingsFormProps {
  isPrivate: boolean
  maxMembers: number | null
  onPrivateChange: (value: boolean) => void
  onMaxMembersChange: (value: number) => void
}

export function PrivacySettingsForm({
  isPrivate,
  maxMembers,
  onPrivateChange,
  onMaxMembersChange
}: PrivacySettingsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Private Group</Label>
            <CardDescription>
              Only invited members can join
            </CardDescription>
          </div>
          <Switch
            checked={isPrivate}
            onCheckedChange={onPrivateChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-members">Maximum Members</Label>
          <Input
            id="max-members"
            type="number"
            min="1"
            max="100"
            value={maxMembers || 20}
            onChange={(e) => onMaxMembersChange(parseInt(e.target.value) || 20)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
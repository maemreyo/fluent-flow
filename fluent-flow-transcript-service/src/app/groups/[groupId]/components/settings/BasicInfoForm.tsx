'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface BasicInfoFormProps {
  name: string
  description: string | null
  groupCode: string | null
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

export function BasicInfoForm({
  name,
  description,
  groupCode,
  onNameChange,
  onDescriptionChange
}: BasicInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-code">Group Code</Label>
            <Input
              id="group-code"
              value={groupCode || 'Not assigned'}
              disabled
              className="bg-muted"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="group-description">Description</Label>
          <Textarea
            id="group-description"
            value={description || ''}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Add a description for your group..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  )
}
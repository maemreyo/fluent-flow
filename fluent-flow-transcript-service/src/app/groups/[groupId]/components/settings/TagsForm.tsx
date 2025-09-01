'use client'

import { useState, KeyboardEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface TagsFormProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
}

export function TagsForm({ tags, onTagsChange }: TagsFormProps) {
  const [newTag, setNewTag] = useState('')

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm">
                {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove tag</span>
                </Button>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No tags added yet</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag and press Enter"
            className="flex-1"
          />
          <Button onClick={handleAddTag} disabled={!newTag.trim()}>
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
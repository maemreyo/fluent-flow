import { useState } from 'react'
import { Users, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getAuthHeaders } from '@/lib/supabase/auth-utils'

interface CreateSessionModalProps {
  loopId: string
  availableGroups: Array<{
    id: string
    name: string
    description?: string
    member_count?: number
  }>
  onClose: () => void
  onSuccess: () => void
}

export function CreateSessionModal({ loopId, availableGroups, onClose, onSuccess }: CreateSessionModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sessionType, setSessionType] = useState<'instant' | 'scheduled'>('instant')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId || !sessionTitle.trim()) return
    if (sessionType === 'scheduled' && !scheduledAt) return

    setIsCreating(true)
    try {
      const headers = await getAuthHeaders()
      
      // Call API to create session from loop
      const response = await fetch(`/api/groups/${selectedGroupId}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: sessionTitle.trim(),
          description: description.trim(),
          sessionType: sessionType,
          scheduledAt: sessionType === 'scheduled' ? scheduledAt : undefined,
          notifyMembers: notifyMembers,
          loopId: loopId,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const result = await response.json()
      
      // Redirect to the group sessions tab to see the newly created session
      window.location.href = `/groups/${selectedGroupId}?tab=sessions`
    } catch (error) {
      console.error('Failed to create session:', error)
      alert('Failed to create session. Please try again.')
    }
    setIsCreating(false)
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Group Session</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionTitle">Session Title *</Label>
            <Input
              id="sessionTitle"
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Enter session title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Practice listening skills with this loop..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupSelect">Select Group *</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a group..." />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.member_count || 0} members)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Type */}
          <div className="space-y-3">
            <Label>Session Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                  sessionType === 'instant'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input hover:border-primary/50'
                }`}
                onClick={() => setSessionType('instant')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Start Now</span>
                </div>
                <p className="text-xs text-muted-foreground">Begin session immediately</p>
              </div>
              
              <div
                className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                  sessionType === 'scheduled'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input hover:border-primary/50'
                }`}
                onClick={() => setSessionType('scheduled')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Schedule</span>
                </div>
                <p className="text-xs text-muted-foreground">Set a specific time</p>
              </div>
            </div>
          </div>

          {/* Scheduled Time */}
          {sessionType === 'scheduled' && (
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled Time *</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
          )}

          {/* Notifications */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notifyMembers"
              checked={notifyMembers}
              onCheckedChange={(checked) => setNotifyMembers(checked === true)}
            />
            <Label 
              htmlFor="notifyMembers" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Notify group members about this session
            </Label>
          </div>

          {availableGroups.length === 0 && (
            <Alert>
              <AlertDescription>
                You need to join or create a group first to create sessions.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isCreating || 
                !selectedGroupId || 
                !sessionTitle.trim() || 
                availableGroups.length === 0 ||
                (sessionType === 'scheduled' && !scheduledAt)
              }
            >
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  {sessionType === 'instant' ? 'Create & Start Now' : 'Schedule Session'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
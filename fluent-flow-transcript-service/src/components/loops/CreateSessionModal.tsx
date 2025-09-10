import { useState } from 'react'
import { Calendar, Clock, X, AlertCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

export function CreateSessionModal({ loopId, availableGroups, onClose }: CreateSessionModalProps) {
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
      
      // Redirect to the group sessions tab with session highlight
      const sessionId = result.session?.id
      if (sessionId) {
        window.location.href = `/groups/${selectedGroupId}?tab=sessions&highlight=${sessionId}`
      } else {
        window.location.href = `/groups/${selectedGroupId}?tab=sessions`
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      alert('Failed to create session. Please try again.')
    }
    setIsCreating(false)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-0 shadow-2xl backdrop-blur-sm">
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
            Create Group Session
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-8 pt-6">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Title */}
          <div className="space-y-2">
            <Label htmlFor="sessionTitle" className="text-sm font-semibold text-gray-700">
              Session Title *
            </Label>
            <Input
              id="sessionTitle"
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Enter session title..."
              className="rounded-2xl border-2 border-gray-200 bg-white/80 shadow-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Practice listening skills with this loop..."
              rows={3}
              className="rounded-2xl border-2 border-gray-200 bg-white/80 shadow-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Select Group *</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId} required>
              <SelectTrigger className="rounded-2xl border-2 border-gray-200 bg-white/80 shadow-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
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
            <Label className="text-sm font-semibold text-gray-700">Session Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`cursor-pointer rounded-2xl border-2 p-4 text-left transition-all ${
                  sessionType === 'instant'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white/80 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
                onClick={() => setSessionType('instant')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Start Now</span>
                </div>
                <p className="text-xs text-gray-600">Begin session immediately</p>
              </div>
              
              <div
                className={`cursor-pointer rounded-2xl border-2 p-4 text-left transition-all ${
                  sessionType === 'scheduled'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white/80 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
                onClick={() => setSessionType('scheduled')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Schedule</span>
                </div>
                <p className="text-xs text-gray-600">Set a specific time</p>
              </div>
            </div>
          </div>

          {/* Scheduled Time */}
          {sessionType === 'scheduled' && (
            <div className="space-y-2">
              <Label htmlFor="scheduledAt" className="text-sm font-semibold text-gray-700">
                Scheduled Time *
              </Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="rounded-2xl border-2 border-gray-200 bg-white/80 shadow-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          )}

          {/* Notifications */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="notifyMembers"
              checked={notifyMembers}
              onCheckedChange={(checked) => setNotifyMembers(checked === true)}
              className="mt-1"
            />
            <Label htmlFor="notifyMembers" className="text-sm text-gray-700 cursor-pointer">
              <span className="font-medium">Notify group members</span>
              <br />
              <span className="text-xs text-gray-500">Send email notifications about this session</span>
            </Label>
          </div>

          {/* No Groups Alert */}
          {availableGroups.length === 0 && (
            <Alert className="rounded-2xl border-2 border-orange-200 bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800">
                You need to join or create a group first to create sessions.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 rounded-2xl border-2 border-gray-200 bg-white/80 font-semibold text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:border-gray-300"
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
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold shadow-lg transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 disabled:hover:scale-100"
            >
              {isCreating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  {sessionType === 'instant' ? (
                    <>
                      <Send className="h-5 w-5" />
                      Create & Start Now
                    </>
                  ) : (
                    <>
                      <Calendar className="h-5 w-5" />
                      Schedule Session
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
        
        </div>
      </DialogContent>
    </Dialog>
  )
}
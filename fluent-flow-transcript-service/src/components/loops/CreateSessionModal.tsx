import { useState } from 'react'
import { Calendar, Clock, X, AlertCircle, Send, Users, Sparkles, Zap, FileText, Bell, BellOff } from 'lucide-react'
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
      <DialogContent className="w-full max-w-lg rounded-3xl border-0  p-0 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Animated background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl" />
        
        <div className="relative">
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
                  Create Group Session
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Start a collaborative learning experience</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-8 pt-6">

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Session Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                <FileText className="h-4 w-4 text-indigo-600" />
              </div>
              <Label htmlFor="sessionTitle" className="text-sm font-semibold text-gray-700">
                Session Title *
              </Label>
            </div>
            <div className="relative group">
              <Input
                id="sessionTitle"
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Enter an engaging session title..."
                className="rounded-2xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm transition-all duration-300 focus:border-indigo-400 focus:bg-white/90 focus:shadow-lg focus:scale-[1.02] group-hover:border-indigo-300"
                required
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
            </div>
            <div className="relative group">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what participants will learn and practice..."
                rows={3}
                className="rounded-2xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm transition-all duration-300 focus:border-purple-400 focus:bg-white/90 focus:shadow-lg focus:scale-[1.02] group-hover:border-purple-300 resize-none"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
            </div>
          </div>

          {/* Group Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <Label className="text-sm font-semibold text-gray-700">Select Group *</Label>
            </div>
            <div className="relative group">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} required>
                <SelectTrigger className="rounded-2xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm transition-all duration-300 hover:border-blue-300 focus:border-blue-400 focus:bg-white/90 focus:shadow-lg focus:scale-[1.02]">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-200/60 bg-white/95 backdrop-blur-sm shadow-xl">
                  {availableGroups.map((group) => (
                    <SelectItem 
                      key={group.id} 
                      value={group.id}
                      className="rounded-xl hover:bg-blue-50/80 focus:bg-blue-50/80 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{group.name}</span>
                        <span className="text-xs text-gray-500">({group.member_count || 0} members)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-green-100">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <Label className="text-sm font-semibold text-gray-700">Session Type</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`cursor-pointer rounded-2xl border-2 p-5 text-left transition-all duration-300 group ${
                  sessionType === 'instant'
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-700 shadow-lg shadow-emerald-500/20 scale-105'
                    : 'border-gray-200/60 bg-white/70 backdrop-blur-sm hover:border-emerald-300 hover:bg-emerald-50/30 hover:scale-102'
                }`}
                onClick={() => setSessionType('instant')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    sessionType === 'instant' 
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg' 
                      : 'bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600 group-hover:from-emerald-500 group-hover:to-green-600 group-hover:text-white'
                  }`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-lg">Start Now</span>
                </div>
                <p className={`text-sm transition-colors ${
                  sessionType === 'instant' ? 'text-emerald-600' : 'text-gray-600 group-hover:text-emerald-700'
                }`}>
                  Begin session immediately
                </p>
              </div>
              
              <div
                className={`cursor-pointer rounded-2xl border-2 p-5 text-left transition-all duration-300 group ${
                  sessionType === 'scheduled'
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 shadow-lg shadow-blue-500/20 scale-105'
                    : 'border-gray-200/60 bg-white/70 backdrop-blur-sm hover:border-blue-300 hover:bg-blue-50/30 hover:scale-102'
                }`}
                onClick={() => setSessionType('scheduled')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    sessionType === 'scheduled' 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg' 
                      : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white'
                  }`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-lg">Schedule</span>
                </div>
                <p className={`text-sm transition-colors ${
                  sessionType === 'scheduled' ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-700'
                }`}>
                  Set a specific time
                </p>
              </div>
            </div>
          </div>

          {/* Scheduled Time */}
          {sessionType === 'scheduled' && (
            <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <Label htmlFor="scheduledAt" className="text-sm font-semibold text-gray-700">
                  Scheduled Time *
                </Label>
              </div>
              <div className="relative group">
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="rounded-2xl border-2 border-gray-200/60 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm transition-all duration-300 focus:border-blue-400 focus:bg-white/90 focus:shadow-lg focus:scale-[1.02] group-hover:border-blue-300"
                  required
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
                {notifyMembers ? <Bell className="h-4 w-4 text-amber-600" /> : <BellOff className="h-4 w-4 text-amber-600" />}
              </div>
              <Label className="text-sm font-semibold text-gray-700">Notifications</Label>
            </div>
            <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
              notifyMembers 
                ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50' 
                : 'border-gray-200/60 bg-white/70 backdrop-blur-sm hover:border-amber-200 hover:bg-amber-50/30'
            }`}
            onClick={() => setNotifyMembers(!notifyMembers)}
            >
              <Checkbox
                id="notifyMembers"
                checked={notifyMembers}
                onCheckedChange={(checked) => setNotifyMembers(checked === true)}
                className={`transition-all duration-300 ${notifyMembers ? 'border-amber-500' : 'border-gray-300'}`}
              />
              <div className="flex-1">
                <Label htmlFor="notifyMembers" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                  <span>Notify group members</span>
                  {notifyMembers && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Send email notifications about this session to all group members
                </p>
              </div>
            </div>
          </div>

          {/* No Groups Alert */}
          {availableGroups.length === 0 && (
            <Alert className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-red-50 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <AlertDescription className="text-sm text-orange-800 font-medium">
                  You need to join or create a group first to create sessions.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 rounded-2xl border-2 border-gray-300 bg-white/80 backdrop-blur-sm px-6 py-3 font-semibold text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg hover:scale-[1.02] disabled:hover:scale-100"
            >
              <X className="h-4 w-4 mr-2" />
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
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-6 py-3 font-bold text-white shadow-xl transition-all duration-300 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-700 hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="animate-pulse">Creating...</span>
                </>
              ) : (
                <>
                  {sessionType === 'instant' ? (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
                        <Zap className="h-4 w-4" />
                      </div>
                      Create & Start Now
                    </>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
                        <Calendar className="h-4 w-4" />
                      </div>
                      Schedule Session
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
        
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
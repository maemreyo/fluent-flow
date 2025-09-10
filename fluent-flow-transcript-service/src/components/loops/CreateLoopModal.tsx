import { useState } from 'react'
import { useCreateLoop, useCreateUserLoop } from '@/hooks/useLoops'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CreateLoopModalProps {
  groupId?: string // Optional for user loops
  onClose: () => void
  onSuccess: () => void
}

export function CreateLoopModal({ groupId, onClose, onSuccess }: CreateLoopModalProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(60)
  const [isExtracting, setIsExtracting] = useState(false)

  // Use different hook based on whether groupId is provided
  const createGroupMutation = useCreateLoop(groupId || '')
  const createUserMutation = useCreateUserLoop()
  
  const createMutation = groupId ? createGroupMutation : createUserMutation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl.trim()) return

    setIsExtracting(true)
    try {
      await createMutation.mutateAsync({
        videoUrl: videoUrl.trim(),
        startTime,
        endTime
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create loop:', error)
    }
    setIsExtracting(false)
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Practice Loop</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="videoUrl">YouTube URL</Label>
            <Input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time (seconds)</Label>
              <Input
                id="startTime"
                type="number"
                min="0"
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time (seconds)</Label>
              <Input
                id="endTime"
                type="number"
                min={startTime + 1}
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
              />
            </div>
          </div>

          {createMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {createMutation.error instanceof Error 
                  ? createMutation.error.message 
                  : 'Failed to create loop'}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isExtracting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isExtracting || !videoUrl.trim()}
            >
              {isExtracting ? 'Creating...' : 'Create Loop'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
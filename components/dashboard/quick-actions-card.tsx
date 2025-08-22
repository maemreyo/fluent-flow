import React from 'react'
import { BarChart3, FileAudio, Settings, Repeat } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface QuickActionsCardProps {
  onViewRecordings?: () => void
  onViewLoops?: () => void
  onOpenSettings?: () => void
}

export function QuickActionsCard({ 
  onViewRecordings, 
  onViewLoops,
  onOpenSettings 
}: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={onViewLoops}
        >
          <Repeat className="mr-2 h-4 w-4" />
          View All Loops
        </Button>
        
        {/* TODO: Re-enable when recordings tab is implemented */}
        {/* <Button
          className="w-full justify-start"
          variant="outline"
          onClick={onViewRecordings}
        >
          <FileAudio className="mr-2 h-4 w-4" />
          View All Recordings
        </Button> */}
        
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={onOpenSettings || (() => chrome.runtime.openOptionsPage())}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings & Analytics
        </Button>
      </CardContent>
    </Card>
  )
}
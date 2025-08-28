import { useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Repeat,
  Search
} from 'lucide-react'
import { EnhancedLoopCardWithIntegration } from '../enhanced-loop-card-with-integration'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import type { SavedLoop } from '../../lib/types/fluent-flow-types'
import type { ConversationLoopIntegrationService } from '../../lib/services/conversation-loop-integration-service'

interface LoopsTabProps {
  savedLoops: SavedLoop[]
  loadingLoops: boolean
  integrationService: ConversationLoopIntegrationService | null
  onRefetch: () => void
  onDeleteAll: () => Promise<void>
  onApplyLoop: (loop: SavedLoop) => Promise<void>
  onDeleteLoop: (loopId: string) => Promise<void>
  onExportLoop: (loop: SavedLoop) => Promise<void>
  applyingLoopId: string | null
  deletingAllLoops: boolean
}

export function LoopsTab({
  savedLoops,
  loadingLoops,
  integrationService,
  onRefetch,
  onDeleteAll,
  onApplyLoop,
  onDeleteLoop,
  onExportLoop,
  applyingLoopId,
  deletingAllLoops
}: LoopsTabProps) {
  const [loopFilter, setLoopFilter] = useState('')

  // Filter loops based on search query
  const filteredLoops = savedLoops.filter(
    loop =>
      loopFilter === '' ||
      loop.title.toLowerCase().includes(loopFilter.toLowerCase()) ||
      loop.videoTitle.toLowerCase().includes(loopFilter.toLowerCase()) ||
      loop.description?.toLowerCase().includes(loopFilter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>
                {filteredLoops.length} of {savedLoops.length} loops
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefetch}
                disabled={loadingLoops}
              >
                {loadingLoops ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {loadingLoops ? 'Loading...' : 'Refresh'}
              </Button>
              {savedLoops.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteAll}
                  disabled={deletingAllLoops || loadingLoops}
                >
                  {deletingAllLoops ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="mr-2 h-4 w-4" />
                  )}
                  {deletingAllLoops ? 'Deleting...' : 'Delete All'}
                </Button>
              )}
            </div>
          </div>
          {/* Search/Filter Input */}
          {savedLoops.length > 0 && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search loops by title, video, or description..."
                value={loopFilter}
                onChange={e => setLoopFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </CardHeader>
      </Card>

      <div
        className="flex-1 space-y-4 overflow-y-scroll pr-1"
        style={{ height: `calc(100vh - 222px)` }}
      >
        {loadingLoops && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading loops...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!loadingLoops && savedLoops.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Repeat className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No loops saved yet</CardTitle>
              <CardDescription>
                Create loops on YouTube videos to save them here for later use
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingLoops && savedLoops.length > 0 && filteredLoops.length === 0 && loopFilter && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No loops found</CardTitle>
              <CardDescription>
                No loops match your search criteria. Try different keywords.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loadingLoops &&
          filteredLoops.map(loop => (
            <EnhancedLoopCardWithIntegration
              key={loop.id}
              loop={loop}
              integrationService={integrationService}
              onApply={() => onApplyLoop(loop)}
              onDelete={loopId => onDeleteLoop(loopId)}
              onExport={() => onExportLoop(loop)}
              isApplying={applyingLoopId === loop.id}
            />
          ))}
      </div>
    </div>
  )
}
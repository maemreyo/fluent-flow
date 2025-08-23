import React, { useState } from 'react'
import { FileText, Search, Clock, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

interface TranscriptSegment {
  id: string
  timestamp: string
  text: string
  isHighlighted: boolean
  isLoopSegment?: boolean
  loopId?: string
  startTime: number
  endTime: number
}

interface TranscriptAnalysis {
  wordCount: number
  estimatedReadingTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  keyPhrases: string[]
  languageLevel: string
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  analysis: TranscriptAnalysis
  isLoading?: boolean
  error?: string | null
  onSegmentClick?: (startTime: number, endTime: number) => void
  onSearch?: (query: string) => void
}

export function TranscriptViewer({
  segments,
  analysis,
  isLoading = false,
  error = null,
  onSegmentClick,
  onSearch
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const filteredSegments = searchQuery
    ? segments.filter(segment => 
        segment.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : segments

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {error.includes('NOT_AVAILABLE') 
              ? 'Transcript not available for this video'
              : 'Failed to load transcript'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Loading transcript...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Transcript
            {segments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {segments.length} segments
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Analysis Section */}
        {showAnalysis && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Difficulty</p>
                <Badge className={`mt-1 text-xs ${getDifficultyColor(analysis.difficulty)}`}>
                  {analysis.languageLevel}
                </Badge>
              </div>
              <div className="text-center rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Reading Time</p>
                <p className="text-sm font-medium">{analysis.estimatedReadingTime}m</p>
              </div>
            </div>
            
            {analysis.keyPhrases.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Key Phrases</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.keyPhrases.slice(0, 3).map((phrase, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {phrase}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {segments.length > 0 && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        )}
      </CardHeader>

      {/* Transcript Content */}
      {isExpanded && segments.length > 0 && (
        <CardContent className="max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {filteredSegments.map(segment => (
              <div
                key={segment.id}
                className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                  segment.isHighlighted 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => onSegmentClick?.(segment.startTime, segment.endTime)}
                title="Click to navigate to this timestamp"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {segment.timestamp}
                  </Badge>
                  {segment.isLoopSegment && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      Loop
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed">{segment.text}</p>
              </div>
            ))}
            
            {filteredSegments.length === 0 && searchQuery && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No segments match "{searchQuery}"
              </p>
            )}
          </div>
        </CardContent>
      )}

      {/* Collapsed Preview */}
      {!isExpanded && segments.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            {segments.slice(0, 2).map(segment => (
              <div
                key={segment.id}
                className="cursor-pointer rounded border p-2 text-sm transition-colors hover:bg-muted/50"
                onClick={() => onSegmentClick?.(segment.startTime, segment.endTime)}
              >
                <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                <p className="mt-1 line-clamp-2">{segment.text}</p>
              </div>
            ))}
            {segments.length > 2 && (
              <p className="text-center text-xs text-muted-foreground">
                +{segments.length - 2} more segments
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
import React from 'react'
import { TranscriptViewer } from './transcript-viewer'
import { useTranscriptQuery } from '../../lib/hooks/use-transcript-query'
import { 
  highlightLoopSegments, 
  analyzeTranscriptDifficulty, 
  formatTranscriptForDisplay 
} from '../../lib/utils/transcript-analysis'
import type { YouTubeVideoInfo, SavedLoop } from '../../lib/types/fluent-flow-types'

interface TranscriptIntegrationProps {
  currentVideo: YouTubeVideoInfo | null
  savedLoops: SavedLoop[]
  formatTime: (seconds: number) => string
  onNavigateToTime?: (time: number) => void
}

export function TranscriptIntegration({
  currentVideo,
  savedLoops,
  formatTime,
  onNavigateToTime
}: TranscriptIntegrationProps) {
  // Only fetch transcript if we have a current video
  const {
    data: transcriptData,
    isLoading,
    error
  } = useTranscriptQuery(
    currentVideo?.videoId || '',
    0, // Full video transcript
    currentVideo ? 999999 : 0, // Large end time to get full transcript
    'en' // Default to English
  )

  // Transform transcript data for display
  const processTranscriptData = () => {
    if (!transcriptData?.segments) {
      return {
        segments: [],
        analysis: {
          wordCount: 0,
          estimatedReadingTime: 0,
          difficulty: 'easy' as const,
          keyPhrases: [],
          languageLevel: 'Beginner'
        }
      }
    }

    // Convert API segments to our format
    const baseSegments = transcriptData.segments.map(segment => ({
      start: segment.start,
      end: segment.end || segment.start + 5, // Default 5-second duration if no end time
      text: segment.text
    }))

    // Highlight segments that match saved loops
    const highlightedSegments = highlightLoopSegments(baseSegments, savedLoops)

    // Analyze transcript for learning insights
    const analysis = analyzeTranscriptDifficulty(baseSegments)

    // Format for display
    const displaySegments = formatTranscriptForDisplay(highlightedSegments, formatTime)

    return {
      segments: displaySegments,
      analysis
    }
  }

  const { segments, analysis } = processTranscriptData()

  const handleSegmentClick = (startTime: number, endTime: number) => {
    // Navigate to the time in the video
    onNavigateToTime?.(startTime)
    
    // Send message to content script to seek to time
    if (currentVideo) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs[0]
        if (activeTab?.id && activeTab.url?.includes(currentVideo.videoId)) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: 'SEEK_TO_TIME',
            time: startTime
          }).catch(error => {
            console.log('Could not navigate to time in video:', error)
          })
        }
      })
    }
  }

  const handleSearch = (query: string) => {
    // The search filtering is handled within the TranscriptViewer component
    console.log('Searching transcript for:', query)
  }

  // Don't show transcript if no current video
  if (!currentVideo) {
    return null
  }

  return (
    <TranscriptViewer
      segments={segments}
      analysis={analysis}
      isLoading={isLoading}
      error={error?.message || null}
      onSegmentClick={handleSegmentClick}
      onSearch={handleSearch}
    />
  )
}
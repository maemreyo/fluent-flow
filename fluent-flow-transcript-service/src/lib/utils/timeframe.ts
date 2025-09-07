interface TimeframeReference {
  text: string
  startTime: number
  endTime: number
  originalText: string
}

export type ExplanationSegment =
  | { type: 'text'; content: string }
  | { type: 'timeframe'; content: TimeframeReference }

export const formatVideoTimestamp = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getVideoLink = (videoUrl?: string, startTime?: number) => {
  if (!videoUrl || startTime === undefined || startTime === null) return null

  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    try {
      const url = new URL(videoUrl)
      const videoId =
        url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v')

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`
      }
    } catch (error) {
      console.error('Invalid video URL:', videoUrl, error)
      if (videoUrl.includes('youtu.be')) {
        const videoId = videoUrl.split('/').pop()?.split('?')[0]
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`
        }
      }
      return videoUrl
    }
  }
  return videoUrl
}

export const extractTimeframeReferences = (explanation: string): TimeframeReference[] => {
  const timeframeRegex = /(?:\[|\()(\d+):(\d+)-(\d+):(\d+)(?:\]|\))/g
  const timeframes: TimeframeReference[] = []

  let match
  while ((match = timeframeRegex.exec(explanation)) !== null) {
    const [fullMatch, startMin, startSec, endMin, endSec] = match
    const startTime = parseInt(startMin, 10) * 60 + parseInt(startSec, 10)
    const endTime = parseInt(endMin, 10) * 60 + parseInt(endSec, 10)

    timeframes.push({
      text: fullMatch,
      startTime,
      endTime,
      originalText: fullMatch
    })
  }

  return timeframes
}

export const parseExplanationWithTimeframes = (explanation: string): ExplanationSegment[] => {
  const timeframes = extractTimeframeReferences(explanation)
  if (timeframes.length === 0) {
    return [{ type: 'text', content: explanation }]
  }

  const segments: ExplanationSegment[] = []
  let lastIndex = 0

  timeframes.forEach(timeframe => {
    const beforeText = explanation.slice(
      lastIndex,
      explanation.indexOf(timeframe.originalText, lastIndex)
    )
    if (beforeText) {
      segments.push({ type: 'text', content: beforeText })
    }

    segments.push({ type: 'timeframe', content: timeframe })

    lastIndex =
      explanation.indexOf(timeframe.originalText, lastIndex) + timeframe.originalText.length
  })

  const remainingText = explanation.slice(lastIndex)
  if (remainingText) {
    segments.push({ type: 'text', content: remainingText })
  }

  return segments
}
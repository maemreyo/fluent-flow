import React from 'react'

interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

interface TranscriptSectionProps {
  segments: TranscriptSegment[]
  language?: string
}

export const TranscriptSection: React.FC<TranscriptSectionProps> = ({
  segments,
  language = 'en'
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-2">
      <div className="max-h-32 overflow-y-auto rounded border border-gray-200 bg-white p-3">
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex gap-3 text-sm">
              <span className="min-w-[45px] flex-shrink-0 font-mono text-xs text-blue-600">
                {formatTime(segment.start)}
              </span>
              <span className="leading-relaxed text-gray-700">{segment.text}</span>
            </div>
          ))}
        </div>
      </div>
      {/* <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>{segments.length} segments</span>
        <span>•</span>
        <span>Language: {language}</span>
      </div> */}
    </div>
  )
}

export default TranscriptSection

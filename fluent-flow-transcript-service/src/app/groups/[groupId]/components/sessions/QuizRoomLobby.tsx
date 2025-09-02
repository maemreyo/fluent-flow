'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  Users, 
  PlayCircle, 
  AlertCircle,
  CheckCircle,
  Calendar
} from 'lucide-react'

interface SessionParticipant {
  user_id: string
  user_email: string
  username?: string
  is_online: boolean
}

interface QuizRoomLobbyProps {
  session: {
    id: string
    quiz_title: string
    video_title?: string
    scheduled_at?: string
    questions_data?: any
  }
  participants: SessionParticipant[]
  countdown: number | null
}

export function QuizRoomLobby({ session, participants, countdown }: QuizRoomLobbyProps) {
  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCountdownStatus = (seconds: number) => {
    if (seconds > 300) return { color: 'text-blue-600', icon: Clock, message: 'Session starting soon' }
    if (seconds > 60) return { color: 'text-orange-600', icon: AlertCircle, message: 'Get ready!' }
    return { color: 'text-red-600', icon: AlertCircle, message: 'Starting any moment!' }
  }

  const questionsCount = session.questions_data?.questions?.length || 0
  const status = countdown !== null ? getCountdownStatus(countdown) : null

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PlayCircle className="w-6 h-6 text-blue-600" />
          <CardTitle className="text-blue-800">Quiz Lobby</CardTitle>
        </div>
        <CardDescription>
          Waiting for the quiz session to begin
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Countdown Display */}
        {countdown !== null && countdown > 0 && status && (
          <div className="text-center space-y-3">
            <div className={`text-4xl font-bold ${status.color}`}>
              {formatCountdown(countdown)}
            </div>
            <div className="flex items-center justify-center gap-2">
              <status.icon className={`w-5 h-5 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>
                {status.message}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Scheduled Time</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {session.scheduled_at 
                ? new Date(session.scheduled_at).toLocaleString()
                : 'Not scheduled'
              }
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Participants Ready</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {participants.length} members joined
            </p>
          </div>

          {questionsCount > 0 && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Quiz Information</span>
              </div>
              <p className="text-muted-foreground ml-6">
                {questionsCount} questions prepared
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Ready Status */}
        <div className="bg-white/60 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Ready to Start</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {participants.slice(0, 3).map((participant, index) => (
              <div key={participant.user_id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">
                  {participant.username || participant.user_email.split('@')[0]}
                </span>
              </div>
            ))}
            
            {participants.length > 3 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">
                  +{participants.length - 3} more members
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• All participants will start the quiz simultaneously</li>
            <li>• Complete the quiz at your own pace</li>
            <li>• Results will be shared with the group after completion</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
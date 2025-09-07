'use client'

import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'

export function NotJoinedView({
  groupId,
  sessionId
}: {
  groupId: string
  sessionId: string
}) {
  const handleJoinSession = () => {
    // Store intended destination for seamless redirect after auth
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_redirect_destination', JSON.stringify({
        type: 'session',
        groupId,
        sessionId,
        timestamp: Date.now()
      }))
    }
    
    // Navigate to group page where auth will happen
    window.location.href = `/groups/${groupId}`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Card className="border-white/20 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">Group Quiz Session</h1>
          <p className="mb-6 text-gray-600">
            You need to join this group first to participate in the quiz session.
          </p>
          <div className="space-y-3">
            <Button
              onClick={handleJoinSession}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Join Group & Start Quiz
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
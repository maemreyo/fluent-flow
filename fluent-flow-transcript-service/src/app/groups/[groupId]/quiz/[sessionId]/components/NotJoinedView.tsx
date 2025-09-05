'use client'

import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'

export function NotJoinedView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Card className="border-white/20 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">Group Quiz Session</h1>
          <p className="mb-6 text-gray-600">
            You need to join the quiz room first to participate in this group session.
          </p>
          <Button
            onClick={() => window.history.back()}
            className="w-full"
          >
            Go Back to Quiz Room
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
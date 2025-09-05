'use client'

import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'
import { AlertTriangle } from 'lucide-react'

interface ExpiredSessionViewProps {
  groupId: string
}

export function ExpiredSessionView({ groupId }: ExpiredSessionViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Card className="max-w-md border-white/20 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-800">Quiz Session Expired</h1>
            <p className="leading-relaxed text-gray-600">
              This quiz session has expired and is no longer available. Please request a new
              session from the group organizer.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => (window.location.href = `/groups/${groupId}`)}
              className="w-full"
            >
              Back to Group
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/groups')}
              className="w-full"
            >
              All Groups
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import { NextRequest, NextResponse } from 'next/server'
import { createLoopManagementService } from '@/lib/services/loop-management-service'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; loopId: string }> }
) {
  try {
    const { groupId, loopId } = await params
    const supabase = getSupabaseServer(request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const service = createLoopManagementService(request)
    await service.deleteLoop(loopId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete loop:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete loop' },
      { status: 500 }
    )
  }
}
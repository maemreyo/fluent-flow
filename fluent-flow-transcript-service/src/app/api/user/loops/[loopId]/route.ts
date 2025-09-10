import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'
import { LoopManagementService } from '@/lib/services/loop-management-service'
import { corsResponse, corsHeaders } from '@/lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { loopId: string } }
) {
  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    
    // Get current user
    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { loopId } = params

    if (!loopId) {
      return corsResponse(
        { error: 'Loop ID is required' },
        400
      )
    }

    // Delete the user loop
    const service = new LoopManagementService()
    await service.deleteUserLoop(user.id, loopId)

    return corsResponse({ success: true })
  } catch (error) {
    console.error('Error deleting user loop:', error)
    return corsResponse(
      { error: 'Failed to delete loop' },
      500
    )
  }
}
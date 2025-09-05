import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  try {
    const { groupId, sessionId } = await params
    const supabase = getSupabaseServer(request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get questions for this session by difficulty
    const { data: questionSets, error } = await supabase!
      .from('shared_question_sets')
      .select('*')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch session questions:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    // Group by difficulty if metadata contains difficulty info
    const questionsByDifficulty: Record<string, any> = {}
    let totalQuestions = 0

    questionSets?.forEach(set => {
      const difficulty = set.metadata?.difficulty || 'mixed'
      const questionsCount = set.questions?.length || 0
      
      questionsByDifficulty[difficulty] = {
        shareToken: set.share_token,
        count: questionsCount,
        questions: set.questions
      }
      
      totalQuestions += questionsCount
    })

    return NextResponse.json({
      success: true,
      data: {
        questionsByDifficulty,
        totalQuestions,
        sessionId,
        groupId
      }
    })
  } catch (error) {
    console.error('Failed to get session questions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get session questions' },
      { status: 500 }
    )
  }
}
// New database-first shared questions service
// Replaces in-memory storage with persistent database storage

import { getSupabaseServer, getCurrentUserServer } from '../supabase/server'
import { NextRequest } from 'next/server'

export interface SharedQuestionSet {
  id: string
  share_token: string
  title: string
  video_title?: string
  video_url?: string
  start_time?: number
  end_time?: number
  questions: any[]
  vocabulary: any[]
  transcript?: string
  metadata: any
  is_public: boolean
  created_by?: string
  group_id?: string
  session_id?: string
  expires_at: string
  created_at: string
  updated_at: string
}

export class SharedQuestionsService {
  constructor(private request?: NextRequest) {}

  async createSharedQuestionSet(data: {
    title: string
    questions: any[]
    vocabulary?: any[]
    transcript?: string
    video_title?: string
    video_url?: string
    start_time?: number
    end_time?: number
    is_public?: boolean
    group_id?: string
    session_id?: string
    expires_hours?: number
    metadata?: any
  }): Promise<SharedQuestionSet> {
    const supabase = this.request ? getSupabaseServer(this.request) : null
    if (!supabase) {
      throw new Error('Database not configured')
    }

    // Try server-side authentication first (for web users)
    let user = this.request ? await getCurrentUserServer(supabase) : null
    
    // If no user from cookies, try Bearer token authentication (for extension users)
    if (!user && this.request) {
      const authHeader = this.request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Verify the token with Supabase
        const { data: tokenUser, error } = await supabase.auth.getUser(token)
        if (!error && tokenUser.user) {
          user = tokenUser.user
        }
      }
    }
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (data.expires_hours || 4))

    const insertData = {
      title: data.title,
      video_title: data.video_title,
      video_url: data.video_url,
      start_time: data.start_time,
      end_time: data.end_time,
      questions: data.questions,
      vocabulary: data.vocabulary || [],
      transcript: data.transcript,
      metadata: {
        totalQuestions: data.questions.length,
        createdAt: new Date().toISOString(),
        sharedBy: user?.email || 'Anonymous',
        difficulty: 'mixed',
        topics: [],
        ...data.metadata
      },
      is_public: data.is_public ?? true,
      created_by: user?.id,
      group_id: data.group_id,
      session_id: data.session_id,
      expires_at: expiresAt.toISOString()
    }

    const { data: questionSet, error } = await supabase
      .from('shared_question_sets')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create shared question set: ${error.message}`)
    }

    return questionSet
  }

  async getSharedQuestionSet(shareToken: string): Promise<SharedQuestionSet | null> {
    const supabase = this.request ? getSupabaseServer(this.request) : null
    if (!supabase) {
      throw new Error('Database not configured')
    }

    const { data: questionSet, error } = await supabase
      .from('shared_question_sets')
      .select('*')
      .eq('share_token', shareToken)
      .single()

    if (error || !questionSet) {
      return null
    }

    // Check if expired (for public sets)
    if (questionSet.is_public && new Date(questionSet.expires_at) < new Date()) {
      return null
    }

    return questionSet
  }

  async updateSharedQuestionSet(shareToken: string, updates: Partial<SharedQuestionSet>): Promise<SharedQuestionSet> {
    const supabase = this.request ? getSupabaseServer(this.request) : null
    if (!supabase) {
      throw new Error('Database not configured')
    }

    const { data: questionSet, error } = await supabase
      .from('shared_question_sets')
      .update(updates)
      .eq('share_token', shareToken)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update shared question set: ${error.message}`)
    }

    return questionSet
  }

  async getGroupQuestionSets(groupId: string): Promise<SharedQuestionSet[]> {
    const supabase = this.request ? getSupabaseServer(this.request) : null
    if (!supabase) {
      throw new Error('Database not configured')
    }

    const { data: questionSets, error } = await supabase
      .from('shared_question_sets')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch group question sets: ${error.message}`)
    }

    return questionSets || []
  }

  async deleteExpiredQuestionSets(): Promise<number> {
    const supabase = this.request ? getSupabaseServer(this.request) : null
    if (!supabase) {
      throw new Error('Database not configured')
    }

    const { data, error } = await supabase
      .from('shared_question_sets')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('is_public', true)
      .select('id')

    if (error) {
      throw new Error(`Failed to delete expired question sets: ${error.message}`)
    }

    return data?.length || 0
  }

  // Helper method to generate share URL
  generateShareUrl(shareToken: string, baseUrl?: string, groupId?: string, sessionId?: string): string {
    const url = new URL(`/questions/${shareToken}`, baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3838')
    
    if (groupId) {
      url.searchParams.set('groupId', groupId)
    }
    if (sessionId) {
      url.searchParams.set('sessionId', sessionId)
    }
    
    return url.toString()
  }
}

// Singleton instance for server-side usage
export const createSharedQuestionsService = (request?: NextRequest) => {
  return new SharedQuestionsService(request)
}
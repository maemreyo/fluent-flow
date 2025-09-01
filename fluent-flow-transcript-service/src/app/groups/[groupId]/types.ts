export interface GroupMember {
  user_id: string
  username: string
  avatar?: string
  role: string
  joined_at: string
  contribution: number
  last_active: string
}

export interface QuizSession {
  id: string
  quiz_token: string
  quiz_title?: string
  video_url?: string
  video_title?: string
  scheduled_at: string
  started_at?: string
  ended_at?: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  created_by: string
  result_count: number
}

export interface StudyGroup {
  id: string
  name: string
  description: string
  language: string
  level: string
  created_by: string
  created_at: string
  is_private: boolean
  max_members: number
  group_code: string
  member_count: number
  members: GroupMember[]
  user_role: string | null
  is_member: boolean
  recent_sessions: QuizSession[]
}

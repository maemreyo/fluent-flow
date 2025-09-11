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
  member_count: number
  study_group_members: Array<{
    user_id: string
    username: string
    role: string
    joined_at: string
  }>
}

export type Group = StudyGroup

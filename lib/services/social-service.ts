import { supabase } from '../supabase/client'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: any
  unlocked: boolean
  progress?: number
  maxProgress?: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface StudyGroup {
  id: string
  name: string
  description: string
  memberCount: number
  maxMembers: number
  language: string
  level: 'beginner' | 'intermediate' | 'advanced'
  isJoined: boolean
  isPrivate: boolean
  avatar: string
  // Additional fields to match social-features interface
  createdBy: string
  createdAt: Date
  members: any[]
  tags: string[]
  stats: {
    totalSessions: number
    avgProgress: number
    mostActiveDay: string
  }
}

export interface UserStats {
  totalWordsAdded: number
  totalPhrasesAdded: number
  wordsLearned: number
  phrasesLearned: number
  currentStreakDays: number
  longestStreakDays: number
  totalReviews: number
  correctReviews: number
}

class SocialService {
  async getUserStats(): Promise<UserStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return {
          totalWordsAdded: 0,
          totalPhrasesAdded: 0,
          wordsLearned: 0,
          phrasesLearned: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          totalReviews: 0,
          correctReviews: 0
        }
      }

      const { data: stats, error } = await supabase
        .from('user_learning_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error || !stats) {
        return {
          totalWordsAdded: 0,
          totalPhrasesAdded: 0,
          wordsLearned: 0,
          phrasesLearned: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          totalReviews: 0,
          correctReviews: 0
        }
      }

      return {
        totalWordsAdded: stats.total_words_added || 0,
        totalPhrasesAdded: stats.total_phrases_added || 0,
        wordsLearned: stats.words_learned || 0,
        phrasesLearned: stats.phrases_learned || 0,
        currentStreakDays: stats.current_streak_days || 0,
        longestStreakDays: stats.longest_streak_days || 0,
        totalReviews: stats.total_reviews || 0,
        correctReviews: stats.correct_reviews || 0
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        totalWordsAdded: 0,
        totalPhrasesAdded: 0,
        wordsLearned: 0,
        phrasesLearned: 0,
        currentStreakDays: 0,
        longestStreakDays: 0,
        totalReviews: 0,
        correctReviews: 0
      }
    }
  }

  async getUserAchievements(): Promise<Achievement[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: achievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })

      if (error) {
        console.error('Error fetching achievements:', error)
        return []
      }

      // Transform database achievements to UI format
      return achievements?.map(ach => ({
        id: ach.achievement_id,
        title: ach.name,
        description: ach.description,
        icon: null, // Will be set by component
        unlocked: true, // If it's in the table, it's unlocked
        rarity: ach.rarity as Achievement['rarity']
      })) || []
    } catch (error) {
      console.error('Error fetching achievements:', error)
      return []
    }
  }

  async getStudyGroups(): Promise<StudyGroup[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get all study groups with member counts
      const { data: groups, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members!inner (
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching study groups:', error)
        return []
      }

      // Check which groups the user is a member of
      const { data: userMemberships, error: memberError } = await supabase
        .from('study_group_members')
        .select('group_id')
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Error fetching user memberships:', error)
      }

      const userGroupIds = new Set(userMemberships?.map(m => m.group_id) || [])

      return groups?.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description || '',
        memberCount: Array.isArray(group.study_group_members) ? group.study_group_members.length : 0,
        maxMembers: group.max_members || 20,
        language: group.language,
        level: group.level as StudyGroup['level'],
        isJoined: userGroupIds.has(group.id),
        isPrivate: group.is_private || false,
        avatar: '📚', // Default avatar, could be stored in database
        // Additional fields to match social-features interface
        createdBy: group.created_by || '',
        createdAt: new Date(group.created_at),
        members: [], // Would need to fetch from study_group_members table
        tags: group.tags || [],
        stats: {
          totalSessions: 0, // Would need to calculate from practice sessions
          avgProgress: 0, // Would need to calculate from member progress
          mostActiveDay: 'Monday' // Would need to analyze activity patterns
        }
      })) || []
    } catch (error) {
      console.error('Error fetching study groups:', error)
      return []
    }
  }

  // Generate achievements based on real user stats
  generateDynamicAchievements(userStats: UserStats): Achievement[] {
    const achievements: Achievement[] = []

    // Import the icons here to avoid circular dependencies
    const iconMapping = {
      Star: '⭐',
      Flame: '🔥', 
      Trophy: '🏆',
      Share2: '📤'
    }

    // First Star Achievement
    achievements.push({
      id: 'first_star',
      title: 'Vocabulary Pioneer',
      description: 'Star your first vocabulary item.',
      icon: iconMapping.Star,
      unlocked: userStats.totalWordsAdded > 0,
      rarity: 'common'
    })

    // Learning Flame
    achievements.push({
      id: 'streak_flame',
      title: 'Learning Flame',
      description: 'Keep a 7-day practice streak.',
      icon: iconMapping.Flame,
      unlocked: userStats.currentStreakDays >= 7,
      progress: Math.min(userStats.currentStreakDays, 7),
      maxProgress: 7,
      rarity: 'rare'
    })

    // Word Collector
    achievements.push({
      id: 'word_collector',
      title: 'Word Collector',
      description: 'Learn 25 vocabulary items.',
      icon: iconMapping.Trophy,
      unlocked: userStats.wordsLearned + userStats.phrasesLearned >= 25,
      progress: userStats.wordsLearned + userStats.phrasesLearned,
      maxProgress: 25,
      rarity: 'epic'
    })

    // Review Master
    achievements.push({
      id: 'review_master',
      title: 'Review Master',
      description: 'Complete 100 vocabulary reviews.',
      icon: iconMapping.Trophy,
      unlocked: userStats.totalReviews >= 100,
      progress: Math.min(userStats.totalReviews, 100),
      maxProgress: 100,
      rarity: 'epic'
    })

    return achievements
  }
}

export const socialService = new SocialService()
export default socialService
import React, { useEffect, useState } from 'react'
import {
  Award,
  Flame,
  Globe,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Star,
  Trophy,
  UserPlus,
  Users
} from 'lucide-react'
import {
  userVocabularyService,
  type LearningStats,
  type UserVocabularyItem
} from '../../lib/services/user-vocabulary-service'
import { socialService } from '../../lib/services/social-service'
import { supabase } from '../../lib/supabase/client'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Progress } from '../ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'

// --- COLOR & STYLE HELPERS ---
const getDifficultyBadgeStyle = (level: 'beginner' | 'intermediate' | 'advanced') => {
  switch (level) {
    case 'beginner':
      return 'border-green-300 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700'
    case 'intermediate':
      return 'border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700'
    case 'advanced':
      return 'border-purple-300 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700'
    default:
      return 'border-border bg-secondary text-secondary-foreground'
  }
}

const getAchievementStyle = (rarity: Achievement['rarity'], unlocked: boolean) => {
  const styles = {
    common: {
      card: 'bg-gray-50 dark:bg-gray-800/50',
      icon: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      badge: 'border-gray-300 bg-gray-100 text-gray-800'
    },
    rare: {
      card: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
      badge: 'border-blue-300 bg-blue-100 text-blue-800'
    },
    epic: {
      card: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
      badge: 'border-purple-300 bg-purple-100 text-purple-800'
    },
    legendary: {
      card: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
      badge: 'border-amber-300 bg-amber-100 text-amber-800'
    }
  }
  const style = styles[rarity]
  if (unlocked) {
    return {
      ...style,
      card: cn(style.card, 'border-l-4', style.badge.split(' ')[0].replace('-300', '-500'))
    }
  }
  return { card: 'bg-muted/50', icon: 'bg-muted', badge: '' }
}

// --- INTERFACES ---
interface SocialGamificationProps {}
interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ElementType
  unlocked: boolean
  progress?: number
  maxProgress?: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}
interface StudyGroup {
  id: string
  name: string
  description: string
  memberCount: number
  maxMembers: number
  language: string
  level: 'beginner' | 'intermediate' | 'advanced'
  isJoined: boolean
  isPrivate: boolean
  avatar?: string
}

// --- SUB-COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, colorClass, children }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={cn('h-4 w-4 text-muted-foreground', colorClass)} />
    </CardHeader>
    <CardContent>
      <div className={cn('text-2xl font-bold', colorClass)}>{value}</div>
      {children}
    </CardContent>
  </Card>
)

// --- MAIN COMPONENT ---
export const SocialGamification: React.FC<SocialGamificationProps> = () => {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [recentWords, setRecentWords] = useState<UserVocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loadSocialData = async () => {
      setIsLoading(true)
      try {
        // Get real user stats from database
        const userStats = await socialService.getUserStats()
        
        // Convert UserStats to LearningStats format
        const { data: { user } } = await supabase.auth.getUser()
        const learningStats: LearningStats = {
          id: `stats_${user?.id || 'anonymous'}`,
          userId: user?.id || 'anonymous',
          totalWordsAdded: userStats.totalWordsAdded,
          totalPhrasesAdded: userStats.totalPhrasesAdded,
          wordsLearned: userStats.wordsLearned,
          phrasesLearned: userStats.phrasesLearned,
          currentStreakDays: userStats.currentStreakDays,
          longestStreakDays: userStats.longestStreakDays,
          lastPracticeDate: undefined, // Not available in UserStats
          totalReviews: userStats.totalReviews,
          correctReviews: userStats.correctReviews,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setStats(learningStats)

        // Generate achievements based on real stats
        const dynamicAchievements = socialService.generateDynamicAchievements(userStats)
        
        // Also get any unlocked achievements from database
        const unlockedAchievements = await socialService.getUserAchievements()
        
        // Combine dynamic and unlocked achievements, convert icons
        const allAchievements = [...dynamicAchievements, ...unlockedAchievements].map(achievement => ({
          ...achievement,
          icon: achievement.id === 'first_star' ? Star : 
                achievement.id === 'streak_flame' ? Flame :
                achievement.id === 'word_collector' ? Trophy :
                achievement.id === 'review_master' ? Trophy : 
                Star // Default icon
        }))
        setAchievements(allAchievements)

        // Get real study groups from database
        const realStudyGroups = await socialService.getStudyGroups()
        setStudyGroups(realStudyGroups)
        
        // Get recent vocabulary words
        const recentVocab = await userVocabularyService.getUserVocabularyDeck({ 
          limit: 10
        })
        setRecentWords(recentVocab)
        
      } catch (error) {
        console.error('Failed to load social data:', error)
        
        // Fallback to empty state
        setStats({
          id: 'fallback-id',
          userId: 'fallback-user-id',
          totalWordsAdded: 0,
          totalPhrasesAdded: 0,
          wordsLearned: 0,
          phrasesLearned: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          lastPracticeDate: undefined,
          totalReviews: 0,
          correctReviews: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        setAchievements([])
        setStudyGroups([])
        setRecentWords([])
      } finally {
        setIsLoading(false)
      }
    }
    loadSocialData()
  }, [])

  const handleJoinStudyGroup = (groupId: string) => {
    setStudyGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {
              ...g,
              isJoined: !g.isJoined,
              memberCount: g.isJoined ? g.memberCount - 1 : g.memberCount + 1
            }
          : g
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Social Hub...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">
            <Trophy className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="share">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="mr-2 h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Award className="mr-2 h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Current Streak"
              value={`${stats?.currentStreakDays || 0} days`}
              icon={Flame}
              colorClass="text-orange-500"
            >
              <p className="text-xs text-muted-foreground">
                {stats?.currentStreakDays === 0
                  ? 'Start your streak today!'
                  : 'Keep it burning! 🔥'}
              </p>
            </StatCard>
            <StatCard
              title="Vocabulary Learned"
              value={(stats?.wordsLearned || 0) + (stats?.phrasesLearned || 0)}
              icon={Star}
              colorClass="text-blue-500"
            >
              <p className="text-xs text-muted-foreground">Words & phrases mastered</p>
            </StatCard>
            <StatCard
              title="Study Groups"
              value={studyGroups.filter(g => g.isJoined).length}
              icon={Users}
              colorClass="text-purple-500"
            >
              <p className="text-xs text-muted-foreground">Active memberships</p>
            </StatCard>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Learning Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className="space-y-2 text-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all',
                      index < (stats?.currentStreakDays || 0) % 7
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {index < (stats?.currentStreakDays || 0) % 7 ? (
                      <Flame className="h-5 w-5" />
                    ) : (
                      ''
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{day}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Share Your Discoveries</CardTitle>
              <CardDescription>
                Share interesting words you've learned with the community.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentWords.map(word => (
                <Card key={word.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{word.text}</p>
                      <p className="truncate text-sm text-muted-foreground">{word.definition}</p>
                    </div>
                    <ShareWordDialog word={word} studyGroups={studyGroups} />
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Study Groups</CardTitle>
            <CreateGroupDialog />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {studyGroups.map(group => (
              <Card
                key={group.id}
                className={cn(
                  'flex flex-col transition-colors hover:border-primary/50',
                  group.isJoined && 'border-primary'
                )}
              >
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                    {group.avatar}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{group.language}</span>
                      <span>&bull;</span>
                      <Badge
                        variant="outline"
                        className={cn('capitalize', getDifficultyBadgeStyle(group.level))}
                      >
                        {group.level}
                      </Badge>
                    </div>
                  </div>
                  {group.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="mb-4 text-sm text-muted-foreground">{group.description}</p>
                  <Progress
                    value={(group.memberCount / group.maxMembers) * 100}
                    className="mb-2 h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {group.memberCount} / {group.maxMembers} members
                  </p>
                </CardContent>
                <div className="p-4 pt-0">
                  <Button
                    size="sm"
                    variant={group.isJoined ? 'secondary' : 'default'}
                    onClick={() => handleJoinStudyGroup(group.id)}
                    className="w-full"
                  >
                    {group.isJoined ? (
                      <>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Enter Chat
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Join Group
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Gallery</CardTitle>
              <CardDescription>Track your learning milestones and unlock rewards.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {achievements.map(ach => {
                const style = getAchievementStyle(ach.rarity, ach.unlocked)
                return (
                  <Card key={ach.id} className={cn('flex items-start gap-4 p-4', style.card)}>
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                        style.icon
                      )}
                    >
                      <ach.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold">{ach.title}</h3>
                        {ach.unlocked && (
                          <Badge variant="outline" className={cn(style.badge, 'bg-background')}>
                            <Star className="mr-1 h-3 w-3" />
                            Unlocked
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{ach.description}</p>
                      {!ach.unlocked && ach.progress !== undefined && (
                        <div className="mt-2">
                          <Progress
                            value={(ach.progress / ach.maxProgress!) * 100}
                            className="h-2"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ach.progress} / {ach.maxProgress}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const ShareWordDialog = ({ word, studyGroups }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button size="sm" variant="ghost">
        <Share2 className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share Vocabulary</DialogTitle>
        <DialogDescription>
          Share "{word.text}" with the community or a study group.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Card className="p-3">
          <p className="font-semibold">{word.text}</p>
          <p className="text-sm text-muted-foreground">{word.definition}</p>
        </Card>
        <Textarea placeholder="Add a note (optional)..." />
        <Select defaultValue="public">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">🌍 Public Community</SelectItem>
            {studyGroups
              .filter(g => g.isJoined)
              .map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.avatar} {g.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button className="w-full">
          <Send className="mr-2 h-4 w-4" />
          Share Now
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)

const CreateGroupDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Create Group
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Study Group</DialogTitle>
        <DialogDescription>Start a new community for vocabulary learning.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Input placeholder="Group Name (e.g., Medical Terminology)" />
        <Textarea placeholder="Describe your group's focus and goals..." />
        <div className="grid grid-cols-2 gap-4">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full">Create Study Group</Button>
      </div>
    </DialogContent>
  </Dialog>
)

export default SocialGamification

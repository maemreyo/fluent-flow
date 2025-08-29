import React, { useEffect, useState } from 'react'
import { Award, Calendar, Share2, Trophy, Users, Star, MessageCircle, Crown, Flame, Send, Plus, UserPlus, Copy, ExternalLink } from 'lucide-react'
import { userVocabularyService, type LearningStats, type UserVocabularyItem } from '../../lib/services/user-vocabulary-service'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Separator } from '../ui/separator'
import { Progress } from '../ui/progress'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface SocialGamificationProps {
  // Remove unused prop since navigation not needed in social component
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  unlockedAt?: string
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
  recentActivity: string
  isJoined: boolean
  avatar?: string
  isPrivate: boolean
}


export const SocialGamification: React.FC<SocialGamificationProps> = () => {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [recentWords, setRecentWords] = useState<UserVocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedWordToShare, setSelectedWordToShare] = useState<UserVocabularyItem | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loadSocialData = async () => {
      setIsLoading(true)
      try {
        const userStats = await userVocabularyService.getUserStats()
        const vocabulary = await userVocabularyService.getUserVocabularyDeck({ limit: 10 })
        
        setStats(userStats)
        setRecentWords(vocabulary)
        
        // Enhanced achievements with better categories and rarities
        const mockAchievements: Achievement[] = [
          {
            id: 'first_star',
            title: 'Vocabulary Pioneer',
            description: 'Star your first vocabulary item to begin your learning journey',
            icon: <Star className="h-5 w-5" />,
            unlocked: userStats.totalWordsAdded > 0 || userStats.totalPhrasesAdded > 0,
            unlockedAt: userStats.totalWordsAdded > 0 ? '2024-01-15' : undefined,
            rarity: 'common'
          },
          {
            id: 'streak_flame',
            title: 'Learning Flame',
            description: 'Keep your practice streak burning for 7 consecutive days',
            icon: <Flame className="h-5 w-5" />,
            unlocked: userStats.currentStreakDays >= 7,
            progress: Math.min(userStats.currentStreakDays, 7),
            maxProgress: 7,
            rarity: 'rare'
          },
          {
            id: 'word_collector',
            title: 'Word Collector',
            description: 'Build your vocabulary arsenal with 25 learned items',
            icon: <Trophy className="h-5 w-5" />,
            unlocked: (userStats.wordsLearned + userStats.phrasesLearned) >= 25,
            progress: userStats.wordsLearned + userStats.phrasesLearned,
            maxProgress: 25,
            rarity: 'epic'
          },
          {
            id: 'social_sharer',
            title: 'Knowledge Sharer',
            description: 'Share 10 interesting words with the community',
            icon: <Share2 className="h-5 w-5" />,
            unlocked: false,
            progress: 3,
            maxProgress: 10,
            rarity: 'rare'
          }
        ]
        
        setAchievements(mockAchievements)
        
        // Enhanced study groups with more details
        const mockStudyGroups: StudyGroup[] = [
          {
            id: '1',
            name: 'Business English Masters',
            description: 'Focus on professional vocabulary, presentations, and business communication',
            memberCount: 24,
            maxMembers: 30,
            language: 'English',
            level: 'intermediate',
            recentActivity: '2 hours ago',
            isJoined: false,
            isPrivate: false,
            avatar: '💼'
          },
          {
            id: '2', 
            name: 'Advanced Vocabulary Club',
            description: 'Challenge yourself with sophisticated vocabulary and complex phrases',
            memberCount: 18,
            maxMembers: 25,
            language: 'English',
            level: 'advanced',
            recentActivity: '5 hours ago',
            isJoined: true,
            isPrivate: false,
            avatar: '📚'
          },
          {
            id: '3',
            name: 'IELTS Preparation Group',
            description: 'Academic vocabulary and exam strategies for IELTS success',
            memberCount: 35,
            maxMembers: 50,
            language: 'English',
            level: 'intermediate',
            recentActivity: '1 hour ago',
            isJoined: false,
            isPrivate: true,
            avatar: '🎯'
          }
        ]
        
        setStudyGroups(mockStudyGroups)
      } catch (error) {
        console.error('Failed to load social data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSocialData()
  }, [])

  const handleShareWord = (word: UserVocabularyItem) => {
    setSelectedWordToShare(word)
    setShareModalOpen(true)
  }

  const handleJoinStudyGroup = (groupId: string) => {
    setStudyGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, isJoined: !group.isJoined, memberCount: group.isJoined ? group.memberCount - 1 : group.memberCount + 1 }
        : group
    ))
  }

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500'
      case 'epic': return 'from-purple-400 to-pink-500'
      case 'rare': return 'from-blue-400 to-indigo-500'
      case 'common': return 'from-gray-400 to-gray-500'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  const getRarityBadgeColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200'
      case 'epic': return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200'
      case 'rare': return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200'
      case 'common': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading social features...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="share" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Words
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Study Groups
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Learning Streak */}
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">Current Streak</CardTitle>
                <Flame className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-700">{stats?.currentStreakDays || 0}</div>
                <p className="text-xs text-orange-600 mt-1">
                  {stats?.currentStreakDays === 0 ? 'Start your streak today!' : 'Keep it burning! 🔥'}
                </p>
              </CardContent>
            </Card>

            {/* Total Vocabulary */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Vocabulary Learned</CardTitle>
                <Star className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">
                  {(stats?.wordsLearned || 0) + (stats?.phrasesLearned || 0)}
                </div>
                <p className="text-xs text-blue-600 mt-1">Words & phrases mastered</p>
              </CardContent>
            </Card>

            {/* Study Groups */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Study Groups</CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700">
                  {studyGroups.filter(g => g.isJoined).length}
                </div>
                <p className="text-xs text-purple-600 mt-1">Active memberships</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Activity Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Learning Activity
              </CardTitle>
              <CardDescription>Your practice consistency this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const isActive = index < (stats?.currentStreakDays || 0) % 7
                  return (
                    <div key={day} className="text-center">
                      <div className="text-xs text-gray-500 mb-2">{day}</div>
                      <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-orange-100 border-orange-300 text-orange-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}>
                        {isActive ? <Flame className="h-4 w-4" /> : index + 26}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Your Vocabulary Discoveries
              </CardTitle>
              <CardDescription>
                Share interesting words and phrases you've learned with the FluentFlow community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentWords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentWords.slice(0, 6).map(word => (
                    <Card key={word.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{word.text}</h4>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {word.itemType}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {word.difficulty}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {word.definition.length > 80 
                                ? `${word.definition.slice(0, 80)}...` 
                                : word.definition
                              }
                            </p>
                            {word.example && (
                              <p className="text-xs text-gray-500 italic">
                                "{word.example.slice(0, 60)}..."
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShareWord(word)}
                            className="ml-2 shrink-0"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vocabulary to share yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start analyzing videos and starring vocabulary items to build your collection!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Study Groups</h2>
              <p className="text-gray-600">Join communities of learners with similar goals</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Study Group</DialogTitle>
                  <DialogDescription>
                    Start a new study group for vocabulary learning
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Group Name</label>
                    <Input placeholder="e.g., Medical Terminology Group" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea placeholder="Describe your group's focus and goals..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Language</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Level</label>
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
                  </div>
                  <Button className="w-full">Create Study Group</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studyGroups.map(group => (
              <Card key={group.id} className={`transition-all hover:shadow-md ${
                group.isJoined 
                  ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
                  : 'hover:border-blue-200'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl">
                        {group.avatar}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {group.name}
                          {group.isPrivate && (
                            <Badge variant="secondary" className="text-xs">Private</Badge>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>🌐 {group.language}</span>
                          <span>📊 {group.level}</span>
                          <span>👥 {group.memberCount}/{group.maxMembers}</span>
                        </div>
                      </div>
                    </div>
                    {group.isJoined && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Joined
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Members</span>
                      <span>{group.memberCount}/{group.maxMembers}</span>
                    </div>
                    <Progress 
                      value={(group.memberCount / group.maxMembers) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Active {group.recentActivity}
                    </span>
                    <Button
                      size="sm"
                      variant={group.isJoined ? "outline" : "default"}
                      onClick={() => handleJoinStudyGroup(group.id)}
                      className="flex items-center gap-2"
                    >
                      {group.isJoined ? (
                        <>
                          <MessageCircle className="h-4 w-4" />
                          Chat
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Join
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Achievement Gallery
              </CardTitle>
              <CardDescription>
                Track your learning milestones and unlock rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map(achievement => (
                  <Card 
                    key={achievement.id} 
                    className={`transition-all ${
                      achievement.unlocked 
                        ? `border-2 bg-gradient-to-r ${getRarityColor(achievement.rarity)} p-[1px]` 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <CardContent className={`p-4 ${
                      achievement.unlocked 
                        ? 'bg-white rounded-[calc(0.5rem-1px)] m-0' 
                        : ''
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          achievement.unlocked
                            ? 'bg-gradient-to-br text-white ' + getRarityColor(achievement.rarity)
                            : 'bg-gray-200 text-gray-400'
                        }`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className={`font-semibold ${
                                achievement.unlocked ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {achievement.title}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs mt-1 ${getRarityBadgeColor(achievement.rarity)}`}
                              >
                                {achievement.rarity}
                              </Badge>
                            </div>
                            {achievement.unlocked && (
                              <Award className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <p className={`text-sm mb-3 ${
                            achievement.unlocked ? 'text-gray-600' : 'text-gray-500'
                          }`}>
                            {achievement.description}
                          </p>
                          
                          {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{achievement.progress}/{achievement.maxProgress}</span>
                              </div>
                              <Progress 
                                value={(achievement.progress / achievement.maxProgress) * 100}
                                className="h-2"
                              />
                            </div>
                          )}
                          
                          {achievement.unlocked && achievement.unlockedAt && (
                            <p className="text-xs text-green-600 mt-2">
                              Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Share Word Dialog */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Vocabulary
            </DialogTitle>
            <DialogDescription>
              Share this vocabulary item with the community
            </DialogDescription>
          </DialogHeader>
          
          {selectedWordToShare && (
            <div className="space-y-4">
              {/* Word Preview */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{selectedWordToShare.text}</h3>
                    <Badge variant="secondary" className="capitalize">
                      {selectedWordToShare.itemType}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{selectedWordToShare.definition}</p>
                  {selectedWordToShare.example && (
                    <p className="text-gray-500 text-xs italic">
                      "{selectedWordToShare.example}"
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Share Options */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Add a note (optional)</label>
                  <Textarea placeholder="Why is this word interesting? Any tips for remembering it?" />
                </div>

                <div>
                  <label className="text-sm font-medium">Share to</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a study group" />
                    </SelectTrigger>
                    <SelectContent>
                      {studyGroups.filter(g => g.isJoined).map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.avatar} {group.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="public">🌍 Public Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Social Media
                  </Button>
                </div>

                <Button className="w-full flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Share with Community
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SocialGamification
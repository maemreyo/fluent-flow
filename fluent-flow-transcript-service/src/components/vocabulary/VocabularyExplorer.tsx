'use client'

import { useState, useEffect } from 'react'
import { Search, Star, Filter, Plus, BookOpen, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { VocabularyCard } from './VocabularyCard'
import { userService } from '../../lib/services/user-service'
import { extensionBridge } from '../../lib/services/extension-bridge'
import type { Database } from '../../lib/supabase/types'

type UserVocabularyDeck = Database['public']['Tables']['user_vocabulary_deck']['Row']

interface VocabularyExplorerProps {
  userId: string
  className?: string
}

export const VocabularyExplorer = ({ userId, className = "" }: VocabularyExplorerProps) => {
  const [vocabulary, setVocabulary] = useState<UserVocabularyDeck[]>([])
  const [filteredVocabulary, setFilteredVocabulary] = useState<UserVocabularyDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'all' | 'starred' | 'review'>('all')
  const [stats, setStats] = useState({
    totalWords: 0,
    starredWords: 0,
    wordsForReview: 0,
    reviewsToday: 0
  })

  // Load vocabulary and stats
  useEffect(() => {
    loadVocabulary()
    loadStats()
    
    // Initialize extension integration
    extensionBridge.initializeExtensionIntegration(userId)
    
    // Register handlers for extension events
    extensionBridge.registerHandler('vocabulary_added', (newVocab: UserVocabularyDeck) => {
      setVocabulary(prev => [newVocab, ...prev])
      loadStats() // Refresh stats
    })
    
    extensionBridge.registerHandler('star_toggled', (vocabularyId: string, isStarred: boolean) => {
      handleStarToggle(vocabularyId, isStarred)
    })
    
    return () => {
      // Cleanup handlers
      extensionBridge.unregisterHandler('vocabulary_added')
      extensionBridge.unregisterHandler('star_toggled')
    }
  }, [userId, activeTab])

  // Filter vocabulary based on search and filters
  useEffect(() => {
    let filtered = vocabulary

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition_vi?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Difficulty filter
    if (selectedDifficulty) {
      filtered = filtered.filter(item => item.difficulty === selectedDifficulty)
    }

    setFilteredVocabulary(filtered)
  }, [vocabulary, searchTerm, selectedDifficulty])

  const loadVocabulary = async () => {
    setLoading(true)
    try {
      let data: UserVocabularyDeck[] = []
      
      switch (activeTab) {
        case 'all':
          data = await userService.getUserVocabulary(userId, { limit: 100 })
          break
        case 'starred':
          data = await userService.getUserVocabulary(userId, { starred: true, limit: 100 })
          break
        case 'review':
          data = await userService.getVocabularyForReview(userId)
          break
      }
      
      setVocabulary(data)
    } catch (error) {
      console.error('Error loading vocabulary:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const userStats = await userService.getUserVocabularyStats(userId)
      setStats(userStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleStarToggle = async (vocabularyId: string, isStarred: boolean) => {
    // Update local state immediately for better UX
    setVocabulary(prev => 
      prev.map(item => 
        item.id === vocabularyId 
          ? { ...item, is_starred: isStarred }
          : item
      )
    )
    
    // Refresh stats to update starred count
    await loadStats()
    
    // Sync with extension
    extensionBridge.sendVocabularyToExtension(userId, vocabulary)
  }

  const handlePlayAudio = (word: string) => {
    // Use Web Speech API to pronounce the word
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const difficulties = ['easy', 'medium', 'hard']

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.totalWords}</p>
              <p className="text-xs text-muted-foreground">Total Words</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Star className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.starredWords}</p>
              <p className="text-xs text-muted-foreground">Starred</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.wordsForReview}</p>
              <p className="text-xs text-muted-foreground">Due for Review</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.reviewsToday}</p>
              <p className="text-xs text-muted-foreground">Reviews Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vocabulary Explorer</CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Word
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Levels</option>
                {difficulties.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList>
              <TabsTrigger value="all">All ({stats.totalWords})</TabsTrigger>
              <TabsTrigger value="starred">Starred ({stats.starredWords})</TabsTrigger>
              <TabsTrigger value="review">Review ({stats.wordsForReview})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredVocabulary.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {activeTab === 'starred' ? 'No starred vocabulary' :
                     activeTab === 'review' ? 'No words due for review' :
                     searchTerm ? 'No matching vocabulary' : 'No vocabulary yet'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {activeTab === 'starred' ? 'Star some words to see them here' :
                     activeTab === 'review' ? 'Come back later for reviews' :
                     searchTerm ? 'Try a different search term' : 'Add your first word to get started'}
                  </p>
                  {activeTab === 'all' && !searchTerm && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Word
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredVocabulary.map((item) => (
                    <VocabularyCard
                      key={item.id}
                      vocabulary={item}
                      onStarToggle={handleStarToggle}
                      onPlayAudio={handlePlayAudio}
                      showReviewData={activeTab === 'review'}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Star, StarOff, Volume2, BookOpen, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { userService } from '../../lib/services/user-service'
import type { Database } from '../../lib/supabase/types'

type UserVocabularyDeck = Database['public']['Tables']['user_vocabulary_deck']['Row']

interface VocabularyCardProps {
  vocabulary: UserVocabularyDeck
  onStarToggle?: (vocabularyId: string, isStarred: boolean) => void
  onPlayAudio?: (word: string) => void
  showReviewData?: boolean
  className?: string
}

export const VocabularyCard = ({ 
  vocabulary, 
  onStarToggle, 
  onPlayAudio,
  showReviewData = false,
  className = ""
}: VocabularyCardProps) => {
  const [isStarred, setIsStarred] = useState(vocabulary.is_starred || false)
  const [isTogglingStar, setIsTogglingStar] = useState(false)

  const handleStarToggle = async () => {
    if (isTogglingStar) return

    setIsTogglingStar(true)
    const newStarredState = !isStarred

    try {
      const success = await userService.toggleVocabularyStar(vocabulary.id, newStarredState)
      
      if (success) {
        setIsStarred(newStarredState)
        onStarToggle?.(vocabulary.id, newStarredState)
      }
    } catch (error) {
      console.error('Error toggling star:', error)
    } finally {
      setIsTogglingStar(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'hard':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays > 0) return `In ${diffDays} days`
    if (diffDays === -1) return 'Yesterday'
    return `${Math.abs(diffDays)} days ago`
  }

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
{vocabulary.text}
              {onPlayAudio && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-1"
                  onClick={() => onPlayAudio(vocabulary.text)}
                >
                  <Volume2 className="h-3 w-3" />
                </Button>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${getDifficultyColor(vocabulary.difficulty)}`}
              >
                {vocabulary.difficulty}
              </Badge>
              
              {vocabulary.source_loop_id && (
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Loop
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStarToggle}
            disabled={isTogglingStar}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            {isStarred ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4 text-gray-400 hover:text-yellow-500" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Definition */}
        <div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {vocabulary.definition}
          </p>
          {vocabulary.definition_vi && (
            <p className="text-sm text-gray-500 mt-1 italic">
              {vocabulary.definition_vi}
            </p>
          )}
        </div>

        {/* Example */}
        {vocabulary.example && (
          <>
            <Separator />
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 italic">
                &ldquo;{vocabulary.example}&rdquo;
              </p>
            </div>
          </>
        )}

        {/* Source Loop */}
        {vocabulary.source_loop_id && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Source Loop</span>
            </div>
            <p className="text-sm text-blue-700">
              Loop ID: {vocabulary.source_loop_id}
            </p>
          </div>
        )}

        {/* Review Data */}
        {showReviewData && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar className="h-3 w-3" />
                <span>Next Review: {formatDate(vocabulary.next_review_date)}</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-600">
                <TrendingUp className="h-3 w-3" />
                <span>Ease: {vocabulary.ease_factor?.toFixed(1) || '2.5'}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
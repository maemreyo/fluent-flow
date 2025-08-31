
import { Star, Clock, HelpCircle, Play, Sparkles } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { QuestionSet } from '../../../../components/questions/QuestionSetInfo';

interface VideoHeaderProps {
  questionSet: QuestionSet | null;
  isFavorited: boolean;
  favoriteLoading: boolean;
  onFavoriteToggle: () => void;
}

export function VideoHeader({
  questionSet,
  isFavorited,
  favoriteLoading,
  onFavoriteToggle,
}: VideoHeaderProps) {
  if (!questionSet) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  const videoTitle = questionSet.videoInfo?.title || questionSet.videoTitle;
  const videoThumbnail = questionSet.videoInfo?.thumbnail;
  const channelTitle = questionSet.videoInfo?.channel;
  const questionCount = questionSet.questions.length;

  // Calculate difficulty distribution for visual representation
  const difficultyCount = questionSet.questions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="relative">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-blue-50/50 rounded-3xl blur-3xl -z-10"></div>
      
      <Card className="relative overflow-hidden border-2 border-white/20 shadow-2xl bg-white/80 backdrop-blur-sm rounded-3xl">
        {/* Hero Section with Thumbnail */}
        <div className="relative">
          {videoThumbnail && (
            <div className="relative group overflow-hidden">
              <img
                src={videoThumbnail}
                alt={videoTitle}
                className="w-full h-64 sm:h-80 object-cover transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Play indicator overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
              </div>

              {/* Question count badge */}
              <div className="absolute top-4 right-4">
                <Badge className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-3 py-1.5 font-semibold shadow-lg">
                  <HelpCircle className="h-4 w-4 mr-1.5" />
                  {questionCount} Questions
                </Badge>
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Title and Channel */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                    {videoTitle}
                  </h1>
                  
                  {channelTitle && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                      <p className="text-lg font-medium text-gray-700">{channelTitle}</p>
                    </div>
                  )}
                </div>

                {/* Favorite Button */}
                <div className="flex-shrink-0">
                  <Button
                    onClick={onFavoriteToggle}
                    disabled={favoriteLoading}
                    className={`h-12 px-6 rounded-2xl font-semibold shadow-lg transition-all duration-300 ${
                      isFavorited 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-yellow-200' 
                        : 'bg-white/70 backdrop-blur-sm border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 text-gray-700'
                    } ${favoriteLoading ? 'cursor-wait opacity-50' : 'hover:scale-105'}`}
                  >
                    <Star
                      className={`mr-2 h-5 w-5 transition-all duration-300 ${
                        isFavorited 
                          ? 'text-white fill-white' 
                          : 'text-gray-600 group-hover:text-yellow-500'
                      }`}
                    />
                    {favoriteLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Saving...
                      </div>
                    ) : (
                      <span>{isFavorited ? 'Starred' : 'Add to Favorites'}</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats and Info Row */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gradient-to-r from-indigo-50/70 via-purple-50/70 to-blue-50/70 backdrop-blur-sm rounded-2xl border border-white/40">
              {/* Duration */}
              {questionSet.startTime !== undefined && questionSet.endTime !== undefined && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <span className="font-semibold text-indigo-700">
                    {formatTime(questionSet.startTime)} - {formatTime(questionSet.endTime)}
                  </span>
                </div>
              )}

              {/* Difficulty Distribution */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div className="flex gap-2">
                  {difficultyCount.easy > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
                      {difficultyCount.easy} Easy
                    </Badge>
                  )}
                  {difficultyCount.medium > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                      {difficultyCount.medium} Medium
                    </Badge>
                  )}
                  {difficultyCount.hard > 0 && (
                    <Badge className="bg-red-100 text-red-700 border border-red-200 font-medium">
                      {difficultyCount.hard} Hard
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

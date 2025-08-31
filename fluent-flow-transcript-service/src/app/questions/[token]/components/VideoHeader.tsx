
import { Star, Clock, HelpCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
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

  return (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="p-0">
        {videoThumbnail && (
          <img
            src={videoThumbnail}
            alt={videoTitle}
            className="w-full h-48 object-cover"
          />
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="mb-2 text-2xl font-bold">
              {videoTitle}
            </CardTitle>
            {channelTitle && <p className="text-lg text-muted-foreground mb-2">{channelTitle}</p>}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              {questionSet.startTime !== undefined && questionSet.endTime !== undefined && (
                <span className="flex items-center">
                  <Clock className="mr-1.5 h-4 w-4" />
                  {formatTime(questionSet.startTime)} - {formatTime(questionSet.endTime)}
                </span>
              )}
              <span className="flex items-center">
                <HelpCircle className="mr-1.5 h-4 w-4" />
                {questionSet.questions.length} Questions
              </span>
            </div>
          </div>
          <Button
            onClick={onFavoriteToggle}
            disabled={favoriteLoading}
            variant={isFavorited ? 'default' : 'outline'}
            size="sm"
            className={`transition-all duration-200 ${
              favoriteLoading ? 'cursor-wait opacity-50' : ''
            }`}
          >
            <Star
              className={`mr-2 h-4 w-4 ${
                isFavorited ? 'text-yellow-400 fill-yellow-400' : ''
              }`}
            />
            {favoriteLoading ? 'Saving...' : isFavorited ? 'Starred' : 'Star'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

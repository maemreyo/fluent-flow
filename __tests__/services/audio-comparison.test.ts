import { AudioComparisonService } from '../../lib/services/audio-comparison-service'
import { YouTubeService } from '../../lib/services/youtube-service'

describe('AudioComparisonService', () => {
  let service: AudioComparisonService
  let mockYouTubeService: jest.Mocked<YouTubeService>

  beforeEach(() => {
    mockYouTubeService = {
      seekTo: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      isPlayerReady: jest.fn().mockReturnValue(true)
    } as any

    service = new AudioComparisonService(mockYouTubeService)
  })

  describe('analyzeDifferences', () => {
    it('should analyze differences between recording and segment', async () => {
      const recording = {
        id: 'test',
        videoId: 'test',
        audioData: new Blob(['fake-audio-data'], { type: 'audio/webm' }),
        duration: 5.0,
        createdAt: new Date()
      }
      
      const segment = {
        id: 'test',
        startTime: 10,
        endTime: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await service.analyzeDifferences(recording, segment)

      expect(result).toHaveProperty('durationDifference')
      expect(result).toHaveProperty('suggestedImprovements')
      expect(typeof result.durationDifference).toBe('number')
      expect(Array.isArray(result.suggestedImprovements)).toBe(true)
    })

    it('should provide suggestions for duration differences', async () => {
      const recording = {
        id: 'test',
        videoId: 'test', 
        audioData: new Blob(['fake-data'], { type: 'audio/webm' }),
        duration: 8.0,
        createdAt: new Date()
      }
      
      const segment = {
        id: 'test',
        startTime: 10,
        endTime: 15, // 5 second segment
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await service.analyzeDifferences(recording, segment)
      
      expect(result.suggestedImprovements.length).toBeGreaterThan(0)
      expect(result.durationDifference).toBe(3.0) // 8 - 5 = 3
    })
  })

  describe('createAudioVisualization', () => {
    it('should create audio visualization data', async () => {
      const recording = {
        id: 'test',
        videoId: 'test',
        audioData: new Blob(['fake-audio-data'], { type: 'audio/webm' }),
        duration: 5.0,
        createdAt: new Date()
      }

      const visualization = await service.createAudioVisualization(recording)

      expect(Array.isArray(visualization)).toBe(true)
      expect(visualization.length).toBeGreaterThan(0)
      expect(visualization.every(val => val >= 0 && val <= 1)).toBe(true)
    })

    it('should handle different recording durations', async () => {
      const shortRecording = {
        id: 'test',
        videoId: 'test',
        audioData: new Blob(['fake-data'], { type: 'audio/webm' }),
        duration: 1.0,
        createdAt: new Date()
      }

      const longRecording = {
        id: 'test',
        videoId: 'test',
        audioData: new Blob(['fake-data'], { type: 'audio/webm' }),
        duration: 20.0,
        createdAt: new Date()
      }

      const shortViz = await service.createAudioVisualization(shortRecording)
      const longViz = await service.createAudioVisualization(longRecording)

      expect(shortViz.length).toBeGreaterThan(0)
      expect(longViz.length).toBeGreaterThan(0)
      expect(longViz.length).toBeGreaterThanOrEqual(shortViz.length)
    })
  })
})
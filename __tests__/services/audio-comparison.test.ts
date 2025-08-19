import { AudioComparisonService } from '../../lib/services/audio-comparison-service'

describe('AudioComparisonService', () => {
  let service: AudioComparisonService

  beforeEach(() => {
    service = new AudioComparisonService()
  })

  describe('compareAudio', () => {
    it('should compare audio recordings successfully', async () => {
      const originalAudio = new Blob(['fake-audio-data'], { type: 'audio/webm' })
      const recordedAudio = new Blob(['fake-recorded-data'], { type: 'audio/webm' })

      const result = await service.compareAudio(originalAudio, recordedAudio)

      expect(result).toHaveProperty('similarity')
      expect(result).toHaveProperty('feedback')
      expect(typeof result.similarity).toBe('number')
    })

    it('should handle comparison errors gracefully', async () => {
      const invalidAudio = new Blob([''], { type: 'text/plain' })
      const recordedAudio = new Blob(['fake-data'], { type: 'audio/webm' })

      await expect(
        service.compareAudio(invalidAudio, recordedAudio)
      ).rejects.toThrow()
    })
  })

  describe('generateFeedback', () => {
    it('should generate meaningful feedback', () => {
      const feedback = service.generateFeedback(0.85, 10.5, 12.0)

      expect(feedback).toHaveProperty('overallScore')
      expect(feedback).toHaveProperty('suggestions')
      expect(Array.isArray(feedback.suggestions)).toBe(true)
    })

    it('should provide different feedback for low scores', () => {
      const lowScoreFeedback = service.generateFeedback(0.3, 5.0, 8.0)
      const highScoreFeedback = service.generateFeedback(0.9, 5.0, 5.2)

      expect(lowScoreFeedback.suggestions.length).toBeGreaterThan(0)
      expect(highScoreFeedback.overallScore).toBeGreaterThan(lowScoreFeedback.overallScore)
    })
  })
})
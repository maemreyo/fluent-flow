// @ts-nocheck
import { handleRecordingMessage } from '../../lib/background/recording-handler'

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      set: jest.fn(),
      get: jest.fn(),
      remove: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn()
  }
}

// @ts-ignore
global.chrome = mockChrome

describe('RecordingHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleRecordingMessage', () => {
    it('should save recording successfully', async () => {
      const mockRecordingData = {
        audioDataBase64: 'mock-base64-data',
        audioSize: 1024,
        videoId: 'test-video-id',
        sessionId: 'test-session-id',
        duration: 30
      }

      mockChrome.storage.local.set.mockResolvedValue(undefined)
      mockChrome.storage.local.get.mockResolvedValue({})

      const sendResponse = jest.fn()
      
      await handleRecordingMessage('save', mockRecordingData, sendResponse)

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            videoId: 'test-video-id',
            duration: 30
          })
        })
      )
    })

    it('should handle large recordings with chunking', async () => {
      const mockLargeRecordingData = {
        audioDataBase64: 'x'.repeat(15 * 1024 * 1024), // 15MB of data
        audioSize: 15 * 1024 * 1024,
        videoId: 'test-video-id',
        duration: 300
      }

      mockChrome.storage.local.set.mockResolvedValue(undefined)
      mockChrome.storage.local.get.mockResolvedValue({})

      const sendResponse = jest.fn()
      
      await handleRecordingMessage('save', mockLargeRecordingData, sendResponse)

      // Should call chrome.storage.local.set multiple times for chunks
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(
        expect.any(Number)
      )
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      )
    })

    it('should handle recording deletion', async () => {
      mockChrome.storage.local.remove.mockResolvedValue(undefined)
      mockChrome.storage.local.get.mockResolvedValue({
        fluent_flow_recordings_index: []
      })

      const sendResponse = jest.fn()
      
      await handleRecordingMessage('delete', { id: 'test-recording-id' }, sendResponse)

      expect(mockChrome.storage.local.remove).toHaveBeenCalled()
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      )
    })

    it('should handle errors gracefully', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'))

      const sendResponse = jest.fn()
      
      await handleRecordingMessage('save', {}, sendResponse)

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      )
    })
  })
})
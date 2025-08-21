# Audio Extraction Architecture for Loop-to-Conversation Feature

## Overview
Extract audio segments from YouTube videos during loop creation for Gemini AI conversation analysis.

## Technical Approach

### 1. Audio Capture Service
```typescript
export class AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  
  async captureVideoSegment(videoElement: HTMLVideoElement, startTime: number, endTime: number): Promise<Blob> {
    // Step 1: Get video stream
    const stream = videoElement.captureStream()
    
    // Step 2: Create MediaRecorder for audio only
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    
    // Step 3: Set up data collection
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data)
      }
    }
    
    // Step 4: Time-based recording control
    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' })
        this.recordedChunks = []
        resolve(audioBlob)
      }
      
      // Start recording at specific time
      videoElement.currentTime = startTime
      videoElement.play()
      
      setTimeout(() => {
        this.mediaRecorder!.start()
      }, 100) // Small delay for video to start
      
      // Stop recording after duration
      const duration = (endTime - startTime) * 1000
      setTimeout(() => {
        this.mediaRecorder!.stop()
        videoElement.pause()
      }, duration + 100)
    })
  }
}
```

### 2. Loop Creation Workflow
```typescript
export class EnhancedLoopService {
  private audioCaptureService = new AudioCaptureService()
  
  async createLoopWithAudio(loopData: CreateLoopData): Promise<SavedLoop> {
    // Step 1: Create basic loop
    const loop = await this.createBasicLoop(loopData)
    
    // Step 2: Capture audio segment
    try {
      const videoElement = document.querySelector('video') as HTMLVideoElement
      const audioBlob = await this.audioCaptureService.captureVideoSegment(
        videoElement,
        loopData.startTime,
        loopData.endTime
      )
      
      // Step 3: Convert to base64 for storage
      const audioBase64 = await this.blobToBase64(audioBlob)
      
      // Step 4: Update loop with audio data
      loop.hasAudioSegment = true
      loop.audioSegmentBlob = audioBase64
      loop.audioFormat = 'webm'
      loop.audioSize = audioBlob.size
      
    } catch (error) {
      console.warn('Audio capture failed, saving loop without audio:', error)
    }
    
    // Step 5: Save to database
    await this.saveLoop(loop)
    return loop
  }
  
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}
```

### 3. Gemini Integration Service
```typescript
export class ConversationAnalysisService {
  private geminiClient: any // Gemini API client
  
  async generateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    if (!loop.hasAudioSegment || !loop.audioSegmentBlob) {
      throw new Error('No audio segment available for analysis')
    }
    
    // Convert base64 back to blob
    const audioBlob = this.base64ToBlob(loop.audioSegmentBlob)
    
    // Upload to Gemini Files API
    const audioFile = await this.geminiClient.files.upload({
      file: audioBlob,
      mimeType: 'audio/webm'
    })
    
    // Generate questions with detailed prompt
    const prompt = this.buildQuestionPrompt(loop)
    const response = await this.geminiClient.generateContent({
      prompt,
      files: [audioFile]
    })
    
    return this.parseQuestionsResponse(response, loop)
  }
  
  private buildQuestionPrompt(loop: SavedLoop): string {
    return `
    You are an English conversation teacher analyzing a dialogue segment from YouTube.
    
    Context:
    - Video: "${loop.videoTitle}"
    - Duration: ${loop.endTime - loop.startTime} seconds
    - Loop title: "${loop.title}"
    - Description: ${loop.description || 'No additional context'}
    
    Please listen to this audio segment and generate EXACTLY 10 multiple-choice questions for listening comprehension.
    
    Requirements:
    1. Focus on what was actually said in the audio
    2. Include main ideas, details, vocabulary, and inference questions  
    3. Each question should have 4 options (A, B, C, D)
    4. Mix difficulty levels: 4 easy, 4 medium, 2 hard
    5. Include timestamps when referring to specific moments
    
    Return response in this JSON format:
    {
      "questions": [
        {
          "id": "q1",
          "question": "What is the main topic discussed?",
          "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
          "correctAnswer": "A",
          "explanation": "The speaker clearly states...",
          "difficulty": "easy",
          "type": "main_idea",
          "timestamp": 2.5
        }
      ],
      "metadata": {
        "totalQuestions": 10,
        "audioLength": ${loop.endTime - loop.startTime},
        "analysisDate": "${new Date().toISOString()}"
      }
    }
    `
  }
}
```

### 4. UI Integration
```tsx
const EnhancedLoopCard = ({ loop }: { loop: SavedLoop }) => {
  const [questions, setQuestions] = useState<ConversationQuestions | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  
  const handleGenerateQuestions = async () => {
    if (!loop.hasAudioSegment) {
      toast.error('No audio segment available. Please recreate this loop.')
      return
    }
    
    setIsAnalyzing(true)
    try {
      const analysisService = new ConversationAnalysisService()
      const result = await analysisService.generateQuestions(loop)
      setQuestions(result)
      setShowQuestions(true)
    } catch (error) {
      toast.error('Failed to generate questions: ' + error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        {/* Existing loop info */}
        <div className="flex items-center gap-2">
          {loop.hasAudioSegment && (
            <Badge variant="secondary">
              <Mic className="w-3 h-3 mr-1" />
              Audio Ready
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={() => applyLoop(loop)}>
            <Play className="w-4 h-4 mr-2" />
            Practice
          </Button>
          
          <Button 
            onClick={handleGenerateQuestions}
            disabled={!loop.hasAudioSegment || isAnalyzing}
            variant="outline"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Generate Questions'}
          </Button>
        </div>
        
        {showQuestions && questions && (
          <QuestionPracticePanel 
            questions={questions} 
            loop={loop}
            onClose={() => setShowQuestions(false)}
          />
        )}
      </CardContent>
    </Card>
  )
}
```

## Benefits of This Approach

1. **Cost Efficient**: Chỉ gửi đoạn audio ngắn (10-30s) thay vì cả video
2. **High Quality**: Audio được capture trực tiếp từ YouTube player
3. **Offline Ready**: Audio được lưu local, có thể analyze offline
4. **Scalable**: Có thể batch process nhiều loops
5. **Privacy**: Audio chỉ được lưu local trong extension

## Next Implementation Steps

1. Create AudioCaptureService
2. Update SavedLoop interface  
3. Integrate with existing loop creation flow
4. Set up Gemini API credentials
5. Build ConversationAnalysisService
6. Create question practice UI components

Bạn có muốn bắt đầu implement từ step nào không?
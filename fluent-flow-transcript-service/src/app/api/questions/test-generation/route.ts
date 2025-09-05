import { NextRequest, NextResponse } from 'next/server'
import { createQuestionGenerationService } from '@/lib/services/question-generation-service'

/**
 * GET /api/questions/test-generation
 * Test AI service status and run a simple generation test
 */
export async function GET(request: NextRequest) {
  try {
    const service = createQuestionGenerationService(request)
    
    // Get service status
    const status = await service.getServiceStatus()
    
    if (status.status === 'error') {
      return NextResponse.json({
        status: 'error',
        message: 'AI service not available',
        details: status
      }, { status: 500 })
    }

    // Run a simple test generation
    const testTranscript = `
      Welcome to today's English lesson. In this video, we're going to talk about daily routines and how to describe what you do every day. 
      First, let's start with some vocabulary. When you wake up in the morning, you probably brush your teeth, take a shower, and have breakfast. 
      These are all part of your morning routine. During the day, you might work, study, or spend time with friends and family.
      In the evening, you could watch TV, read a book, or prepare for the next day. 
      Learning to talk about your daily routine is very important for English conversation because it's something everyone can relate to.
    `

    const testLoop = {
      id: 'test_generation_' + Date.now(),
      videoTitle: 'Test Generation - Daily Routines',
      startTime: 0,
      endTime: 120
    }

    const testPreset = { easy: 2, medium: 2, hard: 1 }

    console.log('Running test generation...')
    const startTime = Date.now()
    
    try {
      const result = await service.generateFromTranscript({
        transcript: testTranscript,
        loop: testLoop,
        preset: testPreset,
        saveToDatabase: false // Don't save test generations
      })

      const testDuration = Date.now() - startTime

      return NextResponse.json({
        status: 'success',
        message: 'AI service is working correctly',
        serviceInfo: status,
        testResult: {
          generated: result.questions.questions.length,
          expected: testPreset.easy + testPreset.medium + testPreset.hard,
          processingTimeMs: testDuration,
          sampleQuestions: result.questions.questions.slice(0, 2).map(q => ({
            question: q.question,
            difficulty: q.difficulty,
            type: q.type,
            hasOptions: q.options.length === 4,
            hasExplanation: !!q.explanation
          }))
        }
      })
    } catch (genError) {
      console.error('Test generation failed:', genError)
      return NextResponse.json({
        status: 'partial_error',
        message: 'AI service is available but test generation failed',
        serviceInfo: status,
        error: genError instanceof Error ? genError.message : 'Unknown generation error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test generation endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to test generation service',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/questions/test-generation
 * Run custom test with provided parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const service = createQuestionGenerationService(request)
    
    // Validate request
    const validation = service.validateRequest(body, body.type || 'transcript')
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: validation.errors
      }, { status: 400 })
    }

    // Run generation based on type
    let result
    const startTime = Date.now()

    if (body.type === 'youtube') {
      result = await service.generateFromYouTubeUrl({
        videoUrl: body.videoUrl,
        startTime: body.startTime,
        endTime: body.endTime,
        preset: body.preset,
        aiProvider: body.aiProvider,
        saveToDatabase: false // Test mode - don't save
      })
    } else {
      result = await service.generateFromTranscript({
        transcript: body.transcript,
        loop: body.loop,
        preset: body.preset,
        aiProvider: body.aiProvider,
        saveToDatabase: false // Test mode - don't save
      })
    }

    const testDuration = Date.now() - startTime

    return NextResponse.json({
      status: 'success',
      message: 'Test generation completed successfully',
      testResult: {
        type: body.type || 'transcript',
        generated: result.questions.questions.length,
        expected: body.preset ? (body.preset.easy + body.preset.medium + body.preset.hard) : 'default',
        processingTimeMs: testDuration,
        metadata: result.metadata,
        questions: result.questions.questions.map((q, i) => ({
          index: i + 1,
          question: q.question.substring(0, 100) + (q.question.length > 100 ? '...' : ''),
          difficulty: q.difficulty,
          type: q.type,
          correctAnswer: q.correctAnswer,
          hasExplanation: !!q.explanation
        }))
      }
    })

  } catch (error) {
    console.error('Custom test generation error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('YouTube')) {
        return NextResponse.json({
          error: 'YouTube processing failed',
          message: error.message
        }, { status: 400 })
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json({
          error: 'Rate limit exceeded',
          message: 'Please wait before making another request'
        }, { status: 429 })
      }

      if (error.message.includes('API key') || error.message.includes('configuration')) {
        return NextResponse.json({
          error: 'AI service configuration error',
          message: 'AI service is not properly configured'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: 'Test generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
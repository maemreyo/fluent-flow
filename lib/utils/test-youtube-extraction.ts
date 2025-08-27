import { YouTubeDataExtractor } from '../services/youtube-data-extractor'
import { YouTubeExtractionMonitor } from '../services/youtube-extraction-monitor'
import { YouTubeTranscriptService } from '../services/youtube-transcript-service'
import { YouTubeDataTestSuite } from './youtube-data-test'

// Quick test function you can call from content script or sidepanel
export async function testYouTubeExtraction() {
  console.log('🧪 Starting YouTube Data Extraction Tests...')

  try {
    // Test 1: Basic extraction
    console.log('\n1️⃣ Testing basic data extraction...')
    const extractor = new YouTubeDataExtractor()
    const result = await extractor.extractVideoData()

    if (result.success) {
      console.log('✅ Extraction successful!')
      console.log(`📹 Video: ${result.data?.title}`)
      console.log(`👤 Channel: ${result.data?.author}`)
      console.log(`⏱️ Duration: ${result.data?.duration}s`)
      console.log(`👀 Views: ${result.data?.viewCount}`)
      console.log(`🎬 Method: ${result.method}`)
      console.log(`🎯 Reliability: ${(result.reliability * 100).toFixed(1)}%`)
    } else {
      console.log('❌ Extraction failed:', result.error)
    }

    // Test 2: Health monitoring
    console.log('\n2️⃣ Testing health monitoring...')
    const monitor = new YouTubeExtractionMonitor()
    const healthReport = await monitor.performHealthCheck()

    console.log(`🏥 Overall Health: ${(healthReport.overallHealth * 100).toFixed(1)}%`)
    console.log(`🪟 Window Objects: ${healthReport.methods.windowObjects.success ? '✅' : '❌'}`)
    console.log(`🔌 InnerTube API: ${healthReport.methods.innerTubeAPI.success ? '✅' : '❌'}`)

    if (healthReport.criticalIssues.length > 0) {
      console.log('🚨 Critical Issues:', healthReport.criticalIssues)
    }

    if (healthReport.recommendations.length > 0) {
      console.log('💡 Recommendations:', healthReport.recommendations)
    }

    // Test 3: Comprehensive test suite
    console.log('\n3️⃣ Running comprehensive test suite...')
    const testSuite = new YouTubeDataTestSuite()
    const testResults = await testSuite.runAllTests()

    testResults.forEach(suite => {
      console.log(`\n📋 ${suite.name}: ${suite.overallSuccess ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`   Duration: ${suite.totalDuration.toFixed(2)}ms`)
      console.log(
        `   Tests: ${suite.results.filter(r => r.success).length}/${suite.results.length} passed`
      )

      const failures = suite.results.filter(r => !r.success)
      if (failures.length > 0) {
        failures.forEach(failure => {
          console.log(`   ❌ ${failure.testName}: ${failure.error}`)
        })
      }
    })

    // Generate summary
    const totalTests = testResults.reduce((sum, suite) => sum + suite.results.length, 0)
    const passedTests = testResults.reduce(
      (sum, suite) => sum + suite.results.filter(r => r.success).length,
      0
    )
    const overallSuccess = testResults.every(suite => suite.overallSuccess)

    console.log(`\n📊 SUMMARY:`)
    console.log(
      `   Overall Status: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`
    )
    console.log(
      `   Success Rate: ${passedTests}/${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`
    )

    return {
      extraction: result,
      health: healthReport,
      tests: testResults,
      summary: {
        overallSuccess,
        passedTests,
        totalTests,
        successRate: (passedTests / totalTests) * 100
      }
    }
  } catch (error) {
    console.error('🚨 Test execution failed:', error)
    throw error
  }
}

export async function testInnerTubeTranscriptExtraction() {
  console.log('🧪 Starting InnerTube Transcript Extraction Tests...')

  const testVideoIds = [
    'dQw4w9WgXcQ' // Rick Roll - likely has captions
  ]

  try {
    const transcriptService = new YouTubeTranscriptService()

    for (const videoId of testVideoIds) {
      console.log(`\n🎯 Testing video: ${videoId}`)

      try {
        // Test availability
        const isAvailable = await transcriptService.isTranscriptAvailable(videoId)
        console.log(`📋 Transcript available: ${isAvailable ? '✅' : '❌'}`)

        if (isAvailable) {
          // Test language detection
          const languages = await transcriptService.getAvailableLanguages(videoId)
          console.log(`🌍 Available languages: [${languages.join(', ')}]`)

          // Test InnerTube API extraction
          try {
            const transcript = await transcriptService.fetchFromInnerTubeAPI(videoId, 'en')
            console.log(`✅ InnerTube extraction successful`)
            console.log(`📝 Segments: ${transcript.segments.length}`)
            console.log(`📏 Text length: ${transcript.fullText.length} chars`)
            console.log(`🌐 Language: ${transcript.language}`)

            if (transcript.segments.length > 0) {
              console.log(`📄 First segment: "${transcript.segments[0].text.substring(0, 50)}..."`)
            }
          } catch (innerTubeError) {
            console.log(`❌ InnerTube extraction failed: ${innerTubeError}`)
          }

          // Test segment filtering
          try {
            const segmentTranscript = await transcriptService.getTranscriptSegment(
              videoId,
              0,
              30,
              'en'
            )
            console.log(`✅ Segment extraction (0-30s) successful`)
            console.log(`📝 Segment text length: ${segmentTranscript.fullText.length} chars`)
          } catch (segmentError) {
            console.log(`❌ Segment extraction failed: ${segmentError}`)
          }
        }
      } catch (error) {
        console.log(`❌ Test failed for video ${videoId}: ${error}`)
      }
    }

    console.log('\n🏁 InnerTube transcript tests completed!')
  } catch (error) {
    console.error('🚨 Test execution failed:', error)
    throw error
  }
}

// Helper function to test specific video IDs
export async function testSpecificVideo(videoId: string) {
  console.log(`🎯 Testing specific video: ${videoId}`)

  const extractor = new YouTubeDataExtractor()
  const result = await extractor.extractVideoData(videoId)

  if (result.success) {
    console.log('✅ Video extraction successful!')
    console.log('📄 Video Data:', {
      title: result.data?.title,
      author: result.data?.author,
      duration: result.data?.duration,
      captions: result.data?.captions?.length || 0,
      thumbnails: result.data?.thumbnails?.length || 0
    })
  } else {
    console.log('❌ Video extraction failed:', result.error)
  }

  return result
}

// Helper to test extraction methods individually
export async function testExtractionMethods() {
  console.log('🔍 Testing individual extraction methods...')

  const extractor = new YouTubeDataExtractor()

  // Test window objects method
  console.log('\n📱 Testing Window Objects method...')
  try {
    const windowResult = await (extractor as any).extractFromWindowObjects(
      (extractor as any).extractVideoIdFromUrl()
    )
    console.log('Window Objects:', windowResult.success ? '✅' : '❌', windowResult.error)
  } catch (error) {
    console.log('Window Objects: ❌', error)
  }

  // Test InnerTube API method
  console.log('\n🔌 Testing InnerTube API method...')
  const videoId = (extractor as any).extractVideoIdFromUrl()
  if (videoId) {
    try {
      const apiResult = await (extractor as any).extractFromInnerTubeAPI(videoId)
      console.log('InnerTube API:', apiResult.success ? '✅' : '❌', apiResult.error)
    } catch (error) {
      console.log('InnerTube API: ❌', error)
    }
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  ;(window as any).testYouTubeExtraction = testYouTubeExtraction
  ;(window as any).testSpecificVideo = testSpecificVideo
  ;(window as any).testExtractionMethods = testExtractionMethods
}

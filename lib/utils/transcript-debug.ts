import { youtubeTranscriptService } from '../services/youtube-transcript-service'

/**
 * Debug utility for testing transcript extraction on different videos
 */
export class TranscriptDebugUtil {
  /**
   * Test transcript extraction for a video and log detailed results
   */
  static async debugTranscriptExtraction(videoId: string, startTime: number = 0, endTime: number = 30) {
    console.log(`\n🔍 FluentFlow Transcript Debug for video: ${videoId}`)
    console.log(`⏱️  Time range: ${startTime}s - ${endTime}s\n`)

    try {
      // Test basic availability
      console.log('📋 Testing basic availability...')
      const isAvailable = await youtubeTranscriptService.isTranscriptAvailable(videoId)
      console.log(`   Basic availability: ${isAvailable ? '✅ Available' : '❌ Not available'}`)

      // Test enhanced availability (all methods)
      console.log('\n🔬 Testing enhanced availability...')
      const enhancedCheck = await youtubeTranscriptService.enhancedAvailabilityCheck(videoId)
      console.log(`   Available methods: ${enhancedCheck.methods.length > 0 ? enhancedCheck.methods.join(', ') : 'None'}`)
      
      if (enhancedCheck.suggestions && enhancedCheck.suggestions.length > 0) {
        console.log('   💡 Suggestions:')
        enhancedCheck.suggestions.forEach(suggestion => console.log(`      • ${suggestion}`))
      }

      // Test available languages
      console.log('\n🌐 Testing available languages...')
      try {
        const availableLanguages = await youtubeTranscriptService.getAvailableLanguages(videoId)
        console.log(`   Available languages: ${availableLanguages.length > 0 ? availableLanguages.join(', ') : 'None detected'}`)
      } catch (langError) {
        console.log(`   Language detection failed: ${langError instanceof Error ? langError.message : 'Unknown error'}`)
      }

      // Test actual extraction with different languages
      console.log('\n🎯 Testing transcript extraction...')
      
      // Try with auto-detect first
      try {
        const result = await youtubeTranscriptService.getTranscriptSegment(videoId, startTime, endTime)
        
        console.log(`   ✅ Success! Extracted ${result.segments.length} segments`)
        console.log(`   📝 Full text length: ${result.fullText.length} characters`)
        console.log(`   🌐 Language: ${result.language}`)
        
        if (result.segments.length > 0) {
          console.log('\n📄 Sample segments:')
          result.segments.slice(0, 3).forEach((segment, index) => {
            console.log(`   ${index + 1}. [${segment.start.toFixed(1)}s] "${segment.text}"`)
          })
        }

        if (result.fullText.length > 0) {
          console.log(`\n📖 Full text preview: "${result.fullText.substring(0, 200)}${result.fullText.length > 200 ? '...' : ''}"`)
        }

        return { success: true, result }

      } catch (autoError) {
        console.log(`   ❌ Auto-detect failed: ${autoError instanceof Error ? autoError.message : 'Unknown error'}`)
        
        // If auto-detect failed, show available languages from error message
        if (autoError instanceof Error && autoError.message.includes('Available languages:')) {
          const languageMatch = autoError.message.match(/Available languages: (.+)/)
          if (languageMatch) {
            const languages = languageMatch[1].split(', ')
            console.log(`\n🎭 Video has captions in: ${languages.slice(0, 10).join(', ')}${languages.length > 10 ? '...' : ''}`)
            
            // Try with first English variant
            const englishVariants = languages.filter(lang => lang.startsWith('en'))
            if (englishVariants.length > 0) {
              console.log(`\n🔄 Retrying with English variant: ${englishVariants[0]}`)
              try {
                const retryResult = await youtubeTranscriptService.getTranscriptSegment(
                  videoId, startTime, endTime, englishVariants[0]
                )
                console.log(`   ✅ Success with ${englishVariants[0]}! ${retryResult.segments.length} segments`)
                return { success: true, result: retryResult, language: englishVariants[0] }
              } catch (retryError) {
                console.log(`   ❌ ${englishVariants[0]} also failed`)
              }
            }
            
            // Try with first available language
            if (languages.length > 0) {
              console.log(`\n🔄 Retrying with first available: ${languages[0]}`)
              try {
                const retryResult = await youtubeTranscriptService.getTranscriptSegment(
                  videoId, startTime, endTime, languages[0]
                )
                console.log(`   ✅ Success with ${languages[0]}! ${retryResult.segments.length} segments`)
                return { success: true, result: retryResult, language: languages[0] }
              } catch (retryError) {
                console.log(`   ❌ ${languages[0]} also failed`)
              }
            }
          }
        }
        
        throw autoError
      }

    } catch (error) {
      console.log(`\n❌ All extraction attempts failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Show suggestions for videos that work
      console.log('\n💡 Try these videos that typically have captions:')
      const suggestions = youtubeTranscriptService.getSuggestedVideosWithCaptions()
      suggestions.forEach(video => {
        console.log(`   • ${video.title} (${video.id})`)
        console.log(`     ${video.description}`)
      })

      return { success: false, error }
    }
  }

  /**
   * Test specifically for Ejoy English extension transcript extraction
   */
  static testEjoyExtraction() {
    console.log('🎭 Testing Ejoy English Extension Transcript Extraction\n')
    
    try {
      // Check if Ejoy English elements are present
      const ejoyContainer = document.querySelector('.gl-nf-sitebar-viewContentAbs, .site-s-c')
      console.log(`Ejoy container found: ${ejoyContainer ? '✅ Yes' : '❌ No'}`)
      
      if (!ejoyContainer) {
        console.log('💡 Make sure Ejoy English extension is installed and transcript is visible')
        return { success: false, error: 'Ejoy English not found' }
      }

      // Find transcript segments
      const transcriptSegments = document.querySelectorAll('.site-s-c[data-time]')
      console.log(`Transcript segments found: ${transcriptSegments.length}`)
      
      if (transcriptSegments.length === 0) {
        console.log('💡 Make sure transcript is loaded in Ejoy English')
        return { success: false, error: 'No transcript segments found' }
      }

      console.log('\n📄 Sample segments from Ejoy English:')
      const sampleSegments = Array.from(transcriptSegments).slice(0, 5)
      
      sampleSegments.forEach((segment, index) => {
        const timeData = segment.getAttribute('data-time')
        const textElement = segment.querySelector('.site-s-title .site-s-textSubItem span:first-child')
        
        if (timeData && textElement) {
          const [startMs, endMs] = timeData.split('-').map(t => parseInt(t))
          const startTime = (startMs / 1000).toFixed(1)
          const text = textElement.textContent?.trim()
          
          console.log(`   ${index + 1}. [${startTime}s] "${text?.substring(0, 60)}${text && text.length > 60 ? '...' : ''}"`)
        }
      })

      console.log(`\n✅ Ejoy English extraction would work! Found ${transcriptSegments.length} segments`)
      return { success: true, segmentCount: transcriptSegments.length }

    } catch (error) {
      console.log(`❌ Ejoy extraction test failed: ${error}`)
      return { success: false, error }
    }
  }

  /**
   * Test deep transcript extraction methods
   */
  static testDeepExtraction() {
    console.log('🔬 Testing Deep Transcript Extraction Methods\n')
    
    const results = {
      ytInitialPlayerResponse: false,
      ejoyStorage: false,
      ejoyDOM: false,
      scriptTags: 0,
      captionTracks: 0
    }
    
    try {
      // Test 1: Check ytInitialPlayerResponse
      console.log('1️⃣ Testing ytInitialPlayerResponse access...')
      if (typeof window !== 'undefined' && (window as any).ytInitialPlayerResponse) {
        console.log('   ✅ Found ytInitialPlayerResponse in window global')
        const captions = (window as any).ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        if (captions && captions.length > 0) {
          results.captionTracks = captions.length
          results.ytInitialPlayerResponse = true
          console.log(`   🎯 Found ${captions.length} caption tracks`)
          
          // Show available languages
          const languages = captions.map((track: any) => track.languageCode || track.name?.simpleText).filter(Boolean)
          console.log(`   🌐 Languages: ${languages.join(', ')}`)
        } else {
          console.log('   ⚠️ ytInitialPlayerResponse found but no captions')
        }
      } else {
        console.log('   ❌ ytInitialPlayerResponse not found in window')
      }

      // Test 2: Check script tags for ytInitialPlayerResponse
      console.log('\n2️⃣ Testing script tag extraction...')
      if (typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script')
        let foundInScript = false
        
        for (const script of scripts) {
          if (script.innerHTML.includes('ytInitialPlayerResponse')) {
            results.scriptTags++
            try {
              const match = script.innerHTML.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
              if (match) {
                const playerResponse = JSON.parse(match[1])
                const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
                if (captions && captions.length > 0) {
                  foundInScript = true
                  console.log(`   ✅ Found ${captions.length} caption tracks in script tag`)
                  break
                }
              }
            } catch (parseError) {
              continue
            }
          }
        }
        
        console.log(`   📜 Found ${results.scriptTags} scripts with ytInitialPlayerResponse`)
        if (!foundInScript && results.scriptTags > 0) {
          console.log('   ⚠️ Scripts found but failed to parse captions')
        }
      }

      // Test 3: Check Ejoy storage
      console.log('\n3️⃣ Testing Ejoy storage access...')
      const ejoyGlobals = ['__EJOY_DATA__', 'ejoyData', 'EJOY_TRANSCRIPT_CACHE']
      for (const globalName of ejoyGlobals) {
        if (typeof window !== 'undefined' && (window as any)[globalName]) {
          console.log(`   ✅ Found ${globalName} in window`)
          results.ejoyStorage = true
          break
        }
      }
      
      if (!results.ejoyStorage) {
        console.log('   ❌ No Ejoy storage globals found')
      }

      // Test 4: Check Ejoy DOM elements
      console.log('\n4️⃣ Testing Ejoy DOM cache...')
      if (typeof document !== 'undefined') {
        const ejoyElements = document.querySelectorAll('[data-ejoy-transcript], [data-transcript-cache]')
        if (ejoyElements.length > 0) {
          console.log(`   ✅ Found ${ejoyElements.length} Ejoy cache elements`)
          results.ejoyDOM = true
        } else {
          console.log('   ❌ No Ejoy DOM cache elements found')
        }
      }

      // Summary
      console.log('\n📊 Deep Extraction Test Summary:')
      console.log(`   ytInitialPlayerResponse: ${results.ytInitialPlayerResponse ? '✅' : '❌'}`)
      console.log(`   Caption tracks available: ${results.captionTracks}`)
      console.log(`   Script tags with data: ${results.scriptTags}`)
      console.log(`   Ejoy storage: ${results.ejoyStorage ? '✅' : '❌'}`)
      console.log(`   Ejoy DOM cache: ${results.ejoyDOM ? '✅' : '❌'}`)

      const workingMethods = [
        results.ytInitialPlayerResponse && 'ytInitialPlayerResponse',
        results.ejoyStorage && 'ejoyStorage', 
        results.ejoyDOM && 'ejoyDOM'
      ].filter(Boolean)

      if (workingMethods.length > 0) {
        console.log(`\n🎉 ${workingMethods.length} deep extraction methods available: ${workingMethods.join(', ')}`)
      } else {
        console.log('\n⚠️ No deep extraction methods available - will fallback to npm packages and direct URLs')
      }

      return { success: true, results, workingMethods }

    } catch (error) {
      console.log(`❌ Deep extraction test failed: ${error}`)
      return { success: false, error, results }
    }
  }

  /**
   * Quick test with a known working video
   */
  static async quickTest() {
    console.log('🚀 FluentFlow Quick Transcript Test\n')
    
    // Test with Rick Ashley (known to have auto-generated captions)
    const testVideo = 'dQw4w9WgXcQ'
    return await this.debugTranscriptExtraction(testVideo, 10, 40)
  }

  /**
   * Batch test multiple videos
   */
  static async batchTest(videoIds: string[]) {
    console.log(`🔄 FluentFlow Batch Transcript Test (${videoIds.length} videos)\n`)
    
    const results = []
    for (const videoId of videoIds) {
      console.log(`\n${'='.repeat(50)}`)
      const result = await this.debugTranscriptExtraction(videoId)
      results.push({ videoId, ...result })
    }

    console.log(`\n📊 Batch Test Summary:`)
    console.log(`   ✅ Successful: ${results.filter(r => r.success).length}/${results.length}`)
    console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}/${results.length}`)

    return results
  }
}

// Export for easy console access during development
if (typeof window !== 'undefined') {
  (window as any).FluentFlowTranscriptDebug = TranscriptDebugUtil
  console.log('🛠️  FluentFlow Transcript Debug available as: window.FluentFlowTranscriptDebug')
  console.log('   • Quick test: FluentFlowTranscriptDebug.quickTest()')
  console.log('   • Debug video: FluentFlowTranscriptDebug.debugTranscriptExtraction("VIDEO_ID")')
}
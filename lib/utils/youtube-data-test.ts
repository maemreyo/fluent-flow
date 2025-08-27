import { YouTubeDataExtractor, type YouTubeVideoMetadata } from '../services/youtube-data-extractor'
import { YouTubeExtractionMonitor } from '../services/youtube-extraction-monitor'

interface TestResult {
  testName: string
  success: boolean
  duration: number
  error?: string
  data?: any
}

interface TestSuite {
  name: string
  results: TestResult[]
  overallSuccess: boolean
  totalDuration: number
}

export class YouTubeDataTestSuite {
  private extractor: YouTubeDataExtractor
  private monitor: YouTubeExtractionMonitor
  private testVideoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', '9bZkp7q19f0'] // Rick Roll, Me at the zoo, Popular music video

  constructor() {
    this.extractor = new YouTubeDataExtractor()
    this.monitor = new YouTubeExtractionMonitor()
  }

  public async runAllTests(): Promise<TestSuite[]> {
    const testSuites: TestSuite[] = []

    testSuites.push(await this.testWindowObjectsExtraction())
    testSuites.push(await this.testInnerTubeAPIExtraction())
    testSuites.push(await this.testHealthMonitoring())
    testSuites.push(await this.testErrorHandling())

    return testSuites
  }

  private async testWindowObjectsExtraction(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Window Objects Extraction',
      results: [],
      overallSuccess: true,
      totalDuration: 0
    }

    suite.results.push(await this.runTest(
      'Window ytInitialPlayerResponse availability',
      async () => {
        const hasPlayerResponse = typeof window !== 'undefined' && !!(window as any).ytInitialPlayerResponse
        
        if (!hasPlayerResponse) {
          const scripts = document.querySelectorAll('script')
          let found = false
          
          for (const script of scripts) {
            if (script.innerHTML.includes('ytInitialPlayerResponse')) {
              found = true
              break
            }
          }
          
          if (!found) {
            throw new Error('ytInitialPlayerResponse not found in window or scripts')
          }
        }
        
        return { available: true, method: hasPlayerResponse ? 'window' : 'script' }
      }
    ))

    suite.results.push(await this.runTest(
      'Window ytInitialData availability',
      async () => {
        const hasInitialData = typeof window !== 'undefined' && !!(window as any).ytInitialData
        
        if (!hasInitialData) {
          const scripts = document.querySelectorAll('script')
          let found = false
          
          for (const script of scripts) {
            if (script.innerHTML.includes('ytInitialData')) {
              found = true
              break
            }
          }
          
          if (!found) {
            throw new Error('ytInitialData not found in window or scripts')
          }
        }
        
        return { available: true, method: hasInitialData ? 'window' : 'script' }
      }
    ))

    if (this.isOnYouTubeVideo()) {
      suite.results.push(await this.runTest(
        'Extract current video data from window objects',
        async () => {
          const result = await this.extractor.extractVideoData()
          
          if (!result.success) {
            throw new Error(result.error || 'Extraction failed')
          }
          
          if (!result.data) {
            throw new Error('No data returned despite success')
          }
          
          this.validateVideoMetadata(result.data)
          
          return result.data
        }
      ))
    }

    suite.overallSuccess = suite.results.every(r => r.success)
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    
    return suite
  }

  private async testInnerTubeAPIExtraction(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'InnerTube API Extraction',
      results: [],
      overallSuccess: true,
      totalDuration: 0
    }

    for (const videoId of this.testVideoIds) {
      suite.results.push(await this.runTest(
        `Extract video data via InnerTube API for ${videoId}`,
        async () => {
          const result = await this.extractor.extractVideoData(videoId)
          
          if (!result.success || result.method === 'window_objects') {
            throw new Error(`Failed to use InnerTube API: ${result.error}`)
          }
          
          if (!result.data) {
            throw new Error('No data returned despite success')
          }
          
          this.validateVideoMetadata(result.data)
          
          return { videoId, method: result.method, reliability: result.reliability }
        }
      ))
    }

    suite.overallSuccess = suite.results.every(r => r.success)
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    
    return suite
  }

  private async testHealthMonitoring(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Health Monitoring',
      results: [],
      overallSuccess: true,
      totalDuration: 0
    }

    suite.results.push(await this.runTest(
      'Perform health check',
      async () => {
        const healthReport = await this.monitor.performHealthCheck()
        
        if (typeof healthReport.overallHealth !== 'number' || healthReport.overallHealth < 0 || healthReport.overallHealth > 1) {
          throw new Error(`Invalid health score: ${healthReport.overallHealth}`)
        }
        
        if (!healthReport.methods.windowObjects || !healthReport.methods.innerTubeAPI) {
          throw new Error('Missing method results in health report')
        }
        
        return {
          overallHealth: healthReport.overallHealth,
          windowObjectsSuccess: healthReport.methods.windowObjects.success,
          innerTubeSuccess: healthReport.methods.innerTubeAPI.success,
          recommendationsCount: healthReport.recommendations.length
        }
      }
    ))

    suite.results.push(await this.runTest(
      'Get extraction metrics',
      async () => {
        const metrics = this.monitor.getHealthMetrics()
        
        if (typeof metrics.successRate !== 'number' || metrics.successRate < 0 || metrics.successRate > 1) {
          throw new Error(`Invalid success rate: ${metrics.successRate}`)
        }
        
        return {
          successRate: metrics.successRate,
          averageResponseTime: metrics.averageResponseTime,
          dataIntegrityScore: metrics.dataIntegrityScore
        }
      }
    ))

    suite.overallSuccess = suite.results.every(r => r.success)
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    
    return suite
  }

  private async testErrorHandling(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: 'Error Handling',
      results: [],
      overallSuccess: true,
      totalDuration: 0
    }

    suite.results.push(await this.runTest(
      'Handle invalid video ID gracefully',
      async () => {
        const result = await this.extractor.extractVideoData('invalid_video_id_12345')
        
        if (result.success) {
          throw new Error('Expected extraction to fail for invalid video ID')
        }
        
        if (!result.error) {
          throw new Error('No error message provided for failed extraction')
        }
        
        return { errorHandled: true, errorMessage: result.error }
      }
    ))

    suite.results.push(await this.runTest(
      'Handle missing video ID gracefully',
      async () => {
        const originalUrl = window.location.href
        
        try {
          Object.defineProperty(window, 'location', {
            value: { href: 'https://www.youtube.com/watch' },
            writable: true
          })
          
          const result = await this.extractor.extractVideoData()
          
          if (result.success) {
            throw new Error('Expected extraction to fail for missing video ID')
          }
          
          return { errorHandled: true, errorMessage: result.error }
        } finally {
          Object.defineProperty(window, 'location', {
            value: { href: originalUrl },
            writable: true
          })
        }
      }
    ))

    suite.overallSuccess = suite.results.every(r => r.success)
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    
    return suite
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = performance.now()
    
    try {
      const data = await testFn()
      const duration = performance.now() - startTime
      
      return {
        testName,
        success: true,
        duration,
        data
      }
    } catch (error) {
      const duration = performance.now() - startTime
      
      return {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private validateVideoMetadata(metadata: YouTubeVideoMetadata): void {
    if (!metadata.videoId || typeof metadata.videoId !== 'string') {
      throw new Error('Invalid or missing videoId')
    }
    
    if (!metadata.title || typeof metadata.title !== 'string') {
      throw new Error('Invalid or missing title')
    }
    
    if (!metadata.author || typeof metadata.author !== 'string') {
      throw new Error('Invalid or missing author')
    }
    
    if (typeof metadata.duration !== 'number' || metadata.duration <= 0) {
      throw new Error('Invalid duration')
    }
    
    if (!Array.isArray(metadata.thumbnails) || metadata.thumbnails.length === 0) {
      throw new Error('Invalid or missing thumbnails')
    }
  }

  private isOnYouTubeVideo(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname === 'www.youtube.com' && 
           window.location.pathname === '/watch' &&
           window.location.search.includes('v=')
  }

  public async generateTestReport(): Promise<string> {
    const testSuites = await this.runAllTests()
    
    let report = '# YouTube Data Extraction Test Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n`
    report += `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\n\n`
    
    for (const suite of testSuites) {
      report += `## ${suite.name}\n`
      report += `Overall Success: ${suite.overallSuccess ? '✅' : '❌'}\n`
      report += `Total Duration: ${suite.totalDuration.toFixed(2)}ms\n\n`
      
      for (const result of suite.results) {
        report += `### ${result.testName}\n`
        report += `Status: ${result.success ? '✅ Pass' : '❌ Fail'}\n`
        report += `Duration: ${result.duration.toFixed(2)}ms\n`
        
        if (result.error) {
          report += `Error: ${result.error}\n`
        }
        
        if (result.data) {
          report += `Data: \`${JSON.stringify(result.data, null, 2).slice(0, 200)}${JSON.stringify(result.data).length > 200 ? '...' : ''}\`\n`
        }
        
        report += '\n'
      }
      
      report += '---\n\n'
    }
    
    const overallSuccess = testSuites.every(s => s.overallSuccess)
    const totalTests = testSuites.reduce((sum, s) => sum + s.results.length, 0)
    const passedTests = testSuites.reduce((sum, s) => sum + s.results.filter(r => r.success).length, 0)
    
    report += `## Summary\n`
    report += `Overall Status: ${overallSuccess ? '✅ All tests passed' : '❌ Some tests failed'}\n`
    report += `Tests Passed: ${passedTests}/${totalTests}\n`
    report += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`
    
    return report
  }
}
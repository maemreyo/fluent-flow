import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { testYouTubeExtraction, testSpecificVideo, testExtractionMethods } from '@/lib/utils/test-youtube-extraction'

interface TestResults {
  extraction?: any
  health?: any
  tests?: any[]
  summary?: {
    overallSuccess: boolean
    passedTests: number
    totalTests: number
    successRate: number
  }
}

export function YouTubeExtractionTestPanel() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResults | null>(null)
  const [testVideoId, setTestVideoId] = useState('dQw4w9WgXcQ')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const runFullTest = async () => {
    setIsRunning(true)
    setResults(null)
    setLogs([])
    
    try {
      addLog('🧪 Starting comprehensive YouTube extraction tests...')
      
      const testResults = await testYouTubeExtraction()
      setResults(testResults)
      
      addLog('✅ All tests completed successfully!')
      
    } catch (error) {
      addLog(`❌ Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Test execution failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const runSpecificVideoTest = async () => {
    if (!testVideoId.trim()) return
    
    setIsRunning(true)
    addLog(`🎯 Testing video: ${testVideoId}`)
    
    try {
      const result = await testSpecificVideo(testVideoId)
      
      if (result.success) {
        addLog('✅ Video extraction successful!')
        addLog(`📹 Title: ${result.data?.title}`)
        addLog(`👤 Author: ${result.data?.author}`)
        addLog(`⏱️ Duration: ${result.data?.duration}s`)
        addLog(`🎬 Method: ${result.method}`)
        addLog(`🎯 Reliability: ${(result.reliability * 100).toFixed(1)}%`)
      } else {
        addLog(`❌ Video extraction failed: ${result.error}`)
      }
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const runMethodTest = async () => {
    setIsRunning(true)
    addLog('🔍 Testing individual extraction methods...')
    
    try {
      await testExtractionMethods()
      addLog('✅ Method testing completed!')
    } catch (error) {
      addLog(`❌ Method testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getCurrentVideoId = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href
      const match = url.match(/[?&]v=([^&#]*)/)
      if (match) {
        setTestVideoId(match[1])
        addLog(`📺 Current video ID: ${match[1]}`)
      } else {
        addLog('⚠️ Not on a YouTube video page')
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>YouTube Data Extraction Tests</CardTitle>
          <CardDescription>
            Test the new YouTube data extraction implementation with fallback mechanisms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={runFullTest} 
              disabled={isRunning}
              variant="default"
            >
              {isRunning ? '🧪 Running...' : '🧪 Full Test Suite'}
            </Button>
            
            <Button 
              onClick={runMethodTest} 
              disabled={isRunning}
              variant="outline"
            >
              🔍 Method Tests
            </Button>
            
            <Button 
              onClick={getCurrentVideoId} 
              disabled={isRunning}
              variant="outline"
            >
              📺 Get Current Video
            </Button>
          </div>

          {/* Specific Video Test */}
          <div className="flex gap-2">
            <input
              type="text"
              value={testVideoId}
              onChange={(e) => setTestVideoId(e.target.value)}
              placeholder="Video ID (e.g., dQw4w9WgXcQ)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={isRunning}
            />
            <Button 
              onClick={runSpecificVideoTest} 
              disabled={isRunning || !testVideoId.trim()}
              variant="outline"
            >
              🎯 Test Video
            </Button>
          </div>

          {/* Test Results Summary */}
          {results && (
            <div className="space-y-3">
              <Separator />
              <h3 className="font-semibold">Test Results Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.summary?.overallSuccess ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">Overall Status</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.summary?.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.health?.overallHealth ? (results.health.overallHealth * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-sm text-gray-600">Health Score</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.summary?.passedTests}/{results.summary?.totalTests}
                  </div>
                  <div className="text-sm text-gray-600">Tests Passed</div>
                </div>
              </div>

              {/* Extraction Method Status */}
              {results.health && (
                <div className="space-y-2">
                  <h4 className="font-medium">Extraction Method Status</h4>
                  <div className="flex gap-2">
                    <Badge variant={results.health.methods?.windowObjects?.success ? "default" : "destructive"}>
                      🪟 Window Objects: {results.health.methods?.windowObjects?.success ? 'Working' : 'Failed'}
                    </Badge>
                    <Badge variant={results.health.methods?.innerTubeAPI?.success ? "default" : "destructive"}>
                      🔌 InnerTube API: {results.health.methods?.innerTubeAPI?.success ? 'Working' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Extraction Data Preview */}
              {results.extraction?.success && results.extraction.data && (
                <div className="space-y-2">
                  <h4 className="font-medium">Current Video Data</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div><strong>Title:</strong> {results.extraction.data.title}</div>
                    <div><strong>Author:</strong> {results.extraction.data.author}</div>
                    <div><strong>Duration:</strong> {results.extraction.data.duration}s</div>
                    <div><strong>Views:</strong> {results.extraction.data.viewCount}</div>
                    <div><strong>Captions:</strong> {results.extraction.data.captions?.length || 0} languages</div>
                    <div><strong>Method:</strong> {results.extraction.method}</div>
                    <div><strong>Reliability:</strong> {(results.extraction.reliability * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Panel */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Test Logs</CardTitle>
            <Button 
              onClick={clearLogs} 
              variant="outline" 
              size="sm"
              disabled={logs.length === 0}
            >
              Clear Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full border rounded p-3">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm">No logs yet. Run a test to see results here.</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
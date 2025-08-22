'use client'

import { useState } from 'react'

export default function Home() {
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(30)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testTranscript = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getSegment',
          videoId,
          startTime,
          endTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkAvailability',
          videoId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            FluentFlow Transcript Service
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            YouTube Transcript Extraction API using YouTube.js
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Transcript Extraction</h2>
          
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label htmlFor="videoId" className="block text-sm font-medium text-gray-700">
                Video ID or URL
              </label>
              <input
                type="text"
                id="videoId"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=dQw4w9WgXcQ"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  Start Time (seconds)
                </label>
                <input
                  type="number"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(Number(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                  End Time (seconds)
                </label>
                <input
                  type="number"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(Number(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={testTranscript}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Transcript'}
            </button>
            
            <button
              onClick={checkAvailability}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Check Availability'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Result</h3>
                <div className="mt-2 text-sm text-green-700">
                  <pre className="whitespace-pre-wrap overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">API Usage</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Endpoint:</strong> POST /api/transcript</p>
            <p><strong>Actions:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>getSegment</code> - Extract transcript for time range</li>
              <li><code>checkAvailability</code> - Check if transcript is available</li>
              <li><code>getLanguages</code> - Get available languages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

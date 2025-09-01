'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { testTranscript, checkAvailability } from './queries'

export default function Home() {
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(30)

  const transcriptMutation = useMutation({
    mutationFn: testTranscript
  })

  const availabilityMutation = useMutation({
    mutationFn: checkAvailability
  })

  const handleTestTranscript = () => {
    transcriptMutation.mutate({
      videoId,
      startTime,
      endTime,
      language: 'en'
    })
  }

  const handleCheckAvailability = () => {
    availabilityMutation.mutate({
      videoId,
      language: 'en'
    })
  }

  const loading =
    transcriptMutation.isPending || availabilityMutation.isPending
  const error = transcriptMutation.error || availabilityMutation.error
  const result = transcriptMutation.data || availabilityMutation.data

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header with User Avatar */}
        <div className="mb-8 flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              FluentFlow Transcript Service
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              YouTube Transcript Extraction API using YouTube.js
            </p>
          </div>

          {/* Placeholder for UserAvatar - will be integrated with authentication */}
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs text-gray-600">U</span>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Test Transcript Extraction
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="videoId"
                className="block text-sm font-medium text-gray-700"
              >
                Video ID or URL
              </label>
              <input
                type="text"
                id="videoId"
                value={videoId}
                onChange={e => setVideoId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=dQw4w9WgXcQ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Time (seconds)
                </label>
                <input
                  type="number"
                  id="startTime"
                  value={startTime}
                  onChange={e => setStartTime(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Time (seconds)
                </label>
                <input
                  type="number"
                  id="endTime"
                  value={endTime}
                  onChange={e => setEndTime(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleTestTranscript}
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {transcriptMutation.isPending ? 'Loading...' : 'Get Transcript'}
            </button>

            <button
              onClick={handleCheckAvailability}
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {availabilityMutation.isPending
                ? 'Loading...'
                : 'Check Availability'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Result</h3>
                <div className="mt-2 text-sm text-green-700">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-6">
          <h3 className="mb-3 text-lg font-medium text-gray-900">
            API Usage
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Endpoint:</strong> POST /api/transcript
            </p>
            <p>
              <strong>Actions:</strong>
            </p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>
                <code>getSegment</code> - Extract transcript for time range
              </li>
              <li>
                <code>checkAvailability</code> - Check if transcript is
                available
              </li>
              <li>
                <code>getLanguages</code> - Get available languages
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
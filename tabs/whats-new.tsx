const WhatsNew = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">
          What's New in Fluent Flow
        </h1>

        {/* Version 1.2.0 */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-indigo-600">
            Version 1.2.0 - August 26, 2025
          </h2>
          <ul className="list-inside list-disc space-y-2 text-gray-700">
            <li>
              <span className="font-medium text-green-600">New Feature:</span> Enhanced AI Chat
              Panel with real-time suggestions.
            </li>
            <li>
              <span className="font-medium text-blue-600">Improvement:</span> Optimized audio
              processing for faster transcript generation.
            </li>
            <li>
              <span className="font-medium text-red-600">Bug Fix:</span> Resolved an issue where
              recording sometimes failed to save.
            </li>
            <li>
              <span className="font-medium text-blue-600">Improvement:</span> Improved UI
              responsiveness across all components.
            </li>
          </ul>
        </section>

        {/* Version 1.1.0 */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-indigo-600">
            Version 1.1.0 - July 15, 2025
          </h2>
          <ul className="list-inside list-disc space-y-2 text-gray-700">
            <li>
              <span className="font-medium text-green-600">New Feature:</span> Added a new dashboard
              with analytics and session tracking.
            </li>
            <li>
              <span className="font-medium text-blue-600">Improvement:</span> Refactored storage
              management for better performance.
            </li>
            <li>
              <span className="font-medium text-red-600">Bug Fix:</span> Fixed display issues on
              smaller screens.
            </li>
          </ul>
        </section>

        {/* Version 1.0.0 - Initial Release */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-indigo-600">
            Version 1.0.0 - June 1, 2025
          </h2>
          <ul className="list-inside list-disc space-y-2 text-gray-700">
            <li>
              <span className="font-medium text-green-600">Initial Release:</span> Core
              functionality for audio recording and basic transcript generation.
            </li>
            <li>
              <span className="font-medium text-green-600">Feature:</span> Basic AI quick actions.
            </li>
          </ul>
        </section>

        <p className="mt-10 text-center text-gray-600">
          Thank you for using Fluent Flow! We're constantly working to improve your experience.
        </p>
      </div>
    </div>
  )
}

export default WhatsNew

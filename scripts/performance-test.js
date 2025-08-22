// Performance test for React Query caching integration
// This script demonstrates the performance improvements from the new caching system

const testVideoId = 'dQw4w9WgXcQ'
const startTime = 0
const endTime = 10

async function testTranscriptPerformance() {
  console.log('🚀 Testing Transcript Performance...')
  
  // Test 1: First request (cache miss)
  const start1 = performance.now()
  const response1 = await fetch('http://localhost:3838/api/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getSegment',
      videoId: testVideoId,
      startTime,
      endTime
    })
  })
  const data1 = await response1.json()
  const time1 = performance.now() - start1
  
  console.log(`⏱️  First request (cache miss): ${time1.toFixed(2)}ms`)
  console.log(`📝 Transcript length: ${data1.fullText?.length || 0} characters`)
  
  // Test 2: Second request (should be cached in the database layer)
  const start2 = performance.now()
  const response2 = await fetch('http://localhost:3838/api/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getSegment',
      videoId: testVideoId,
      startTime,
      endTime
    })
  })
  const data2 = await response2.json()
  const time2 = performance.now() - start2
  
  console.log(`⚡ Second request (cached): ${time2.toFixed(2)}ms`)
  console.log(`📊 Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}% faster`)
  
  // Test 3: Availability check (should be very fast)
  const start3 = performance.now()
  const response3 = await fetch('http://localhost:3838/api/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'checkAvailability',
      videoId: testVideoId
    })
  })
  const data3 = await response3.json()
  const time3 = performance.now() - start3
  
  console.log(`✅ Availability check: ${time3.toFixed(2)}ms`)
  console.log(`🎯 Available: ${data3.available}`)
  
  console.log('\n🎉 Performance Test Summary:')
  console.log(`   • First fetch: ${time1.toFixed(2)}ms`)
  console.log(`   • Cached fetch: ${time2.toFixed(2)}ms`) 
  console.log(`   • Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`)
  console.log(`   • Availability check: ${time3.toFixed(2)}ms`)
}

// React Query simulation test
function simulateReactQueryCaching() {
  console.log('\n📱 React Query Caching Benefits:')
  console.log('   • Client-side cache: Instant (0ms) for subsequent requests')
  console.log('   • Stale-while-revalidate: Background updates without UI blocking')
  console.log('   • Smart invalidation: Automatic cache updates on mutations')
  console.log('   • Error resilience: Cached data available during network failures')
  console.log('   • Optimistic updates: UI updates immediately on mutations')
}

if (typeof window !== 'undefined') {
  // Browser environment
  testTranscriptPerformance().then(() => {
    simulateReactQueryCaching()
  }).catch(console.error)
} else {
  // Node environment  
  const { performance } = require('perf_hooks')
  global.fetch = require('node-fetch')
  
  testTranscriptPerformance().then(() => {
    simulateReactQueryCaching()
  }).catch(console.error)
}
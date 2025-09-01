export const testTranscript = async (variables: {
  videoId: string
  startTime: number
  endTime: number
  language: string
}): Promise<any> => {
  const response = await fetch('/api/transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'getSegment',
      ...variables
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

export const checkAvailability = async (variables: {
  videoId: string
  language: string
}): Promise<any> => {
  const response = await fetch('/api/transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'checkAvailability',
      ...variables
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

'use client'

import { useState, useMemo } from 'react'

export interface UsePageSearchOptions<T> {
  data: T[]
  searchFields: (keyof T)[]
  initialQuery?: string
}

export interface UsePageSearchResult<T> {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredData: T[]
  hasResults: boolean
}

export function usePageSearch<T>({
  data,
  searchFields,
  initialQuery = ''
}: UsePageSearchOptions<T>): UsePageSearchResult<T> {
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data
    }

    const query = searchQuery.toLowerCase()
    return data.filter(item => {
      return searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query)
        }
        if (typeof value === 'number') {
          return value.toString().includes(query)
        }
        return false
      })
    })
  }, [data, searchQuery, searchFields])

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
    hasResults: filteredData.length > 0
  }
}
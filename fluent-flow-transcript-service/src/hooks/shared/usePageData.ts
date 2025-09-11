'use client'

import { useQuery, UseQueryOptions } from '@tanstack/react-query'

export interface UsePageDataOptions<T> {
  queryKey: (string | number | boolean)[]
  queryFn: () => Promise<T[]>
  isAuthenticated: boolean
  enabled?: boolean
  queryOptions?: Partial<UseQueryOptions<T[], Error>>
}

export interface UsePageDataResult<T> {
  data: T[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  invalidate: () => void
}

export function usePageData<T>({
  queryKey,
  queryFn,
  isAuthenticated,
  enabled = true,
  queryOptions = {}
}: UsePageDataOptions<T>): UsePageDataResult<T> {
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: isAuthenticated && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...queryOptions
  })

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => query.refetch()
  }
}
'use client'

import { ReactNode, ComponentType } from 'react'

interface SearchableGridProps<T> {
  data: T[]
  isLoading?: boolean
  error?: Error | null
  CardComponent: ComponentType<{ item: T; [key: string]: any }>
  EmptyComponent?: ComponentType<any>
  cardProps?: Record<string, any>
  emptyProps?: Record<string, any>
  gridClassName?: string
  children?: ReactNode
}

export function SearchableGrid<T>({
  data,
  isLoading = false,
  error = null,
  CardComponent,
  EmptyComponent,
  cardProps = {},
  emptyProps = {},
  gridClassName = "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
  children
}: SearchableGridProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return EmptyComponent ? (
      <EmptyComponent {...emptyProps} />
    ) : (
      <div className="text-center py-12">
        <p className="text-gray-600">No items found</p>
      </div>
    )
  }

  return (
    <>
      {children}
      <div className={gridClassName}>
        {data.map((item, index) => (
          <CardComponent
            key={index}
            item={item}
            {...cardProps}
          />
        ))}
      </div>
    </>
  )
}
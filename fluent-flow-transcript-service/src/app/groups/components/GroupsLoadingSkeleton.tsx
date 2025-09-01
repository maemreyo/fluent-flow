export function GroupsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div
          key={i}
          className="animate-pulse rounded-3xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm"
        >
          <div className="mb-3 h-6 rounded-xl bg-gray-200"></div>
          <div className="mb-4 h-4 rounded-lg bg-gray-200"></div>
          <div className="h-4 w-2/3 rounded-lg bg-gray-200"></div>
        </div>
      ))}
    </div>
  )
}

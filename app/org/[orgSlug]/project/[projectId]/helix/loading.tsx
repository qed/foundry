export default function HelixLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="h-4 w-96 bg-bg-tertiary rounded animate-pulse" />
      </div>

      {/* Stage cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-bg-secondary border border-border-default rounded-lg space-y-3"
          >
            <div className="h-5 w-24 bg-bg-tertiary rounded animate-pulse" />
            <div className="h-3 w-full bg-bg-tertiary rounded animate-pulse" />
            <div className="h-2 w-full bg-bg-tertiary rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

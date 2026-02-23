import { Skeleton, CardSkeleton } from '@/components/ui/skeleton'

export default function HallLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-28 rounded" />
              <Skeleton className="h-3 w-44 rounded mt-1 hidden sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-lg hidden md:block" />
            <Skeleton className="h-9 w-28 rounded-lg hidden md:block" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      {/* Grid */}
      <div className="flex-1 p-4 md:px-6 lg:px-8 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

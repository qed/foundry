import { Spinner } from '@/components/ui/spinner'

export default function HallLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bg-tertiary rounded-lg animate-pulse" />
            <div>
              <div className="h-6 w-28 bg-bg-tertiary rounded animate-pulse" />
              <div className="h-3 w-44 bg-bg-tertiary rounded animate-pulse mt-1 hidden sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-bg-tertiary rounded-lg animate-pulse hidden md:block" />
            <div className="h-9 w-28 bg-bg-tertiary rounded-lg animate-pulse hidden md:block" />
          </div>
        </div>
        <div className="h-10 bg-bg-tertiary rounded-lg animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    </div>
  )
}

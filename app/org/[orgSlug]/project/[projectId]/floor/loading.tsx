import { Skeleton, KanbanSkeleton } from '@/components/ui/skeleton'

export default function FloorLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanSkeleton />
      </div>
    </div>
  )
}

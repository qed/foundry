import { Skeleton, InboxSkeleton, DetailPanelSkeleton } from '@/components/ui/skeleton'

export default function LabLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-18 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-border-default bg-bg-secondary">
          <InboxSkeleton />
        </div>
        <div className="flex-1">
          <DetailPanelSkeleton />
        </div>
      </div>
    </div>
  )
}

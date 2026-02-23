import { Skeleton, ListItemSkeleton, DetailPanelSkeleton } from '@/components/ui/skeleton'

export default function RoomLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-border-default">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
        <div className="flex-1">
          <DetailPanelSkeleton />
        </div>
      </div>
    </div>
  )
}

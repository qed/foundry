import { Skeleton, TreeSkeleton, DetailPanelSkeleton } from '@/components/ui/skeleton'

export default function ShopLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      {/* Two panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-border-default">
          <TreeSkeleton />
        </div>
        <div className="flex-1">
          <DetailPanelSkeleton />
        </div>
      </div>
    </div>
  )
}

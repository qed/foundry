import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function ArtifactsLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <Skeleton className="h-7 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <TableSkeleton rows={8} />
      </div>
    </div>
  )
}

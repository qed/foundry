import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-bg-tertiary/60',
        className
      )}
      style={style}
    />
  )
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-border-default p-4 space-y-3', className)}>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

export function ListItemSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 border-b border-border-default', className)}>
      <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full flex-shrink-0" />
    </div>
  )
}

export function InboxSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailPanelSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 p-4 overflow-hidden">
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="w-72 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {Array.from({ length: 2 + (col % 3) }).map((_, card) => (
            <div key={card} className="rounded-lg border border-border-default p-3 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function TreeSkeleton({ depth = 3 }: { depth?: number }) {
  return (
    <div className="space-y-1 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2 py-1.5">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16 rounded-full ml-auto" />
          </div>
          {i < depth && (
            <div className="pl-6 space-y-1">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2 py-1.5">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const CHART_BAR_HEIGHTS = ['45%', '72%', '58%', '85%', '35%', '68%', '50%', '78%']

export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-border-default p-4', className)}>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {CHART_BAR_HEIGHTS.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 bg-bg-tertiary/30 border-b border-border-default">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border-default last:border-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  )
}

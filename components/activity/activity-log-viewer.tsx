'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { ActivityFilters, type ActivityLogFilters } from './activity-filters'
import { ActivityItem } from './activity-item'

interface ActivityLogViewerProps {
  projectId: string
  entityType?: string
  entityId?: string
}

const EMPTY_FILTERS: ActivityLogFilters = {
  userId: '',
  action: '',
  entityType: '',
  fromDate: '',
  toDate: '',
  search: '',
}

const PAGE_SIZE = 50

export function ActivityLogViewer({ projectId, entityType, entityId }: ActivityLogViewerProps) {
  const [filters, setFilters] = useState<ActivityLogFilters>(EMPTY_FILTERS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activities, setActivities] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchActivities = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)

      try {
        const params = new URLSearchParams()
        if (filters.userId) params.set('user_id', filters.userId)
        if (filters.action) params.set('search', filters.action)
        if (filters.entityType) params.set('entity_type', filters.entityType)
        if (filters.fromDate) params.set('from_date', filters.fromDate)
        if (filters.toDate) params.set('to_date', filters.toDate)
        if (filters.search) params.set('search', filters.search)
        if (entityType) params.set('entity_type', entityType)
        if (entityId) params.set('entity_id', entityId)
        params.set('limit', String(PAGE_SIZE))
        params.set('offset', String(offset))

        const res = await fetch(`/api/projects/${projectId}/activity-log?${params}`)
        if (!res.ok) throw new Error('Failed to fetch activity log')

        const data = await res.json()
        if (append) {
          setActivities((prev) => [...prev, ...data.activities])
        } else {
          setActivities(data.activities)
        }
        setTotalCount(data.total_count)
        setHasMore(data.hasMore)
      } catch (err) {
        console.error('Failed to fetch activity log:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [projectId, entityType, entityId, filters]
  )

  // Debounced fetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchActivities(0)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchActivities])

  function handleLoadMore() {
    if (!loadingMore && hasMore) {
      fetchActivities(activities.length, true)
    }
  }

  // Hide filters when scoped to a specific entity
  const showFilters = !entityType || !entityId

  return (
    <div className="space-y-4">
      {showFilters && <ActivityFilters filters={filters} onChange={setFilters} />}

      <p className="text-xs text-text-tertiary">
        {totalCount} activit{totalCount !== 1 ? 'ies' : 'y'}
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : activities.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center">
          <ClipboardList className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">No activity yet</p>
          <p className="text-xs text-text-tertiary">
            Actions performed in this project will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="glass-panel rounded-xl divide-y divide-border-default overflow-hidden">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-sm text-accent-cyan hover:text-accent-cyan/80 transition-colors disabled:opacity-50"
              >
                {loadingMore ? <Spinner size="sm" /> : 'Load more'}
              </button>
            </div>
          )}

          {!hasMore && activities.length > 0 && (
            <p className="text-center text-xs text-text-tertiary pt-2">
              All {totalCount} activities loaded
            </p>
          )}
        </>
      )}
    </div>
  )
}

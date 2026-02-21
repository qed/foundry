'use client'

import { useEffect, useState, useCallback } from 'react'
import { Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { timeAgo } from '@/lib/utils'

interface ConnectedIdea {
  id: string
  title: string
  body: string | null
  status: string
  created_at: string
  creator: { display_name: string | null; avatar_url: string | null } | null
}

interface Connection {
  id: string
  connection_type: string
  direction: 'outgoing' | 'incoming'
  connected_idea: ConnectedIdea | null
}

const CONNECTION_TYPE_CONFIG: Record<string, { label: string; variant: 'default' | 'purple' | 'warning' }> = {
  related: { label: 'Related', variant: 'default' },
  duplicates: { label: 'Duplicates', variant: 'warning' },
  extends: { label: 'Extends', variant: 'purple' },
}

interface RelatedIdeasSectionProps {
  ideaId: string
  onIdeaClick?: (ideaId: string) => void
}

export function RelatedIdeasSection({ ideaId, onIdeaClick }: RelatedIdeasSectionProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchConnections = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/hall/ideas/${ideaId}/connections`)
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
      }
    } catch (err) {
      console.error('Error fetching connections:', err)
    } finally {
      setIsLoading(false)
    }
  }, [ideaId])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Related Ideas
        </h3>
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Related Ideas
        </h3>
        <div className="flex items-center gap-2 py-4 text-text-tertiary text-sm">
          <Link2 className="w-4 h-4" />
          <span>No connections yet</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Related Ideas
      </h3>
      <div className="space-y-2">
        {connections.map((conn) => {
          if (!conn.connected_idea) return null

          const typeCfg = CONNECTION_TYPE_CONFIG[conn.connection_type] || CONNECTION_TYPE_CONFIG.related
          const creatorName = conn.connected_idea.creator?.display_name || 'Unknown'
          const creatorInitials = creatorName !== 'Unknown'
            ? creatorName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?'

          return (
            <button
              key={conn.id}
              onClick={() => onIdeaClick?.(conn.connected_idea!.id)}
              className="w-full text-left p-3 rounded-lg border border-border-default hover:border-accent-cyan/30 hover:bg-bg-tertiary/50 transition-all group"
            >
              <div className="flex items-start gap-3">
                <Badge variant={typeCfg.variant} className="text-[10px] shrink-0 mt-0.5">
                  {typeCfg.label}
                </Badge>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-primary truncate group-hover:text-accent-cyan transition-colors">
                    {conn.connected_idea.title}
                  </h4>
                  {conn.connected_idea.body && (
                    <p className="text-xs text-text-tertiary line-clamp-2 mt-0.5">
                      {conn.connected_idea.body}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Avatar
                      src={conn.connected_idea.creator?.avatar_url || undefined}
                      alt={creatorName}
                      initials={creatorInitials}
                      size="sm"
                      className="!w-4 !h-4 !text-[7px]"
                    />
                    <span className="text-[11px] text-text-tertiary">
                      {creatorName} · {timeAgo(conn.connected_idea.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

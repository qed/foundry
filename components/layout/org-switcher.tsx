'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useOrg } from '@/lib/context/org-context'
import { ChevronDown } from 'lucide-react'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

interface OrgWithRole {
  org: Organization
  role: string
}

export function OrgSwitcher() {
  const { org: currentOrg } = useOrg()
  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<OrgWithRole[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    async function loadOrgs() {
      setLoading(true)
      try {
        const response = await fetch('/api/orgs/list')
        if (response.ok) {
          const data = await response.json()
          setOrgs(data.orgs || [])
        }
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrgs()
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 hover:bg-bg-tertiary rounded-md transition-colors w-full"
      >
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-text-tertiary uppercase tracking-wide truncate">
            {currentOrg.name}
          </p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-tertiary flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-bg-tertiary border border-border-default rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-text-tertiary text-center">
              Loading...
            </div>
          )}

          {!loading && orgs.length === 0 && (
            <div className="p-3 text-sm text-text-tertiary text-center">
              No organizations
            </div>
          )}

          {!loading &&
            orgs.map(({ org, role }) => (
              <Link
                key={org.id}
                href={`/org/${org.slug}`}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  org.slug === currentOrg.slug
                    ? 'bg-accent-cyan/10 text-accent-cyan'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                <div className="truncate">{org.name}</div>
                <div className="text-xs text-text-tertiary capitalize">
                  {role}
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

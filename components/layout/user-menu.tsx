'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useOptionalAuth } from '@/lib/auth/context'
import { useOptionalOrg } from '@/lib/context/org-context'
import { useOptionalProject } from '@/lib/context/project-context'
import { Badge } from '@/components/ui/badge'
import { LogOut, Home } from 'lucide-react'

export function UserMenu() {
  const auth = useOptionalAuth()
  const orgCtx = useOptionalOrg()
  const projectCtx = useOptionalProject()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Gracefully handle missing AuthProvider (e.g. during HMR)
  if (!auth || auth.loading || !auth.user) return null

  const { user, signOut } = auth

  const displayName =
    (user.user_metadata?.display_name as string) ||
    user.email ||
    'User'

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-bg-tertiary rounded-lg transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
          }}
        >
          {initials}
        </div>
        <span className="text-sm text-text-secondary hidden sm:inline">
          {displayName.split(' ')[0]}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-tertiary rounded-lg shadow-xl border border-border-default z-50">
          <div className="p-3 border-b border-border-default">
            <p className="text-xs text-text-tertiary">Signed in as</p>
            <p className="text-sm font-medium text-text-primary truncate">
              {displayName}
            </p>
            {(orgCtx || projectCtx) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {orgCtx && (
                  <Badge
                    variant={
                      orgCtx.userRole === 'admin' ? 'default' : 'secondary'
                    }
                  >
                    Org: {orgCtx.userRole === 'admin' ? 'Admin' : 'Member'}
                  </Badge>
                )}
                {projectCtx && (
                  <Badge
                    variant={
                      projectCtx.userRole === 'leader' ? 'purple' : 'success'
                    }
                  >
                    {projectCtx.userRole === 'leader'
                      ? 'Leader'
                      : 'Developer'}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="p-1.5">
            <Link
              href="/org"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary rounded-md transition-colors"
            >
              <Home className="w-4 h-4" />
              My Organizations
            </Link>

            <button
              onClick={() => {
                setMenuOpen(false)
                signOut()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-accent-error rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

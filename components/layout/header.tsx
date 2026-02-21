'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'
import { useCurrentUser } from '@/lib/context/current-user-context'
import { useAuth } from '@/lib/auth/context'
import { ChevronRight, LogOut, Settings, Menu } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

const MODULE_NAMES: Record<string, string> = {
  hall: 'The Hall',
  shop: 'Pattern Shop',
  room: 'Control Room',
  floor: 'Assembly Floor',
  lab: 'Insights Lab',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()
  const { user } = useCurrentUser()
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
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

  // Extract active module from pathname
  const activeModule = Object.keys(MODULE_NAMES).find((m) =>
    pathname.includes(`/${m}`)
  )

  const breadcrumbs = [
    { label: org.name, href: `/org/${org.slug}` },
    { label: project.name, href: `/org/${org.slug}/project/${project.id}` },
  ]

  if (activeModule) {
    breadcrumbs.push({
      label: MODULE_NAMES[activeModule],
      href: `/org/${org.slug}/project/${project.id}/${activeModule}`,
    })
  }

  // Get user initials for avatar
  const initials = user.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg-secondary border-b border-border-default">
      {/* Left side: hamburger + breadcrumbs */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="flex items-center gap-1.5 overflow-x-auto">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              )}
              <Link
                href={crumb.href}
                className={`text-sm whitespace-nowrap transition-colors ${
                  index === breadcrumbs.length - 1
                    ? 'text-text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      {/* Right side: user menu */}
      <div className="relative ml-4" ref={menuRef}>
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
            {user.display_name?.split(' ')[0] || 'User'}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-bg-tertiary rounded-lg shadow-xl border border-border-default z-50">
            <div className="p-3 border-b border-border-default">
              <p className="text-xs text-text-tertiary">Signed in as</p>
              <p className="text-sm font-medium text-text-primary truncate">
                {user.display_name || 'User'}
              </p>
            </div>

            <div className="p-1.5">
              <Link
                href={`/org/${org.slug}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
                Organization
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
    </header>
  )
}

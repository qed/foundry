'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  // Use the synchronous usePathname since this is a client component
  const pathname = usePathname()

  // Extract base URL from pathname (everything up to /settings/)
  const settingsIdx = pathname.indexOf('/settings/')
  const baseUrl = settingsIdx >= 0 ? pathname.slice(0, settingsIdx) : pathname

  const tabs = [
    { href: `${baseUrl}/settings/insights`, label: 'API Keys' },
    { href: `${baseUrl}/settings/agent`, label: 'Agent Config' },
  ]

  return (
    <div>
      {/* Tab navigation */}
      <div className="border-b border-border-default px-4 md:px-6 lg:px-8">
        <nav className="flex gap-4" aria-label="Settings tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                pathname.startsWith(tab.href)
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border-default'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  )
}

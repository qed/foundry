'use client'

import Link from 'next/link'
import { UserMenu } from './user-menu'

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-bg-secondary border-b border-border-default">
      <Link
        href="/"
        className="text-sm font-semibold text-gradient hover:opacity-80 transition-opacity"
      >
        Helix Foundry
      </Link>
      <UserMenu />
    </header>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useOrg } from '@/lib/context/org-context'
import { useProject } from '@/lib/context/project-context'

const MODULES = [
  { id: 'hall', name: 'Hall', icon: '/icon-hall.png' },
  { id: 'shop', name: 'Shop', icon: '/icon-shop.png' },
  { id: 'room', name: 'Room', icon: '/icon-room.png' },
  { id: 'floor', name: 'Floor', icon: '/icon-floor.png' },
  { id: 'lab', name: 'Lab', icon: '/icon-lab.png' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { org } = useOrg()
  const { project } = useProject()

  const baseUrl = `/org/${org.slug}/project/${project.id}`

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-default flex items-center justify-around z-40">
      {MODULES.map((mod) => {
        const isActive = pathname.includes(`/${mod.id}`)

        return (
          <Link
            key={mod.id}
            href={`${baseUrl}/${mod.id}`}
            className={`flex flex-col items-center gap-1 px-3 py-3 text-xs transition-all ${
              isActive
                ? 'text-accent-cyan'
                : 'text-text-tertiary hover:text-text-secondary opacity-60 hover:opacity-100'
            }`}
          >
            <Image
              src={mod.icon}
              alt={mod.name}
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
            <span className="truncate">{mod.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

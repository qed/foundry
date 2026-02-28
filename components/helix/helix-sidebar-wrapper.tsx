'use client'

import { useState } from 'react'
import { HelixSidebar } from './helix-sidebar'
import { Menu, X } from 'lucide-react'

export function HelixSidebarWrapper() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-accent-cyan text-white rounded-full shadow-lg"
        aria-label="Toggle Helix sidebar"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static z-40 h-full transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <HelixSidebar onClose={() => setMobileOpen(false)} />
      </div>
    </>
  )
}

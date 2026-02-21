'use client'

import { useSyncExternalStore } from 'react'

function getModKey() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '\u2318' : 'Ctrl'
}

function getServerModKey() {
  return 'Ctrl'
}

const subscribe = () => () => {}

export function KeyboardHint() {
  const modKey = useSyncExternalStore(subscribe, getModKey, getServerModKey)

  return (
    <div className="text-xs text-text-tertiary space-y-1.5">
      <div className="flex justify-between">
        <span>Switch modules</span>
        <kbd className="text-text-secondary">{modKey}+1-5</kbd>
      </div>
    </div>
  )
}

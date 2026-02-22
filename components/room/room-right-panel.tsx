'use client'

import { Bot, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoomRightPanelProps {
  open: boolean
}

export function RoomRightPanel({ open }: RoomRightPanelProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 border-l border-border-default bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'w-[300px]' : 'w-0'
      )}
    >
      <div className="w-[300px] h-full flex flex-col">
        {/* Header */}
        <div className="h-12 flex items-center gap-2 px-4 border-b border-border-default flex-shrink-0">
          <Bot className="w-4 h-4 text-accent-purple" />
          <span className="text-sm font-medium text-text-primary">
            Control Room Agent
          </span>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-10 h-10 text-accent-purple/40 mb-3" />
            <p className="text-sm text-text-tertiary mb-1">
              Control Room Agent
            </p>
            <p className="text-xs text-text-tertiary max-w-[220px]">
              Ask me to generate blueprints, review architecture, or help
              with technical outlines.
            </p>
          </div>
        </div>

        {/* Suggested commands */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {['Generate blueprint', 'Review blueprint', 'Help with outline'].map((cmd) => (
            <button
              key={cmd}
              disabled
              className="px-2 py-1 text-[10px] text-text-tertiary bg-bg-tertiary rounded-full whitespace-nowrap opacity-50 cursor-not-allowed"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Message input */}
        <div className="p-3 border-t border-border-default">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask the agent..."
              className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
              disabled
            />
            <button
              disabled
              className="p-2 rounded-lg bg-accent-purple text-white opacity-50 cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-text-tertiary mt-1.5 text-center">
            Agent features coming in Phase 056
          </p>
        </div>
      </div>
    </div>
  )
}

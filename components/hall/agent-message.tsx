'use client'

import { Bot, User } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AgentMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function AgentMessage({ role, content, timestamp }: AgentMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-accent-purple" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed',
          isUser
            ? 'bg-accent-cyan/15 text-text-primary rounded-br-sm'
            : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <p
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-accent-cyan/50' : 'text-text-tertiary'
          )}
        >
          {timeAgo(timestamp)}
        </p>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-accent-cyan" />
        </div>
      )}
    </div>
  )
}

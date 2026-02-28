# Phase 053 — Chat Interface Component

## Objective
Build a reusable chat UI component library for AI conversations featuring message bubbles, streaming response display, and auto-scroll functionality. This foundational component will be used across all in-app AI features.

## Prerequisites
- Phase 052 — Database Schema Extensions — adds helix_chat_sessions and helix_ai_usage tables

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 053 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The Helix Mode requires chat-based interactions for brainstorming, build planning, and other AI-assisted workflows. Rather than embedding external ChatGPT iframes or redirecting users to Claude.com, we build a native chat interface within the Foundry app. This phase establishes the core UI components: message display, input handling, and streaming response rendering. These will be refined in subsequent phases with specific business logic for each workflow.

The component must support streaming responses (word-by-word rendering), maintain conversation history, and provide visual feedback during AI processing. Message history is persisted to the database for session resumption and audit trails.

---

## Detailed Requirements

### 1. Message Display Components
#### File: `components/helix/chat/ChatMessage.tsx` (NEW)
A React component that renders a single message in the conversation thread.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streamingComplete?: boolean;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
          isAssistant
            ? 'bg-blue-100 text-blue-700'
            : 'bg-slate-200 text-slate-700'
        )}
      >
        {isAssistant ? '⚡' : '👤'}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg',
          isAssistant
            ? 'bg-slate-100 text-slate-900 rounded-bl-none'
            : 'bg-blue-600 text-white rounded-br-none'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && <span className="animate-pulse">▌</span>}
        </p>
        <p
          className={cn(
            'text-xs mt-1',
            isAssistant ? 'text-slate-500' : 'text-blue-100'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
```

#### File: `components/helix/chat/ChatInterface.tsx` (NEW)
Main container managing the conversation thread, auto-scroll, and loading state.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  placeholder?: string;
  maxHeight?: string;
}

export function ChatInterface({
  messages,
  isLoading = false,
  onSendMessage,
  placeholder = 'Ask Claude...',
  maxHeight = 'h-[500px]',
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const isStreaming = lastMessage?.role === 'assistant' && !lastMessage?.streamingComplete;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        className={`overflow-y-auto flex-1 p-4 ${maxHeight}`}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <p className="text-center">
              <span className="block text-2xl mb-2">💬</span>
              No messages yet. Start a conversation below.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={isStreaming && message.id === lastMessage.id}
            />
          ))
        )}

        {isLoading && !isStreaming && (
          <div className="flex gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
              ⚡
            </div>
            <div className="max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg bg-slate-100 rounded-bl-none">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
```

### 2. Input Component
#### File: `components/helix/chat/ChatInput.tsx` (NEW)
Text input with send button, support for Shift+Enter multiline input.

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Ask Claude...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(input.trim());
      setInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting || isLoading}
        rows={input.includes('\n') ? 4 : 1}
        className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
      />
      <Button
        type="submit"
        disabled={!input.trim() || isSubmitting || isLoading}
        className="h-auto self-end"
      >
        {isSubmitting ? '...' : 'Send'}
      </Button>
    </form>
  );
}
```

### 3. Message Types & Utilities
#### File: `lib/helix/chat-types.ts` (NEW)
Shared TypeScript interfaces for chat messages.

```typescript
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

export interface ChatSession {
  id: string;
  projectId: string;
  stepId: string;
  phaseName: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface StreamingResponse {
  delta: string;
  index: number;
  finishReason?: 'stop' | 'length' | null;
}
```

---

## File Structure
```
components/helix/chat/
├── ChatInterface.tsx (NEW)
├── ChatMessage.tsx (NEW)
├── ChatInput.tsx (NEW)
└── index.ts (NEW) - barrel export

lib/helix/
└── chat-types.ts (NEW)
```

---

## Dependencies
- React 19+
- Next.js 16+ (Client Components)
- Tailwind CSS v4
- `/lib/utils` cn() utility function
- `/components/ui/button` Button component

---

## Tech Stack for This Phase
- TypeScript (strict mode)
- React Hooks (useState, useEffect, useRef)
- Tailwind CSS animations (animate-in, animate-pulse, fade-in)
- CSS Grid/Flexbox for layout

---

## Acceptance Criteria
1. ChatMessage component renders user/assistant messages with distinct styling (avatar, bubble color, alignment)
2. ChatMessage displays timestamp in HH:MM format (12-hour)
3. ChatMessage shows streaming indicator (pulse cursor) when isStreaming=true
4. ChatInterface auto-scrolls to bottom when new messages arrive
5. ChatInterface displays empty state with helpful text when messages array is empty
6. ChatInterface shows loading indicator (animated dots) when isLoading=true but not streaming
7. ChatInput accepts text input and Shift+Enter for multiline without submitting
8. ChatInput submits on Enter (single line) and disables submit button when empty/loading
9. ChatInterface maxHeight prop controls scroll container height (defaults to h-[500px])
10. All components are fully responsive on mobile (max-w-xs for bubbles, stack layout on small screens)

---

## Testing Instructions
1. Render ChatInterface with empty messages array, verify empty state displays
2. Add 5 user/assistant message pairs, verify alternating bubble colors and alignments
3. Add message with current timestamp, verify time displays correctly
4. Pass isLoading=true, verify loading indicator animates in message area
5. Pass isStreaming=true on last assistant message, verify pulse cursor displays
6. Type text in ChatInput, verify Enter submits without newline, Shift+Enter adds newline
7. Type long text in ChatInput, verify textarea expands to 4 rows then allows scroll
8. Disable ChatInput (isLoading=true), verify input and button are visually disabled
9. Scroll messages to bottom, add new message, verify auto-scroll behavior
10. Test on mobile viewport (375px width), verify bubbles stack correctly and don't overflow

---

## Notes for the AI Agent
- This phase is foundational; subsequent phases reuse these components extensively.
- Ensure animations are smooth on lower-end devices (test on Pixel 4a equivalent).
- Streaming indicator (▌ cursor) should be replaced with actual streaming text in Phase 054.
- Consider accessibility: add aria-labels to avatars, use semantic HTML where possible.
- The component library here is intentionally generic; business logic (prompts, session handling) comes in later phases.

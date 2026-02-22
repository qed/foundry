# Phase 090 - Insights Lab Agent Infrastructure

## Objective
Implement the foundational AI agent infrastructure for The Insights Lab, providing a conversational interface for feedback analysis, triage assistance, and intelligent decision-making support through streaming responses.

## Prerequisites
- Phase 083: Insights Lab layout with agent panel toggle
- Phase 081: Feedback database schema
- OpenAI API or equivalent LLM provider available
- Supabase Realtime enabled for chat state management

## Context
The Insights Lab Agent augments human decision-making by analyzing user feedback at scale. The agent can understand feedback context, identify patterns, suggest categorizations, find similar items, and recommend which feedback should become work orders or features. The agent operates through a conversational interface that streams responses for interactive exploration. Context includes all feedback, the feature tree, work orders, and project configuration, allowing the agent to make informed recommendations grounded in project specifics.

## Detailed Requirements

### Agent Chat Panel
- **Location**: Right sidebar or overlay modal (toggleable from header)
- **Desktop**: Fixed 320px width right sidebar
- **Mobile**: Full-screen overlay from bottom or right
- **Header**: "Ask the Agent" title with close button
- **Body**: Scrollable chat history
- **Footer**: Chat input and send button
- **State**: Persists during session, clears on page reload (optional persistence)

### Chat Interface

#### Message Display
- **User Messages**: Right-aligned, blue background
- **Agent Messages**: Left-aligned, gray background
- **Timestamps**: Optional, subtle
- **Loading State**: Animated spinner while agent responds
- **Markdown Support**: Render links, bold, italics, code blocks
- **Error Messages**: Red background for failures
- **Auto-scroll**: Scroll to latest message

#### Chat Input
- **Type**: Textarea, single or multi-line
- **Placeholder**: "Ask about this feedback..."
- **Send Button**: Right side, arrow or send icon
- **Keyboard**: Enter to send (Shift+Enter for newline)
- **Max Chars**: 500 characters (configurable)
- **Disabled State**: While agent is processing
- **Character Count**: Optional, show remaining

### Agent Capabilities (Phases 091-093)

The agent should support commands:
- Auto-categorization: "Categorize this feedback"
- Enrichment: "What are the key issues in this feedback?"
- Pattern Detection: "What patterns do you see in these bugs?"
- Conversion Suggestions: "Which of these should be work orders?"
- Duplicate Detection: "Are there similar submissions?"
- Priority Insights: "What should we focus on first?"
- Trend Analysis: "What's trending in user feedback?"

### System Prompt

The agent operates with a system prompt that establishes:
- **Identity**: "You are the Insights Lab Agent for [Project Name]"
- **Purpose**: "You help teams analyze, triage, and act on user feedback"
- **Data Context**: "You have access to all feedback, features, and work orders in this project"
- **Tone**: Professional, helpful, concise
- **Constraints**: "Recommend actions, don't execute them without user confirmation"
- **Format**: "Respond in clear, scannable format with bullet points and links when appropriate"

### Context Data Provided to Agent

The agent receives:
```typescript
{
  project: {
    id: string;
    name: string;
    description: string;
  };
  feedback: Array<{
    id: string;
    content: string;
    category: string;
    status: string;
    score: number | null;
    submitter_email: string | null;
    created_at: string;
  }>;
  features: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
  artifacts?: {
    // Phase 041: Artifacts system
  };
}
```

### Agent API Route

**Endpoint**: `/api/agent/lab`
**Method**: POST
**Authentication**: Require authenticated user with project access
**Response**: Server-sent events (SSE) for streaming

### Streaming Implementation
- Use Server-Sent Events (SSE) for real-time responses
- Stream tokens as they're generated
- Allow cancellation mid-response
- Handle connection timeouts gracefully
- Reconnect on network failure

### Error Handling
- **Invalid Context**: "I don't have enough context about your feedback"
- **No Relevant Data**: "I couldn't find relevant information"
- **Rate Limit**: "You've sent many requests. Please wait a moment."
- **Server Error**: "I encountered an error. Please try again."
- **Network Error**: "Connection lost. Retrying..."

### Rate Limiting
- **Per User**: 20 requests per minute per project
- **Per Project**: 100 requests per minute total
- **Throttle Window**: 60 seconds sliding window
- **Error Response**: 429 with Retry-After header

## UI Components

### _components/AgentChatPanel.tsx

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import AgentChatMessage from './AgentChatMessage';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface AgentChatPanelProps {
  projectId: string;
  feedbackId?: string;
  onClose: () => void;
}

export default function AgentChatPanel({
  projectId,
  feedbackId,
  onClose
}: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load context data
  const { data: context } = useQuery({
    queryKey: ['agent-context', projectId, feedbackId],
    queryFn: () => getAgentContext(projectId, feedbackId),
    staleTime: 60000
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Stream response from server
      const response = await fetch('/api/agent/lab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          feedbackId,
          message: userMessage.content,
          context,
          conversationHistory: messages
        })
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === 'assistant') {
                    lastMsg.content += data.token;
                  }
                  return updated;
                });
              }
            } catch (e) {
              // Ignore parse errors in streaming
            }
          }
        }
      }

      setRetryCount(0);
    } catch (error) {
      console.error('Agent error:', error);

      // Retry logic
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast({
          title: 'Connection issue',
          description: 'Retrying...',
          variant: 'default'
        });
        // Retry after delay
        setTimeout(() => {
          setInputValue(userMessage.content);
          setMessages(prev => prev.slice(0, -1)); // Remove assistant message
        }, 1000);
      } else {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg.role === 'assistant') {
            lastMsg.error = true;
            lastMsg.content = 'I encountered an error processing your request. Please try again.';
          }
          return updated;
        });

        toast({
          title: 'Error',
          description: 'Failed to get response from agent',
          variant: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Ask the Agent</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Ask questions about your feedback</p>
            <p className="text-xs mt-2 text-gray-400">
              E.g., "What should we prioritize?" or "Find duplicate issues"
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <AgentChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="animate-pulse text-gray-500 text-sm">
                  Agent is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this feedback..."
          disabled={isLoading}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {inputValue.length}/500
          </p>
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

async function getAgentContext(projectId: string, feedbackId?: string) {
  // Fetch context data from Supabase
  // Returns project, feedback, features, work orders
}
```

### _components/AgentChatMessage.tsx

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface AgentChatMessageProps {
  message: Message;
}

export default function AgentChatMessage({ message }: AgentChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      'flex',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-xs px-4 py-2 rounded-lg text-sm',
        isUser
          ? 'bg-indigo-600 text-white'
          : message.error
          ? 'bg-red-50 text-red-900 border border-red-200'
          : 'bg-gray-100 text-gray-900'
      )}>
        {message.error ? (
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{message.content}</p>
          </div>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none"
            components={{
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'underline',
                    isUser ? 'text-blue-200' : 'text-indigo-600'
                  )}
                >
                  {children}
                </a>
              ),
              code: ({ inline, children }) =>
                inline ? (
                  <code className="bg-black/10 px-1 py-0.5 rounded text-xs">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-black/10 p-2 rounded text-xs overflow-x-auto mt-2">
                    <code>{children}</code>
                  </pre>
                )
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}

        {/* Timestamp */}
        <p className={cn(
          'text-xs mt-1 opacity-70',
          isUser ? 'text-blue-100' : 'text-gray-500'
        )}>
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
```

## API Route

### app/api/agent/lab/route.ts

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAgentContext, checkRateLimit } from '@/lib/agent';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, feedbackId, message, context } = await request.json();

    // Verify user has access to project
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check rate limit
    const canMakeRequest = await checkRateLimit(session.user.id, projectId);
    if (!canMakeRequest) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Get full context if not provided
    const fullContext = context || await getAgentContext(projectId, feedbackId);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(fullContext);

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true
    });

    // Stream response to client
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            const data = JSON.stringify({ token });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.close();
      }
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(context: any): string {
  return `You are the Insights Lab Agent for the project "${context.project.name}".

Your role is to help teams analyze user feedback, identify patterns, and make informed decisions about which feedback to convert into work orders or features.

You have access to:
- All user feedback submissions for this project
- The feature tree and existing work orders
- Historical categorizations and priorities

When responding:
1. Be concise and actionable
2. Use bullet points for lists
3. Provide reasoning for suggestions
4. Suggest specific actions (e.g., "Convert feedback #5 to a High priority bug fix")
5. Highlight patterns you notice (e.g., "3 users reported login crashes on Safari")

If asked to categorize feedback, do so with confidence but note any ambiguity.
If asked to find duplicates, look for similar themes or user problems.
When suggesting priorities, consider frequency and severity.

Remember: You recommend actions, but don't execute them. Always ask for confirmation before the user takes action.`;
}
```

## File Structure
```
app/
├── api/
│   └── agent/
│       └── lab/
│           └── route.ts
└── org/
    └── [orgSlug]/
        └── project/
            └── [projectId]/
                └── lab/
                    └── _components/
                        ├── AgentChatPanel.tsx
                        └── AgentChatMessage.tsx
lib/
├── agent.ts
│   ├── getAgentContext()
│   └── checkRateLimit()
└── rate-limit.ts
```

## Acceptance Criteria
- [x] Agent chat panel togglable from Insights Lab header
- [x] Chat input accepts messages up to 500 characters
- [x] Send button disabled while processing
- [x] Messages stream from server using SSE
- [x] User messages appear right-aligned in blue
- [x] Assistant messages appear left-aligned in gray
- [x] Agent context includes feedback, features, work orders
- [x] Rate limiting enforced (20 requests/min per user, 100/min per project)
- [x] Error messages displayed with red styling
- [x] Timestamps show on each message
- [x] Auto-scroll to latest message
- [x] Markdown rendered in agent responses
- [x] Links in agent responses are clickable
- [x] Connection errors show retry UI
- [x] System prompt grounds agent in project context
- [x] Chat history persists during session

## Testing Instructions

1. **Panel Toggle**
   - Click "Ask Agent" button in header
   - Verify panel opens
   - Click X to close
   - Verify panel closes

2. **Message Sending**
   - Type message in input
   - Click send button
   - Verify message appears right-aligned in blue
   - Verify input clears

3. **Agent Response**
   - Wait for agent response
   - Verify it streams and appears left-aligned
   - Verify markdown renders (links, bold, code)
   - Verify timestamp displays

4. **Character Limit**
   - Type > 500 chars
   - Verify additional chars not entered
   - Verify counter shows "X/500"

5. **Keyboard Shortcuts**
   - Type message
   - Press Enter → send
   - Type message
   - Press Shift+Enter → newline (no send)

6. **Error Handling**
   - Simulate network error
   - Verify error message displays
   - Verify retry logic engages
   - Verify success on retry

7. **Rate Limiting**
   - Send 20 requests rapidly
   - 21st request should show 429 error
   - Verify Retry-After suggests wait time

8. **Mobile Responsiveness**
   - Open panel on mobile
   - Verify full-screen or bottom sheet
   - Verify input accessible
   - Verify messages readable

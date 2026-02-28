# Phase 054 — Claude API Streaming Integration

## Objective
Implement server-side API endpoint for Claude API streaming responses using Server-Sent Events (SSE). Handle token counting, error management, and model selection for both Haiku and Sonnet models.

## Prerequisites
- Phase 053 — Chat Interface Component — chat UI components available
- Supabase project configured with helix_ai_usage table

## Epic Context
**Epic:** 7 — In-App Brainstorming
**Phase:** 054 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
The chat interface alone cannot process AI requests without a backend. This phase implements the bridge between the frontend chat UI and Anthropic's Claude API. We use Server-Sent Events (SSE) for streaming responses, allowing word-by-word rendering in the UI. The endpoint handles multiple concerns: message formatting, model selection, system prompt injection, token counting, rate limiting, and error recovery.

Token usage is tracked in the helix_ai_usage table for monitoring costs and quotas. The implementation supports both Haiku (fast, cheap, brainstorming) and Sonnet (complex generation, build plans) models, selectable per request.

---

## Detailed Requirements

### 1. Server API Route with SSE Streaming
#### File: `app/api/helix/chat/route.ts` (NEW)
POST endpoint that receives chat history and streams Claude responses via SSE.

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { logAIUsage } from '@/lib/helix/ai-usage';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequest {
  projectId: string;
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  model?: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-5-20250929';
  maxTokens?: number;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const {
      projectId,
      sessionId,
      messages,
      systemPrompt,
      model = 'claude-haiku-4-5-20251001',
      maxTokens = 2000,
    } = body;

    // Validate auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify project access
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      return new Response('Project not found', { status: 404 });
    }

    // Initialize Anthropic client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Convert messages to Anthropic format
    const apiMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Create streaming encoder for SSE
    const encoder = new TextEncoder();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let isError = false;

    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    });

    // Create ReadableStream that pipes SSE events
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'message_start') {
              totalInputTokens = event.message.usage.input_tokens;
            } else if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                // Send text delta as SSE event
                const sseEvent = `data: ${JSON.stringify({ type: 'delta', text: delta.text })}\n\n`;
                controller.enqueue(encoder.encode(sseEvent));
              }
            } else if (event.type === 'message_delta') {
              totalOutputTokens = event.usage.output_tokens;
            } else if (event.type === 'message_stop') {
              // Signal completion
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'done', inputTokens: totalInputTokens, outputTokens: totalOutputTokens })}\n\n`
                )
              );
            }
          }

          // Log usage to database
          await logAIUsage({
            userId: user.id,
            projectId,
            sessionId,
            model,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
          });

          controller.close();
        } catch (err) {
          isError = true;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          const sseEvent = `data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`;
          controller.enqueue(encoder.encode(sseEvent));
          controller.close();
        }
      },
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message })}\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream' },
      }
    );
  }
}
```

### 2. AI Usage Tracking
#### File: `lib/helix/ai-usage.ts` (NEW)
Functions for logging and querying API usage.

```typescript
import { createClient } from '@/lib/supabase/server';

export interface AIUsageLog {
  userId: string;
  projectId: string;
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export async function logAIUsage(usage: AIUsageLog) {
  const supabase = await createClient();

  const { error } = await supabase.from('helix_ai_usage').insert({
    user_id: usage.userId,
    project_id: usage.projectId,
    session_id: usage.sessionId,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to log AI usage:', error);
  }
}

export async function getProjectAIUsage(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('helix_ai_usage')
    .select('model, total_tokens, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch AI usage:', error);
    return [];
  }

  return data || [];
}

export async function getUserAIUsageThisMonth(userId: string): Promise<number> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('helix_ai_usage')
    .select('total_tokens')
    .eq('user_id', userId)
    .gte('created_at', monthStart);

  if (error) {
    console.error('Failed to fetch monthly usage:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + (row.total_tokens || 0), 0);
}
```

### 3. Client Hook for Streaming Chat
#### File: `hooks/useStreamingChat.ts` (NEW)
React hook that manages streaming chat with SSE event handling.

```typescript
import { useState, useCallback } from 'react';
import { Message } from '@/components/helix/chat/ChatMessage';

interface UseStreamingChatOptions {
  projectId: string;
  sessionId: string;
  systemPrompt: string;
  model?: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-5-20250929';
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        setError(null);
        setIsLoading(true);

        // Add user message
        const userMessage: Message = {
          id: `msg_${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
          streamingComplete: true,
        };
        setMessages((prev) => [...prev, userMessage]);

        // Create assistant message placeholder
        const assistantId = `msg_${Date.now() + 1}`;
        const assistantMessage: Message = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          streamingComplete: false,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Call streaming API
        const response = await fetch('/api/helix/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: options.projectId,
            sessionId: options.sessionId,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            systemPrompt: options.systemPrompt,
            model: options.model || 'claude-haiku-4-5-20251001',
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'delta') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + data.text }
                        : m
                    )
                  );
                } else if (data.type === 'done') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, streamingComplete: true } : m
                    )
                  );
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (parseErr) {
                console.error('Failed to parse SSE event:', parseErr);
              }
            }
          }

          buffer = lines[lines.length - 1];
        }

        setIsLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setIsLoading(false);

        // Mark assistant message as complete even on error
        setMessages((prev) =>
          prev.map((m) =>
            m.role === 'assistant' && !m.streamingComplete
              ? { ...m, streamingComplete: true, content: m.content || '(Error)' }
              : m
          )
        );
      }
    },
    [messages, options]
  );

  return { messages, isLoading, error, sendMessage };
}
```

### 4. Environment & Configuration
#### File: `.env.local` (UPDATED)
Add Claude API key:

```bash
ANTHROPIC_API_KEY=sk_<your_key>
```

---

## File Structure
```
app/api/helix/chat/
└── route.ts (NEW)

lib/helix/
├── ai-usage.ts (NEW)
└── chat-types.ts (from Phase 053)

hooks/
└── useStreamingChat.ts (NEW)
```

---

## Dependencies
- `@anthropic-ai/sdk` ^0.24.0 or later
- Supabase client (@supabase/supabase-js)
- Next.js 16+ (Route Handlers)
- React 19+

---

## Tech Stack for This Phase
- TypeScript (strict mode)
- Next.js Route Handlers with streaming
- Server-Sent Events (SSE)
- Anthropic SDK with streaming support
- Supabase for usage logging

---

## Acceptance Criteria
1. POST /api/helix/chat accepts messages, systemPrompt, and model parameters
2. API validates user authentication via Supabase session
3. API verifies project access before processing request
4. Streaming response returns Server-Sent Events with Content-Type: text/event-stream
5. Each content delta is sent as a separate SSE data event with JSON payload
6. Final message event includes inputTokens and outputTokens counts
7. Error events are properly formatted and sent through SSE stream
8. Token usage is logged to helix_ai_usage table with all metadata
9. useStreamingChat hook accumulates delta text into assistant message content
10. useStreamingChat marks message as streamingComplete when stream ends

---

## Testing Instructions
1. Make test POST request with valid messages array, verify 200 response with SSE headers
2. Consume SSE stream, verify delta events contain incremental text
3. Verify done event contains inputTokens and outputTokens > 0
4. Call without auth token, verify 401 Unauthorized response
5. Call with invalid projectId, verify 404 Project not found response
6. Interrupt stream mid-response, verify graceful cleanup and error event
7. Check helix_ai_usage table, verify row created with correct token counts
8. Use useStreamingChat hook in test component, verify messages array populated incrementally
9. Send message with special characters (emoji, newlines), verify correct encoding/decoding
10. Test model selection (haiku vs sonnet), verify correct model used in API call

---

## Notes for the AI Agent
- The streaming implementation uses Anthropic SDK's built-in `stream()` method for simplicity.
- Consider adding rate limiting middleware to prevent token abuse in production.
- Token counting is approximate from API response; for precise tracking, implement tokenizers locally.
- SSE has a 60-second default timeout; the maxDuration runtime config extends this as needed.
- Error handling should be retry-friendly; consider exponential backoff in client hook.

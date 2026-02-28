# Phase 020 - Hall Agent Infrastructure

## Objective
Build the foundational AI agent infrastructure for The Hall, including agent chat panel, message history persistence, context loading, and API integration with streaming support.

## Prerequisites
- Phase 002: Project & Organization Structure (projects table)
- Phase 011: Hall Database Schema (ideas table for context)
- Phase 012: Hall Page Layout (chat panel placement)

## Context
The Hall Agent assists users by analyzing ideas, suggesting tags, detecting duplicates, and discovering connections. This phase establishes the messaging system, conversation history, and context injection that future agent phases (021-023) will leverage. The agent should have read access to all ideas in the current project and understand the domain language.

## Detailed Requirements

### Agent Chat Panel

**Location**: Right sidebar of Hall page (collapsible)

**Layout**
- Width: 400px on desktop, full-width on mobile
- Height: Flexible, takes up remaining viewport
- Toggle button: Icon (chatbot, help, or "Agent") in top-right corner
- Header: "Hall Agent" title, minimize/close buttons
- Body: Message list (scrollable)
- Footer: Text input with send button

**Visual Design**
- Semi-transparent background or panel style
- Messages styled as chat bubbles
  - User messages: right-aligned, blue background
  - Agent messages: left-aligned, gray background, with bot icon
- Timestamp on each message (relative time: "2 minutes ago")
- Typing indicator when agent is responding (three dots animation)

**Responsive**
- Desktop: Right sidebar panel, doesn't overlap content
- Tablet: Smaller panel (300px) or collapsible
- Mobile: Full-width slide-over or modal

### Agent API Integration

**OpenAI or Anthropic**

Choose one (recommend Anthropic Claude for domain understanding):

**Anthropic API:**
- Model: claude-3-haiku-20240307 or newer
- API endpoint: /api/agent/chat
- Streaming: Supported with streaming responses

**OpenAI API:**
- Model: gpt-4-turbo or gpt-3.5-turbo
- Streaming: Supported with streaming responses

**API Key Management**
- Store in environment variable: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Never expose client-side
- Server-side only (Next.js API route)

### System Prompt

The agent's instructions for The Hall:

```
You are the Hall Agent, an AI assistant for Helix Foundry's Hall—a product idea intake system where business leaders capture raw ideas before formal processing.

Your role is to:
1. Help organize and connect product ideas
2. Analyze idea content for tags, duplicates, and relationships
3. Provide insights about the idea portfolio
4. Assist with idea refinement and context

You have access to all ideas in the current project. When analyzing ideas, consider:
- Business value and impact potential
- Technical feasibility and dependencies
- Overlap and connections with existing ideas
- Clarity of problem statement and solution approach

Always be concise, helpful, and focused on practical improvements. Ask clarifying questions when needed.

Format:
- Responses in markdown
- Use bullet points for lists
- Suggest specific actions or next steps
- Acknowledge uncertainty if you don't have enough context
```

### Conversation History Storage

**Database Table: agent_conversations**

Already defined in Phase 011:

```sql
CREATE TABLE public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL DEFAULT 'hall',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Message Structure** (Stored in messages JSONB array)

```typescript
interface AgentMessage {
  id: string; // UUID for unique message ID
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO datetime
  metadata?: {
    ideaIds?: string[]; // If message references specific ideas
    actionTaken?: string; // e.g., "tag_suggested", "duplicate_detected"
    confidence?: number; // 0-1 for suggestions
  };
}
```

**Example Conversation Row**

```json
{
  "id": "abc123",
  "project_id": "proj456",
  "module": "hall",
  "messages": [
    {
      "id": "msg1",
      "role": "user",
      "content": "Can you find ideas related to authentication?",
      "timestamp": "2025-02-20T10:30:00Z"
    },
    {
      "id": "msg2",
      "role": "assistant",
      "content": "I found 3 ideas related to authentication:\n1. OAuth integration...",
      "timestamp": "2025-02-20T10:30:15Z",
      "metadata": {
        "ideaIds": ["idea1", "idea2", "idea3"]
      }
    }
  ],
  "created_at": "2025-02-20T10:00:00Z",
  "updated_at": "2025-02-20T10:30:15Z"
}
```

### Context Loading

**Idea Context Injection**

Before sending user message to agent API, inject current project ideas as context:

```typescript
interface ContextData {
  projectName: string;
  totalIdeas: number;
  ideas: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    tags: string[];
    createdBy: string;
    createdAt: string;
  }>;
  topTags: Array<{ name: string; count: number }>;
}

// Example function to build context
function buildHallContext(projectId: string, ideas: Idea[]): ContextData {
  const tagCounts = new Map<string, number>();
  ideas.forEach(idea => {
    idea.idea_tags?.forEach(tag => {
      const tagName = tag.tags.name;
      tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
    });
  });

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    projectName: 'Current Project', // fetch from DB
    totalIdeas: ideas.length,
    ideas: ideas.map(idea => ({
      id: idea.id,
      title: idea.title,
      body: idea.body,
      status: idea.status,
      tags: idea.idea_tags?.map(it => it.tags.name) || [],
      createdBy: idea.created_by?.user_metadata?.full_name || 'Unknown',
      createdAt: idea.created_at,
    })),
    topTags,
  };
}
```

### Streaming Responses

**Server-Sent Events (SSE)**

Use streaming to show agent responses as they're generated:

```typescript
// POST /api/agent/hall/chat - Streaming endpoint

export async function POST(request: Request) {
  // 1. Get user message
  // 2. Load conversation history
  // 3. Load idea context
  // 4. Build system prompt
  // 5. Call AI model with streaming
  // 6. Return ReadableStream with streaming response
}
```

**Client Side: useEffect to stream**

```typescript
const [responseText, setResponseText] = useState('');

useEffect(() => {
  const streamResponse = async () => {
    const response = await fetch('/api/agent/hall/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage, projectId }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      setResponseText(prev => prev + chunk);
    }
  };

  streamResponse();
}, [userMessage]);
```

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   ├── page.tsx
│                   └── components/
│                       ├── HallAgentPanel.tsx
│                       ├── AgentChatBox.tsx
│                       ├── AgentMessage.tsx
│                       ├── AgentInput.tsx
│                       └── AgentToggleButton.tsx
└── api/
    └── agent/
        └── hall/
            ├── route.ts (POST chat, GET history)
            └── context/
                └── route.ts (GET context for current project)
```

## Component Specifications

### HallAgentPanel.tsx

```typescript
interface HallAgentPanelProps {
  projectId: string;
  ideas: Idea[];
}

export function HallAgentPanel({
  projectId,
  ideas,
}: HallAgentPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [projectId]);

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(
        `/api/agent/hall?projectId=${projectId}`
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Create optimistic user message
    const userMessage: AgentMessage = {
      id: Math.random().toString(36),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/hall/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: content,
          conversationHistory: messages,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Stream response
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantContent += chunk;

        // Update message in state (debounce for performance)
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: assistantContent,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: Math.random().toString(36),
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date().toISOString(),
              },
            ];
          }
        });
      }

      // Save to conversation history
      await saveConversationHistory();
    } catch (err) {
      console.error('Error getting agent response:', err);
      const errorMessage: AgentMessage = {
        id: Math.random().toString(36),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversationHistory = async () => {
    try {
      await fetch(`/api/agent/hall`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages,
        }),
      });
    } catch (err) {
      console.error('Error saving conversation:', err);
    }
  };

  return (
    <div className={`
      fixed right-0 top-0 h-screen w-full md:w-96 bg-white shadow-lg
      transform transition-transform duration-300 z-40
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      flex flex-col
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Hall Agent</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 rounded-lg transition"
          aria-label="Close agent"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message List */}
      <AgentChatBox messages={messages} isLoading={isLoading} />

      {/* Input */}
      <AgentInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />

      {/* Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center"
          aria-label="Open agent"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### AgentChatBox.tsx

```typescript
interface AgentChatBoxProps {
  messages: AgentMessage[];
  isLoading: boolean;
}

export function AgentChatBox({ messages, isLoading }: AgentChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <p className="text-gray-500 mb-2">Welcome to Hall Agent</p>
            <p className="text-sm text-gray-400">
              Ask me about your ideas, and I'll help you organize and connect them.
            </p>
          </div>
        </div>
      ) : (
        messages.map(msg => (
          <AgentMessage key={msg.id} message={msg} />
        ))
      )}

      {isLoading && (
        <div className="flex items-end gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6" cy="12" r="2" fill="currentColor" opacity="0.3" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="18" cy="12" r="2" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <div className="text-sm text-gray-500">Thinking...</div>
        </div>
      )}

      <div ref={scrollRef} />
    </div>
  );
}
```

### AgentMessage.tsx

```typescript
interface AgentMessageProps {
  message: AgentMessage;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-xs px-4 py-2 rounded-lg
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
          }
        `}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
          {getRelativeTime(new Date(message.timestamp))}
        </p>
      </div>
    </div>
  );
}
```

### AgentInput.tsx

```typescript
interface AgentInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export function AgentInput({
  onSendMessage,
  isLoading,
}: AgentInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border-t border-gray-200 flex gap-2"
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask the agent..."
        disabled={isLoading}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        aria-label="Send message"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
}
```

## API Route: POST /api/agent/hall/chat

```typescript
// File: app/api/agent/hall/chat/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { buildHallContext } from '@/lib/agent/context';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, message, conversationHistory } = await request.json();

    // Load ideas for context
    const ideasResponse = await supabase
      .from('ideas')
      .select(`
        id, title, body, status, created_at,
        created_by(user_metadata),
        idea_tags(tag_id, tags(name))
      `)
      .eq('project_id', projectId);

    const context = buildHallContext(projectId, ideasResponse.data || []);

    // Build messages for API
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Anthropic API with streaming
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await client.messages.stream({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: `You are the Hall Agent...${JSON.stringify(context)}`,
            messages,
          });

          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(customReadable, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
```

## Acceptance Criteria
1. Agent panel visible in right sidebar on Hall page
2. Panel can be toggled open/closed with button
3. Chat messages display in scrollable area
4. User messages aligned right (blue), agent messages aligned left (gray)
5. Timestamps show relative time on each message
6. Input field at bottom with send button
7. Send button disabled while waiting for response
8. Typing indicator shows while agent is responding
9. Streaming responses appear progressively
10. Conversation history loaded on panel open
11. Messages persisted to database after response
12. Context includes all ideas in project
13. System prompt describes agent role and capabilities
14. Auto-scroll to newest message as they arrive
15. Empty state shown when no conversation history
16. Error handling: show error message if API fails
17. Agent has access to idea titles, bodies, tags, status
18. Responsive: panel collapses on mobile, full-width modal option
19. Keyboard: Enter sends message, Escape closes panel
20. Agent response in markdown (if applicable)

## Testing Instructions

### Panel Toggle
1. Open Hall page
2. Verify agent button visible in bottom-right
3. Click button; verify panel slides in from right
4. Click X button; verify panel slides out
5. Click button again; verify panel reopens with history intact

### Chat Flow
1. With panel open, type message: "What ideas relate to authentication?"
2. Click send or press Enter
3. Verify user message appears right-aligned
4. Verify typing indicator appears
5. Wait for response
6. Verify agent message appears left-aligned
7. Verify response streams in progressively

### Conversation History
1. Send 2-3 messages in conversation
2. Close panel
3. Open panel again
4. Verify all messages still visible
5. Send new message; verify context includes previous messages
6. Refresh page; verify conversation history persisted

### Context
1. Have 5+ ideas in project with various tags
2. Send message: "What are the most common tags?"
3. Verify agent response references actual tags from ideas
4. Ask: "Can you find ideas about mobile?"
5. Verify agent references actual ideas with mobile content

### Streaming
1. Send message to agent
2. Observe response appearing character by character
3. Don't wait for full response to appear
4. Verify response completes correctly

### Error Handling
1. Simulate network error (DevTools)
2. Send message
3. Verify error message displayed in chat
4. Restore network
5. Try again; verify succeeds

### Responsive (Mobile)
1. Resize to mobile (375px)
2. Agent panel takes full screen
3. X button remains accessible
4. Input remains usable with mobile keyboard

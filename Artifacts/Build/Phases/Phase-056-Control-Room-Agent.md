# Phase 056 - Control Room Agent Infrastructure

**Objective:** Implement the Control Room Agent chat interface and backend infrastructure for AI-assisted blueprint creation and review.

**Prerequisites:**
- Phase 002 (Supabase and API setup)
- Phase 046 (Blueprint database schema)
- Phase 047 (Control Room layout with agent panel)
- Phase 051 (Feature blueprints with context)

**Context:**
The Control Room Agent is an AI assistant that helps engineers write technical blueprints. It provides context-aware suggestions, generates blueprint drafts, reviews blueprints for completeness and consistency, and detects drift between blueprints and implementation. The agent operates via a chat interface in the right panel of the Control Room.

**Detailed Requirements:**

1. **Agent Chat Interface (Right Panel)**
   - Header: "Control Room Agent" with icon (AI/robot icon)
   - Chat area:
     - Message history (scrollable)
     - Messages from agent (blue bubbles, left side)
     - Messages from user (gray bubbles, right side)
     - Timestamps on messages (relative: "2 hours ago", absolute on hover)
     - Markdown rendering for agent responses (bold, links, code blocks)
     - Loading state: agent typing indicator (animated dots)
   - Input area (sticky bottom):
     - Text input field (multiline, grows with text, max 5 lines)
     - Placeholder: "Ask the agent..."
     - Character counter: show count when approaching limit (255 chars max)
     - Send button (arrow icon, disabled until text entered)
     - Keyboard: Ctrl+Enter to send (or Cmd+Enter on Mac), Shift+Enter for newline
   - Suggested commands (below input, horizontally scrollable chips):
     - "Generate blueprint"
     - "Review this blueprint"
     - "Help with outline"
     - "Suggest API endpoints"
   - Collapse/expand button (chevron, top-right of header) - collapse minimizes panel to 50px wide

2. **Agent System Prompt**
   - Core instruction:
     ```
     You are the Control Room Agent, an expert technical architect and software engineer.
     Your role is to help engineers write technical blueprints that describe how features
     will be implemented.

     You have access to:
     - Feature requirements from the Pattern Shop
     - Existing blueprints (foundations, system diagrams, feature blueprints)
     - Project architecture and technology decisions
     - Team conventions and best practices

     Your capabilities:
     1. Generate blueprint drafts based on feature requirements
     2. Review blueprints for completeness, consistency, and clarity
     3. Suggest improvements and identify gaps
     4. Answer questions about blueprint best practices
     5. Help with outline structure and content organization

     When generating blueprints, structure responses clearly with:
     - Solution Overview
     - API Endpoints (if applicable)
     - UI Components & Behavior (if applicable)
     - Data Model Changes (if applicable)
     - Business Logic (if applicable)
     - Testing Requirements
     - Dependencies

     Be concise, technical, and actionable. Use code examples where helpful.
     ```

3. **Agent Context**
   - The agent receives context about:
     - Current blueprint being viewed (if any)
     - Current feature node (if viewing feature blueprint)
     - All foundation blueprints (tech decisions, conventions)
     - All system diagrams (architecture reference)
     - Related feature blueprints (dependencies)
     - Org-level templates and guidelines
   - Context sent with each request:
     ```json
     {
       "current_blueprint": { id, type, title, content, status },
       "current_feature": { id, name, description, requirements },
       "foundations": [{ title, content }],
       "system_diagrams": [{ title, content }],
       "related_blueprints": [{ title, content }],
       "project_name": "...",
       "org_guidelines": "..."
     }
     ```

4. **API Route: Control Room Agent**
   - Endpoint: `POST /api/agent/room/route.ts` (or similar)
   - Method: POST with streaming response
   - Request body:
     ```json
     {
       "message": "user message text",
       "context": {
         "project_id": "uuid",
         "current_blueprint_id": "uuid (optional)",
         "current_feature_node_id": "uuid (optional)",
         "message_history": [
           { role: "user", content: "..." },
           { role: "assistant", content: "..." }
         ]
       }
     }
     ```
   - Response: Server-Sent Events (SSE) or streaming JSON
     - Stream tokens as they're generated
     - Each chunk: `{ token: "...", type: "text" | "code" | "section" }`
     - Final chunk: `{ done: true, timestamp: "..." }`
   - Error handling:
     - 400: Bad request (invalid message, context, etc.)
     - 401: Unauthorized
     - 429: Rate limited (max 10 messages per minute per user)
     - 500: Agent error (fallback to: "I encountered an error. Please try again or rephrase your question.")

5. **Agent Commands**
   - User can type commands that trigger specific agent actions:
     - "Generate blueprint" → Agent generates draft based on current feature + foundations
     - "Review this blueprint" → Agent reviews current blueprint for completeness
     - "Help with outline" → Agent provides outline structure for current blueprint type
     - "Suggest API endpoints" → Agent suggests endpoints based on feature requirements
     - Free-form questions: agent answers contextually
   - Commands can be buttons (suggested commands) or typed naturally

6. **Message History Management**
   - Store conversation history in component state (temporary, per session)
   - Optional: persist conversation to database for future reference
   - Clear chat button: clears message history (confirmation: "Clear conversation history?")
   - Max 20 messages per session (oldest messages scroll out)
   - Each message includes: timestamp, role (user/assistant), content

7. **Streaming Response Handling**
   - Implement SSE or Fetch API with ReadableStream
   - Display tokens as they arrive (word-by-word or chunk-by-chunk)
   - Show "typing..." indicator while streaming
   - Allow cancel/stop button if response too long
   - Handle network errors gracefully (retry or fallback message)

8. **Agent Capabilities Roadmap**
   - **Phase 056 (current)**: infrastructure, basic chat, context passing
   - **Phase 057**: blueprint generation (Agent: Blueprint Generation)
   - **Phase 058**: blueprint review (Agent: Blueprint Review)
   - **Future**: drift detection, code analysis, etc.

9. **Rate Limiting & Usage**
   - Rate limit: 10 agent messages per minute per user
   - Org-level quota: TBD (configurable)
   - Display usage: "You have X messages remaining this minute"
   - On limit exceeded: show message "Rate limit reached. Please wait before sending more messages."

10. **Accessibility**
    - Chat interface follows ARIA patterns
    - Message history has role="log" with aria-live="polite"
    - Input field has aria-label="Message to Control Room Agent"
    - Send button has aria-label="Send message"
    - Suggested commands are buttons with aria-label
    - Keyboard navigation: Tab through elements, Space/Enter to activate buttons

11. **Error Handling & User Feedback**
    - Agent error: "I encountered an error processing your request. Please try again."
    - Network error: "Connection lost. Retrying..."
    - Invalid input: "Please enter a message."
    - Rate limit: "You've reached your message limit. Try again in X seconds."
    - Agent context error: "I need more context to help. Please view a blueprint first."
    - Toast notifications for errors and successes

12. **Initial Greeting**
    - When agent panel first opened, show greeting message:
      - "Hi! I'm the Control Room Agent. I can help you write, review, and improve blueprints."
      - Suggested commands appear below
      - Waiting for user input

**API Implementation**
```typescript
// app/api/agent/room/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getBlueprintContext } from '@/lib/blueprints/context';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the Control Room Agent, an expert technical architect...`;

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    // Fetch blueprint context
    const blueprintContext = await getBlueprintContext(context);

    // Build messages array
    const messages = [
      ...(context.message_history || []),
      { role: 'user', content: message }
    ];

    // Create streaming response
    const stream = await client.messages.stream({
      model: 'claude-3-5-sonnet-20241022', // or latest available
      max_tokens: 2048,
      system: SYSTEM_PROMPT + '\n\nContext:\n' + JSON.stringify(blueprintContext),
      messages
    });

    // Transform stream to SSE format
    const encoder = new TextEncoder();
    const readable = stream.toReadableStream();
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = typeof chunk === 'string' ? chunk : chunk.delta?.text || '';
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`));
        }
      }
    });

    return new Response(readable.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process agent request' },
      { status: 500 }
    );
  }
}
```

**UI Components**
- `ControlRoomAgent` (main agent container/wrapper)
- `AgentChatMessage` (single message bubble)
- `AgentChatHistory` (message list)
- `AgentInput` (text input + send button)
- `AgentSuggestedCommands` (suggested command chips)
- `AgentTypingIndicator` (animated dots)
- `AgentErrorMessage` (error state)

**File Structure**
```
app/
  api/
    agent/
      room/
        route.ts (POST agent endpoint with streaming)
  components/
    room/
      ControlRoomAgent.tsx (main container)
      AgentChatHistory.tsx
      AgentChatMessage.tsx
      AgentInput.tsx
      AgentSuggestedCommands.tsx
      AgentTypingIndicator.tsx
  lib/
    agent/
      system-prompt.ts (system prompt definition)
      context.ts (build context for agent)
      streaming.ts (handle SSE/streaming)
    hooks/
      useAgent.ts (manage agent state, API calls)
      useAgentContext.ts (build and pass context)
```

**Acceptance Criteria**
- [ ] Agent panel renders in right side of Control Room
- [ ] Agent panel header shows "Control Room Agent" with icon
- [ ] Chat history displays user and agent messages
- [ ] Agent messages show markdown formatting (bold, links, code)
- [ ] Typing indicator shows while agent responds
- [ ] Input field accepts text and multiline input
- [ ] Send button enabled when text entered
- [ ] Ctrl+Enter sends message
- [ ] Shift+Enter creates newline in input
- [ ] Suggested command buttons appear below input
- [ ] Clicking suggested command sends command
- [ ] Message timestamps display (relative and absolute on hover)
- [ ] Chat scrolls to newest message automatically
- [ ] Clear chat button clears conversation
- [ ] Agent receives current blueprint context
- [ ] Agent receives feature requirements context
- [ ] Agent can access foundations and system diagrams
- [ ] API endpoint returns streaming response (SSE)
- [ ] Tokens display as they're generated (streaming)
- [ ] Error messages display appropriately
- [ ] Rate limit message shows when limit reached
- [ ] Collapse button minimizes agent panel
- [ ] Expand button restores agent panel
- [ ] Agent greeting message displays on first open
- [ ] Keyboard navigation works (Tab through elements)
- [ ] ARIA labels present for screen readers

**Testing Instructions**
1. Navigate to Control Room and verify agent panel visible on right
2. Verify agent header shows "Control Room Agent" icon
3. Verify greeting message displays on first open
4. Type a message in input field
5. Verify send button becomes enabled
6. Click send button and verify message appears in chat
7. Verify agent response streams in (tokens appear progressively)
8. Verify typing indicator shows during response
9. Type multiline message (Shift+Enter) and verify newline appears
10. Verify message timestamp displays
11. Hover over timestamp and verify absolute time shows in tooltip
12. Click suggested command "Generate blueprint" button
13. Verify command sent and agent responds
14. Click suggested command "Review this blueprint"
15. Verify agent reviews current blueprint if selected
16. Send message triggering agent error
17. Verify error message displays gracefully
18. Test rate limiting: send 11 messages rapidly
19. Verify rate limit message appears after 10th message
20. Clear chat via button and verify conversation history cleared
21. Verify confirmation dialog for clear (optional)
22. Collapse agent panel and verify panel minimizes to icon
23. Click icon to expand and verify panel restores
24. Load a different blueprint and verify agent context updates
25. Test network error: send message with network down
26. Verify "Connection lost. Retrying..." message
27. Test keyboard: Tab through input field to send button
28. Test keyboard: Ctrl+Enter sends message
29. Test accessibility: use screen reader and verify aria-labels read correctly
30. View agent response with code block and verify formatting correct

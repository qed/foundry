# Phase 037 - Pattern Shop Agent Infrastructure

## Objective
Build the foundational agent infrastructure for The Pattern Shop, including the agent chat panel, API route, streaming response handling, and system prompt that guides the agent to assist teams with feature decomposition, requirements review, and gap detection.

## Prerequisites
- Pattern Shop layout (Phase 027)
- Pattern Shop database schema (Phase 026)
- Feature Tree (Phase 029)
- Agent conversations table (Phase 002)
- OpenAI API integration or Claude API

## Context
The Pattern Shop Agent is an AI assistant that helps teams decompose project briefs into feature trees, review requirements for gaps and ambiguities, and suggest improvements. It operates via a chat interface in the right panel, receives context about the current project state, and provides streaming responses for a conversational feel.

## Detailed Requirements

### Agent Chat Panel

**Location:**
- Right panel in Pattern Shop (Phase 027)

**Components:**
1. **Message History:** Scrollable area displaying conversation
2. **Message Input:** Text input with send button
3. **Typing Indicator:** Shows when agent is responding

**Message Display:**
```
User Message:
┌─────────────────────────────────────────┐
│ "Generate feature tree from the brief"  │
│ (Right-aligned, blue background)        │
└─────────────────────────────────────────┘

Agent Message:
┌─────────────────────────────────────────┐
│ "I'll help you decompose the brief..."  │
│ (Left-aligned, gray background)         │
└─────────────────────────────────────────┘
```

**Styling:**
- Message container: rounded, padding: 12px, max-width: 85%
- User messages: bg-blue-500, text-white, float-right
- Agent messages: bg-gray-100, text-gray-900, float-left
- Timestamp: text-xs text-gray-500 below message
- Auto-scroll to latest message

### System Prompt

The agent operates under this system prompt:

```
You are the Pattern Shop Agent, an expert requirements and product decomposition assistant.
You help teams transform project briefs into structured, hierarchical feature trees (Epic → Feature → Sub-feature → Task).

Your role:
1. Generate feature trees from project briefs or descriptions
2. Review Feature Requirements Documents (FRDs) for gaps, ambiguities, and testability
3. Detect missing requirements by comparing feature trees against source briefs
4. Suggest improvements to requirements and feature definitions
5. Provide structured, actionable feedback

Context you have access to:
- The current feature tree structure
- Product overview and business context
- Current Feature Requirements Documents (FRDs)
- Project artifacts and briefs

When generating a feature tree:
- Structure: Epic (top-level goal) → Feature (major capability) → Sub-feature (component) → Task (implementable work)
- Each level must have clear, descriptive titles
- Provide a JSON structure that can be imported into the system

When reviewing requirements:
- Check for: ambiguous language, missing acceptance criteria, untestable requirements, vague scope
- Highlight specific issues with line references if possible
- Suggest concrete improvements

When detecting gaps:
- Compare the feature tree against the original brief
- Identify requirements from the brief not covered by the tree
- Suggest new nodes to add

Always be constructive, specific, and actionable. Avoid generic advice. Reference specific nodes, sections, or requirements.
```

### Agent Conversation Table

Reuse `agent_conversations` table from Phase 002:

**Key Fields:**
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects.id)
- `module` (VARCHAR, 'pattern_shop')
- `title` (VARCHAR, auto-generated from first message or "Pattern Shop Assistant")
- `messages` (JSONB): array of message objects
- `created_at`, `updated_at` (TIMESTAMP)

**Message Object Structure:**
```json
{
  "id": "msg-uuid",
  "role": "user" | "assistant",
  "content": "message text",
  "tokens": 142,
  "created_at": "2025-02-20T12:00:00Z"
}
```

**One conversation per Pattern Shop session** (or allow multiple archived conversations).

### Context Injection

When generating the system prompt for each agent request, inject:

1. **Feature Tree Context:**
   ```
   Current Feature Tree:
   - Epic 1: User Authentication (in_progress, 5 features)
     - Feature 1.1: Email Sign-up (complete)
     - Feature 1.2: Email Verification (in_progress)
   - Epic 2: Dashboard (not_started, 3 features)
   ...
   ```

2. **Product Overview:**
   ```
   Product Overview:
   Business Context: [excerpt from product overview]
   Problem Statement: [excerpt]
   Target Users: [excerpt]
   ```

3. **Current FRD (if viewing one):**
   ```
   Current FRD: [Feature Title]
   Content: [full FRD content]
   ```

4. **Uploaded Artifacts:**
   ```
   Project Brief: [file name, size, upload date]
   Other documents: [list]
   ```

### API Route: Agent Chat

**Route:** `POST /api/projects/[projectId]/agent/shop`

**Body:**
```json
{
  "message": "Generate feature tree from the brief",
  "conversationId": "conv-uuid",
  "context": {
    "selectedNodeId": "feature-1",
    "treeSnapshot": {...},
    "productOverviewId": "po-uuid",
    "artifacts": ["artifact-1", "artifact-2"]
  }
}
```

**Response (200 OK - Streaming):**
```
event: stream
data: "I'll help you decompose the brief. Let me analyze the project context...\n"

event: stream
data: "Based on the brief, here are the key requirements:\n"

event: stream
data: "[JSON tree structure will follow]"

event: done
data: {"conversationId": "conv-uuid", "messageId": "msg-uuid", "tokens": 450}
```

**Implementation (Node.js with OpenAI):**
```typescript
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  const { projectId } = request.params;
  const { message, conversationId, context } = await request.json();

  // Fetch conversation or create new one
  let conversation = await getConversation(projectId, conversationId);
  if (!conversation) {
    conversation = await createConversation(projectId, 'pattern_shop');
  }

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // Fetch conversation history
  const messages = await getConversationMessages(conversation.id);

  // Call OpenAI with streaming
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    system: systemPrompt,
    messages: [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
    stream: true,
    max_tokens: 2000,
  });

  // Stream response to client
  const encoder = new TextEncoder();
  const response = new ReadableStream({
    async start(controller) {
      let totalContent = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        totalContent += delta;
        controller.enqueue(
          encoder.encode(`event: stream\ndata: ${JSON.stringify(delta)}\n\n`)
        );
      }

      // Save message to conversation
      const agentMessage = await createMessage(conversation.id, 'assistant', totalContent);

      controller.enqueue(
        encoder.encode(
          `event: done\ndata: ${JSON.stringify({
            conversationId: conversation.id,
            messageId: agentMessage.id,
            tokens: Math.round(totalContent.length / 4), // Rough estimate
          })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new Response(response, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function buildSystemPrompt(context: AgentContext): string {
  let prompt = `You are the Pattern Shop Agent...`;

  if (context.treeSnapshot) {
    prompt += `\n\nCurrent Feature Tree:\n${formatTree(context.treeSnapshot)}`;
  }

  if (context.productOverviewId) {
    const po = getProductOverview(context.productOverviewId);
    prompt += `\n\nProduct Overview:\n${po.content}`;
  }

  if (context.selectedNodeId) {
    const frd = getFRDForNode(context.selectedNodeId);
    if (frd) {
      prompt += `\n\nCurrent FRD: ${frd.title}\n${frd.content}`;
    }
  }

  return prompt;
}
```

### Message Persistence

**Save User Message:**
1. User sends message
2. Create message row: role='user', content=message
3. Optimistically display in UI

**Save Agent Message:**
1. Agent response completes
2. Aggregate streamed content
3. Create message row: role='assistant', content=fullResponse
4. Update message in UI with any interactive elements

### Error Handling

**Network Errors:**
- Show toast: "Failed to send message"
- Offer retry button

**Token Limit:**
- If response exceeds token limit, truncate gracefully
- Show: "Response was truncated due to length"

**API Errors:**
- Log to Sentry or error tracking
- Show user-friendly message: "Agent is temporarily unavailable"

## Database Schema
Uses Phase 002 `agent_conversations` table.

**Optional Extension:**
```sql
ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS context JSONB;
-- Stores tree snapshot, product overview, artifacts info at time of conversation
```

## File Structure
```
app/api/projects/[projectId]/
  agent/
    shop/
      route.ts               (POST endpoint for chat)

components/PatternShop/
  ShopAgentPanel.tsx         (chat UI container)
  ShopAgentChat.tsx          (message display)
  ShopAgentInput.tsx         (message input)

lib/
  api/
    agent/
      shop.ts                (client for API calls)
  agent/
    systemPrompt.ts          (build system prompt with context)
    formatting.ts            (format tree/content for context)
```

## Acceptance Criteria
- [ ] Agent chat panel visible in right panel of Pattern Shop
- [ ] Typing a message and clicking Send sends to API
- [ ] Message appears in UI immediately (optimistic update)
- [ ] Streaming response displays incrementally
- [ ] Agent response saves to database
- [ ] Conversation history persists across sessions
- [ ] Multiple conversations can exist per project (or one per session)
- [ ] System prompt includes feature tree, product overview, current FRD
- [ ] POST /api/projects/[projectId]/agent/shop returns streaming response
- [ ] Error messages display for API failures
- [ ] Typing indicator shows while agent responds
- [ ] Messages are timestamped

## Testing Instructions

1. **Test message sending:**
   - Type "Hello" in agent input
   - Click Send
   - Verify message appears in chat

2. **Test streaming:**
   - Send a message to agent
   - Verify response appears incrementally (not all at once)
   - Verify "typing..." indicator shows

3. **Test persistence:**
   - Send 3 messages to agent
   - Refresh page
   - Verify conversation history is still visible

4. **Test context injection:**
   - Create feature tree with 2 epics, 4 features
   - Open agent
   - Send message: "Summarize the current tree"
   - Verify agent response references the tree

5. **Test error handling:**
   - Disable network (devtools)
   - Try to send message
   - Verify error toast appears
   - Re-enable network, click Retry
   - Verify message sends

6. **Test streaming API directly:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"message": "Hello", "conversationId": "new"}' \
     "http://localhost:3000/api/projects/xyz/agent/shop"
   ```
   Verify event-stream response with multiple chunks.

## Dependencies
- Phase 002: Agent conversations table
- Phase 026: Pattern Shop database schema
- Phase 027: Pattern Shop layout
- Phase 029: Feature tree

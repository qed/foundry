# Phase 073 - Assembly Floor Agent Infrastructure

## Objective
Establish the Assembly Floor Agent as a conversational AI assistant integrated into the right sidebar, capable of accessing work order context and providing streaming responses for intelligent workflow support.

## Prerequisites
- Phase 002: Supabase Project Setup (assumed exists)
- Phase 061: Assembly Floor Database Schema
- Phase 062: Assembly Floor Page Layout
- Phase 073: AI Integration (assumed, or basic API setup)
- Next.js 14+ with App Router

## Context
The Assembly Floor Agent serves as an intelligent co-pilot for the Assembly Floor. It understands the current project context (work orders, phases, features, blueprints) and can assist teams with planning, analysis, and decision-making. The agent is accessible via a right-side chat panel and supports both quick inquiries and extended conversations.

## Detailed Requirements

### Agent Role & Capabilities

#### System Prompt
```
You are the Assembly Floor Agent, an intelligent assistant helping software teams manage work orders, phases, and project execution. Your role is to:

1. Help teams extract work orders from blueprints and requirements
2. Analyze work orders and suggest phase organization
3. Provide insights on project progress and capacity
4. Answer questions about the project's features, dependencies, and roadmap
5. Guide teams through workflow decisions

You have access to the following context:
- All work orders in the project (with titles, descriptions, status, priority, assignments)
- Phase structure and progress
- Feature nodes (features, epics) and their status
- Blueprints and requirements
- Team member information and workload

Always be helpful, concise, and actionable. Ask clarifying questions when needed. Provide structured responses with step-by-step guidance when appropriate.
```

#### Core Capabilities (Implemented in Phases 074-075)
- Extract work orders from blueprints
- Suggest phase planning
- Analyze project status
- Recommend next steps
- Answer questions about work orders, phases, features

### UI Integration

#### Chat Panel Location
- Right sidebar, 350px wide (collapsible)
- Accessible from header button (Phase 062)
- Toggle open/close with icon button
- Close button (×) in panel header

#### Chat Interface
- **Header**: "Assembly Floor Agent" title + close button
- **Message Thread**:
  - Scrollable area showing conversation history
  - Messages alternate: user (blue), agent (gray)
  - User messages: simple text blocks
  - Agent messages: rendered markdown or formatted text
  - Streaming responses: show as typing indicator initially, then stream in
- **Input Area**:
  - Text input field: "Ask about work orders, phases, dependencies..."
  - Send button (arrow icon)
  - Disabled when loading
  - Shift+Enter for multi-line input
- **Example Prompts** (when chat empty):
  - "Extract work orders from blueprint"
  - "Suggest phase plan"
  - "What's blocking critical work orders?"
  - "Show project status"

### Agent Context

#### Available Data
- Current project ID (from URL params)
- All work orders for project (with full details)
- All phases and their composition
- Feature tree (features and epics)
- Blueprints in project
- Current user identity (for personalization)

#### Context Passing
- Query work orders, phases, features via internal API calls
- Keep context lightweight (don't pass 1000 work orders by default)
- Filter to relevant items (e.g., "open work orders" not "all work orders")
- Include summaries and key metrics

### Streaming Responses

#### Implementation
- Use SSE (Server-Sent Events) or WebSocket for streaming
- API endpoint: `POST /api/agent/floor`
- Request body:
  ```json
  {
    "projectId": "uuid",
    "conversationHistory": [ { role: "user"|"assistant", content: "text" } ],
    "currentMessage": "text"
  }
  ```
- Response: Server sends text chunks via streaming
- Client renders text as it arrives (typing effect)

#### User Experience
- Show typing indicator while streaming
- Render text incrementally as chunks arrive
- After completion, mark message as done
- Allow interruption (stop button) during streaming

### Message History

#### Storage
- Keep last 10-20 messages in memory (session)
- Optional: persist in database for audit/history
- Clear history on page refresh (or persist to browser storage)

#### Conversation Context
- Agent has access to previous messages in conversation
- Uses conversation history to understand multi-turn dialogue
- Example: User 1 asks "Extract work orders", then User 2 asks "Which ones are critical?" → agent understands context

### Error Handling
- API errors: show user-friendly message ("I encountered an error...")
- Network errors: retry or show connection error
- Rate limiting: show "Please wait, I'm processing your request"
- Invalid requests: validate before sending

## Database Schema
No new tables for agent (uses existing work_orders, phases, features, blueprints).

## API Routes
```
POST /api/agent/floor
  - Chat endpoint with streaming support
  - Request: { projectId, conversationHistory, currentMessage }
  - Response: SSE stream of text chunks
  - Status: 200 with Content-Type: text/event-stream

GET /api/projects/[projectId]/agent-context
  - Get context data for agent (work orders, phases, features summary)
  - Response: { workOrders: [], phases: [], features: [], blueprints: [] }
  - Status: 200

POST /api/projects/[projectId]/agent-context
  - Refresh/update agent context
  - Status: 200
```

## UI Components

### New Components
1. **AssemblyFloorAgent** (`app/components/Assembly/AssemblyFloorAgent.tsx`)
   - Main agent panel component
   - Wraps ChatInterface, manages state
   - Handles API calls
   - Manages context loading

2. **AgentChatInterface** (`app/components/Assembly/AgentChatInterface.tsx`)
   - Message display area
   - Scrolls to latest message
   - Renders markdown/formatted text
   - Typing indicator

3. **AgentMessage** (`app/components/Assembly/AgentMessage.tsx`)
   - Single message display (user or agent)
   - User messages: blue background, right-aligned
   - Agent messages: gray background, left-aligned
   - Markdown rendering for agent messages
   - Copy-to-clipboard button for agent messages (optional)

4. **AgentInput** (`app/components/Assembly/AgentInput.tsx`)
   - Text input field
   - Send button
   - Example prompts display (if conversation empty)
   - Shift+Enter for multi-line

5. **AgentTypingIndicator** (`app/components/Assembly/AgentTypingIndicator.tsx`)
   - Animated "..." or bouncing dots
   - Shows while agent is processing

### Reused Components
- Markdown renderer (from common, or use react-markdown)

## File Structure
```
app/
  components/
    Assembly/
      AssemblyFloorAgent.tsx              # Main agent panel
      AgentChatInterface.tsx              # Chat display
      AgentMessage.tsx                    # Single message
      AgentInput.tsx                      # Input field
      AgentTypingIndicator.tsx            # Typing animation
  api/
    agent/
      floor/
        route.ts                          # POST streaming chat endpoint
    projects/
      [projectId]/
        agent-context/
          route.ts                        # GET agent context data
  lib/
    agent/
      systemPrompt.ts                     # Agent system prompt
      contextBuilder.ts                   # Build context from DB
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useAgentChat.ts                 # Hook for agent interaction
```

## Acceptance Criteria
- Agent panel visible in right sidebar (collapsible)
- Agent panel toggle button in header
- Click button to open/close panel
- Chat interface displays with header, messages, input
- Type message and press Enter to send
- Typing indicator shows while agent processes
- Agent response streams in (text appears incrementally)
- Conversation history visible (last 10-20 messages)
- Agent has access to work orders, phases, features, blueprints context
- Example prompts shown when chat empty
- Copy button on agent messages (optional)
- Error handling for API failures
- Responsive: panel collapses on mobile

## Testing Instructions

1. **Panel Display & Toggle**
   - Verify agent panel not visible initially (or collapsible)
   - Click agent panel toggle button in header
   - Verify panel opens on right side (350px)
   - Verify header shows "Assembly Floor Agent"
   - Click close button (×)
   - Verify panel closes

2. **Chat Interface**
   - Open agent panel
   - Verify message area empty
   - Verify example prompts displayed
   - Verify input field focused and ready for typing

3. **Send Message**
   - Type "Hello" in input
   - Press Enter
   - Verify message appears in chat (user message, blue, right-aligned)
   - Verify input clears after sending

4. **Streaming Response**
   - Send message to agent
   - Verify typing indicator appears
   - Verify agent response streams in (text appears incrementally)
   - Verify response completes and stops streaming

5. **Conversation Context**
   - User: "Extract work orders from blueprints"
   - Agent responds with work orders list
   - User: "Which are critical?"
   - Agent understands context and filters response to critical WOs
   - Verify multi-turn conversation works

6. **Message History**
   - Send 5 messages
   - Verify all 5 visible in chat thread
   - Scroll up
   - Verify can see all conversation history
   - Close and reopen panel
   - Verify recent messages still visible (or cleared if session-based)

7. **Agent Context Access**
   - Create work orders, phases, features
   - Send message: "How many work orders in Development phase?"
   - Agent accesses context and answers correctly
   - Verify agent has accurate data

8. **Example Prompts**
   - New conversation (empty chat)
   - Verify example prompts displayed:
     - "Extract work orders from blueprint"
     - "Suggest phase plan"
     - etc.
   - Click example prompt
   - Verify prompt inserted in input
   - Send
   - Verify agent processes

9. **Multi-line Input**
   - Type text
   - Press Shift+Enter
   - Verify new line in input (doesn't send)
   - Type more
   - Press Enter (without Shift)
   - Verify message sent with multiple lines

10. **Error Handling**
    - Mock API error
    - Send message
    - Verify error message displayed to user
    - Verify suggestion to retry or contact support

11. **Typing Indicator**
    - Send message that takes longer to process
    - Verify typing indicator shows while processing
    - Verify stops when response arrives

12. **Copy Message** (if implemented)
    - Agent response displayed
    - Hover over message
    - Click "Copy" button
    - Paste elsewhere
    - Verify message copied correctly

13. **Responsive Behavior**
    - Desktop (1920px): full panel 350px visible
    - Tablet (1024px): panel collapses by default
    - Mobile (375px): panel stacks or drawer-style

14. **Panel State Persistence** (if implemented)
    - Open panel, navigate away
    - Return to floor
    - Verify panel state remembered (open/closed)

15. **Performance**
    - Send rapid messages (5+ in quick succession)
    - Verify no lag or UI stuttering
    - Verify all messages queued and processed

16. **Permissions**
    - Non-member tries to access agent
    - Should deny access (403) or redirect
    - Member accesses agent
    - Should work normally

17. **Agent Context Freshness**
    - Create new work order
    - Immediately ask agent about it
    - Verify agent sees the new work order
    - Context updated automatically or requires refresh

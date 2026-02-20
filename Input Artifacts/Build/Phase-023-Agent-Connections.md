# Phase 023 - Hall Agent: Connection Discovery

## Objective
Enable the agent to analyze ideas and suggest connections between them, allowing users to link related ideas, spot extensions/dependencies, and identify idea clusters.

## Prerequisites
- Phase 011: Hall Database Schema (idea_connections table)
- Phase 020: Hall Agent Infrastructure (agent chat and API)
- Phase 016: Idea Detail View (connections display)

## Context
Ideas don't exist in isolation—they often relate to, extend, or duplicate one another. The agent can identify these relationships by analyzing content, helping teams see patterns and dependencies they might otherwise miss. Connection discovery enables more collaborative ideation and prevents re-inventing concepts scattered across multiple ideas.

## Detailed Requirements

### Connection Discovery Mechanisms

**User-Initiated Queries**
- User in agent chat: "What ideas are related to mobile?"
- Agent queries all ideas, finds matches, suggests connections
- User in agent chat: "Find ideas that extend authentication?"
- Agent finds semantic extensions/dependencies

**Periodic Analysis** (Future)
- Agent runs background batch analysis on all ideas
- Updates potential connections daily/weekly
- Notifies team of new clusters or pattern

**On-Demand Analysis**
- Hall page action: "Analyze ideas for connections"
- Runs agent analysis on all ideas in project
- Shows cluster visualization or list of connections

**Integration with Detail View**
- In idea detail, agent shows: "Related ideas we found"
- Links to other ideas with confidence/reasoning

### Agent Chat Queries

**Natural Language Examples**

User: "What ideas are related to authentication?"
Agent Response:
```
I found 4 ideas related to authentication:

1. **OAuth Integration** (related)
   Secure login flow for web apps

2. **Mobile App Auth** (related)
   Similar to your question, focusing on mobile

3. **Single Sign-On** (extends)
   Builds on OAuth integration

4. **Password Management** (related)
   Complements authentication system

Would you like me to link these ideas or provide more details?
```

User: "Find ideas that depend on the payments system"
Agent Response:
```
Found 3 ideas that extend or depend on the payments system:

1. **In-app Purchases** (depends_on)
   Requires payment infrastructure

2. **Subscription Management** (extends)
   Builds on payment system

[Suggest linking?]
```

### Connection Types & Semantics

**Related**
- Ideas discuss similar concepts
- No clear dependency
- Example: "Mobile push notifications" ← → "Web push notifications"

**Extends**
- One idea builds on another
- "Subscription Management" extends "Payments System"
- Directional: A extends B

**Depends On**
- Explicit dependency
- "In-app Purchases" depends on "Payment Processing"
- Directional: A depends on B

**Duplicates**
- Already covered in Phase 022
- Two ideas describe the same concept
- Bidirectional

### Connection Discovery API

**Route**: POST /api/agent/hall/find-connections

**Request**
```json
{
  "projectId": "uuid",
  "ideaId": "uuid",
  "analysisType": "manual" | "related" | "extends" | "depends_on"
}
```

**Response**
```json
{
  "sourceIdeaId": "uuid",
  "connections": [
    {
      "ideaId": "idea2",
      "title": "Mobile App Auth",
      "preview": "Secure login for mobile users...",
      "connectionType": "related",
      "confidence": 0.85,
      "reasoning": "Both discuss authentication mechanisms for different platforms"
    },
    {
      "ideaId": "idea3",
      "title": "Single Sign-On",
      "preview": "Unified authentication across apps...",
      "connectionType": "extends",
      "confidence": 0.92,
      "reasoning": "SSO builds upon OAuth authentication concept"
    }
  ]
}
```

### Agent Chat Integration

**In HallAgentPanel**

User queries: "Find ideas related to X"

Handler:

```typescript
const handleAgentQuery = async (message: string) => {
  // Check if message is a connection discovery query
  if (message.toLowerCase().includes('related') ||
      message.toLowerCase().includes('connect') ||
      message.toLowerCase().includes('extend')) {

    // Extract idea topic from message
    const topic = extractTopic(message);

    // Find ideas matching topic
    const matchingIdeas = findIdeasByTopic(ideas, topic);

    // For each, find connections
    if (matchingIdeas.length > 0) {
      const connections = await findConnections(matchingIdeas[0].id);

      // Format agent response with connections
      const response = formatConnectionResponse(matchingIdeas, connections);

      // Send to agent for natural language response
      const agentMessage = await callAgent(message, response);
    }
  }
};
```

### Connection Suggestion Panel

**In Idea Detail View**

When viewing an idea, if suggestions available:

```
Suggested Connections
─────────────────────

[related] Mobile App Auth
87% match - "Secure login for mobile..."
[Link as Related]

[extends] Single Sign-On
92% match - "Unified authentication..."
[Link as Extends]

[Analyze More]
```

**User Actions**
- Click "Link as Related" (or other type): creates connection
- Click idea title: opens that idea detail
- "Analyze More": triggers full connection analysis

### Batch Analysis & Visualization

**Route**: POST /api/agent/hall/analyze-all-connections

**Triggers**
- Manual: Hall page "Analyze Connections" button
- Periodic: Background job (future)

**Output**
- List of all discovered connections
- Confidence scores
- Visualization (optional): graph/cluster view

**Implementation: Connection Listing**

```typescript
interface ConnectionAnalysisResult {
  connections: Array<{
    fromIdeaId: string;
    fromIdeaTitle: string;
    toIdeaId: string;
    toIdeaTitle: string;
    connectionType: 'related' | 'extends' | 'depends_on';
    confidence: number;
    reasoning: string;
  }>;
  clusters: Array<{
    name: string;
    ideas: string[];
    description: string;
  }>;
}
```

### Implementation in HallAgentPanel

**Chat Commands**

```typescript
// Patterns to detect connection queries
const CONNECTION_PATTERNS = [
  /find.*ideas.*related.*to/i,
  /what.*ideas.*extend/i,
  /ideas.*depend.*on/i,
  /find.*connections/i,
  /cluster.*ideas/i,
];

const isConnectionQuery = (message: string) =>
  CONNECTION_PATTERNS.some(pattern => pattern.test(message));

if (isConnectionQuery(message)) {
  // Route to connection discovery handler
  const topic = extractKeywordFromMessage(message);
  const connections = await findConnectionsForTopic(topic);
  // Format response with connection links
}
```

**Response Formatting**

```typescript
function formatConnectionResponse(
  sourceIdea: Idea,
  connections: Connection[]
): string {
  if (connections.length === 0) {
    return `No related ideas found for "${sourceIdea.title}".`;
  }

  const grouped = groupBy(connections, 'connectionType');
  const sections = Object.entries(grouped)
    .map(([type, conns]) => {
      const items = conns
        .map(c => `- **${c.ideaTitle}** (${Math.round(c.confidence * 100)}% match)`)
        .join('\n');
      return `**${capitalize(type)} ideas:**\n${items}`;
    })
    .join('\n\n');

  return `Found ${connections.length} related ideas:\n\n${sections}`;
}
```

## API Route Implementation

**POST /api/agent/hall/find-connections**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, ideaId, analysisType = 'related' } = await request.json();

    // Verify access
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get source idea
    const sourceIdea = await supabase
      .from('ideas')
      .select('id, title, body')
      .eq('id', ideaId)
      .single();

    if (!sourceIdea.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Get all other ideas in project
    const otherIdeas = await supabase
      .from('ideas')
      .select('id, title, body')
      .eq('project_id', projectId)
      .neq('id', ideaId)
      .neq('status', 'archived');

    // Use Claude to find connections
    const prompt = `Analyze this idea and find related ideas from the list below.

Source Idea: "${sourceIdea.data.title}"
${sourceIdea.data.body}

---

Other Ideas:
${otherIdeas.data.map(idea => `- ID: ${idea.id}
Title: "${idea.title}"
${idea.body}`).join('\n\n')}

---

For each related idea, provide:
1. Idea ID
2. Connection type: "related", "extends", "depends_on", or "duplicates"
3. Confidence (0-100)
4. Brief reasoning

Return JSON:
[
  {
    "ideaId": "id",
    "connectionType": "related",
    "confidence": 85,
    "reasoning": "..."
  }
]

Return ONLY valid JSON.`;

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let suggestions: any[] = [];

    try {
      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (err) {
      console.error('Error parsing connections:', err);
    }

    // Enrich with full idea details
    const connections = suggestions
      .filter(sugg => sugg.confidence >= 60) // Min 60% confidence
      .map(sugg => {
        const idea = otherIdeas.data.find(i => i.id === sugg.ideaId);
        return {
          ideaId: sugg.ideaId,
          title: idea?.title,
          preview: idea?.body?.substring(0, 150),
          connectionType: sugg.connectionType,
          confidence: sugg.confidence / 100,
          reasoning: sugg.reasoning,
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Max 10 suggestions

    return NextResponse.json({
      sourceIdeaId: ideaId,
      connections,
    });
  } catch (error) {
    console.error('Connection discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover connections' },
      { status: 500 }
    );
  }
}
```

**POST /api/agent/hall/analyze-all-connections**

```typescript
export async function POST(request: Request) {
  // Similar to find-connections but analyzes all ideas against all others
  // Returns cluster analysis and all discovered connections
  // Should be paginated or limited due to complexity
}
```

## UI Component: ConnectionSuggestions

```typescript
interface ConnectionSuggestionsProps {
  ideaId: string;
  projectId: string;
  onConnectionCreated?: () => void;
}

export function ConnectionSuggestions({
  ideaId,
  projectId,
  onConnectionCreated,
}: ConnectionSuggestionsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    analyzeConnections();
  }, [ideaId]);

  const analyzeConnections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        '/api/agent/hall/find-connections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            ideaId,
            analysisType: 'related',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections);
      }
    } catch (err) {
      console.error('Error analyzing connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConnection = async (
    targetIdeaId: string,
    type: string
  ) => {
    const response = await fetch('/api/hall/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceIdeaId: ideaId,
        targetIdeaId,
        connectionType: type,
      }),
    });

    if (response.ok) {
      toast.success('Connection created');
      setConnections(prev =>
        prev.filter(c => c.ideaId !== targetIdeaId)
      );
      onConnectionCreated?.();
    }
  };

  if (dismissed || connections.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-blue-900">Suggested Connections</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-600"
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map(conn => (
            <div
              key={conn.ideaId}
              className="p-3 bg-white rounded border border-blue-100"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-900">
                  {conn.title}
                </h4>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {Math.round(conn.confidence * 100)}%
                </span>
              </div>

              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {conn.preview}
              </p>

              <p className="text-xs text-gray-500 mb-2">
                {conn.reasoning}
              </p>

              <div className="flex gap-2 text-xs">
                <button
                  onClick={() =>
                    handleCreateConnection(conn.ideaId, conn.connectionType)
                  }
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Link as {capitalize(conn.connectionType)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Acceptance Criteria
1. Agent chat responds to "related" queries naturally
2. Agent identifies related ideas from project
3. Suggests connections with confidence scores (0-100%)
4. Provides reasoning for suggested connections
5. Connection types: related, extends, depends_on, duplicates
6. User can link ideas directly from chat
7. Connection discovery API returns max 10 suggestions
8. Minimum confidence threshold: 60%
9. Batch analysis finds idea clusters (optional)
10. ConnectionSuggestions component shows in idea detail
11. Suggestions can be dismissed or linked
12. API doesn't block main workflow
13. Handles edge cases (single idea, no connections, etc.)
14. Performance: analysis completes in <10 seconds
15. Respects project access controls
16. Natural language responses (not just JSON)
17. Multiple connection types supported
18. Bidirectional "related" connections
19. Directional "extends"/"depends_on" connections
20. Error handling: graceful fallback if analysis fails

## Testing Instructions

### Chat Query
1. Open agent panel
2. Ask: "What ideas are related to authentication?"
3. Verify agent responds with list of related ideas
4. Verify includes idea titles and confidence %
5. Verify response is in natural language

### Connection Creation from Chat
1. In agent response, click on linked idea title
2. Verify idea opens (or dialog appears)
3. Use "Link as Related" or similar button
4. Verify connection created
5. Toast confirms success

### Suggestion Panel
1. Open idea detail view
2. Scroll to "Suggested Connections" section
3. Verify suggestions display with confidence
4. Click "Link as Related"
5. Verify connection created
6. Suggestions update (removed)

### Confidence Scoring
1. Create highly similar ideas
2. Ask agent to find connections
3. Verify high confidence (80%+) for obvious matches
4. Create loosely related ideas
5. Verify lower confidence (60-70%)

### Connection Types
1. Create idea about "OAuth"
2. Create idea about "OAuth in mobile"
3. Agent should suggest as "extends"
4. Create idea about "Authentication"
5. Agent should suggest as "related"

### Batch Analysis
1. Hall page, click "Analyze All Connections"
2. Wait for analysis to complete
3. Verify list of all discovered connections
4. Filter/sort by type or confidence
5. Create connections from suggestions

### No Blocking
1. Slow API (throttle network)
2. Ask agent connection query
3. Continue browsing while analysis completes
4. Response appears when ready
5. No UI freezing

### Edge Cases
1. Single idea in project: agent should say "no connections"
2. New idea (no others): should show no suggestions
3. All similar ideas: should suggest multiple connections

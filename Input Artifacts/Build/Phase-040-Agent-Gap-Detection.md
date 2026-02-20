# Phase 040 - Agent: Gap Detection

## Objective
Enable the agent to identify gaps between the original project brief/artifacts and the current feature tree, detecting requirements in the brief not yet covered by feature nodes.

## Prerequisites
- Pattern Shop Agent infrastructure (Phase 037)
- Feature Tree (Phase 029)
- Product Overview (Phase 028)
- Artifact storage and retrieval (Phase 015+)

## Context
As teams iteratively build feature trees, it's easy to miss requirements from the original brief. Gap detection helps ensure completeness by comparing the brief against the current tree structure and suggesting new nodes for unaddressed requirements.

## Detailed Requirements

### User Prompt

In agent chat, user initiates gap detection:

```
"Check for gaps in the feature tree"
"What requirements from the brief are not covered?"
"Find missing features"
"Compare tree against the brief"
```

### Gap Detection Process

The agent performs these steps:

1. **Fetch source brief/artifacts:**
   - Retrieve uploaded brief document (from artifact storage)
   - Extract key requirements from brief text

2. **Fetch current tree:**
   - Get all feature nodes for project
   - Build hierarchical representation

3. **Compare:**
   - For each requirement in brief, search for corresponding node in tree
   - Match by semantic similarity (not exact text match)
   - Identify unmatched requirements

4. **Classify gaps:**
   - Missing Epic: "User can make purchases" not in tree
   - Missing Feature: "Discount codes" mentioned but not as feature under Checkout
   - Missing Task: "Email confirmation" mentioned but not as task under Sign-up
   - Partial coverage: "Payment" mentioned but only basic Stripe integration covered, not 3D Secure

5. **Return results:**
   - List of gaps with severity and suggested nodes

### Agent Response Format

```json
{
  "action": "detect_gaps",
  "briefId": "artifact-123",
  "briefName": "Product Brief - E-commerce Platform.pdf",
  "treeNodeCount": 12,
  "coveragePercent": 72,
  "gaps": [
    {
      "id": "gap-1",
      "severity": "high",
      "briefQuote": "Users should be able to search for products by keyword or category",
      "briefSection": "Product Discovery - Search",
      "coverage": "none",
      "description": "Search functionality mentioned in brief but no corresponding feature in tree",
      "suggestedNode": {
        "level": "feature",
        "title": "Product Search",
        "description": "Search products by keyword, category, filters. Support pagination and sorting.",
        "suggestedParent": "Product Browsing"
      }
    },
    {
      "id": "gap-2",
      "severity": "medium",
      "briefQuote": "Support multiple payment methods including credit cards, PayPal, and Apple Pay",
      "briefSection": "Payment Processing",
      "coverage": "partial",
      "description": "Brief mentions 3 payment methods but tree only covers credit cards (Stripe). Missing PayPal and Apple Pay.",
      "suggestedNodes": [
        {
          "level": "task",
          "title": "PayPal Integration",
          "description": "Integrate PayPal payment option",
          "suggestedParent": "Payment Processing"
        },
        {
          "level": "task",
          "title": "Apple Pay Integration",
          "description": "Integrate Apple Pay for iOS users",
          "suggestedParent": "Payment Processing"
        }
      ]
    },
    {
      "id": "gap-3",
      "severity": "low",
      "briefQuote": "System should handle peak traffic of 10,000 concurrent users",
      "briefSection": "Technical Requirements - Scalability",
      "coverage": "none",
      "description": "Non-functional requirement mentioned but no corresponding node. Consider adding Technical Requirements document instead.",
      "suggestedNode": {
        "level": "none",
        "type": "technical_requirement",
        "title": "Scalability - Handle 10,000 Concurrent Users",
        "description": "System must support 10,000 concurrent users without degradation"
      }
    }
  ],
  "summary": "Found 3 gaps (1 high, 1 medium, 1 low). Tree covers 72% of brief requirements. Suggest adding 4 nodes to improve coverage.",
  "coverageTrend": "improved from 65% to 72% since last check"
}
```

**Gap Fields:**
- `id`: Unique gap identifier
- `severity`: 'low', 'medium', 'high' (high = important requirement, low = nice-to-have)
- `briefQuote`: Exact text from brief
- `briefSection`: Section of brief (Product Discovery, Payment, Technical, etc.)
- `coverage`: 'none' (not in tree), 'partial' (partially in tree), 'complete' (fully in tree)
- `description`: Explanation of gap
- `suggestedNode`: Proposed node structure (can be feature, task, or technical_requirement)
- `suggestedNodes`: Array if multiple nodes suggested

### Gap Display UI

Agent response renders in chat with gap panel:

```
┌─ Gap Detection: Product Brief ───────────────────┐
│ Brief: Product Brief - E-commerce.pdf            │
│ Tree Coverage: 72% (12 of 17 requirements)      │
│ Gaps Found: 3 (1 High, 1 Medium, 1 Low)         │
│ Trend: ↑ Improved from 65% to 72%               │
│                                                  │
│ HIGH SEVERITY ─────────────────────────────────  │
│ [Gap 1] Search functionality missing             │
│ From Brief: "Users should be able to search..."  │
│ Suggested Node: Product Search (Feature)         │
│ [View Details] [Create Node] [Dismiss]          │
│                                                  │
│ MEDIUM SEVERITY ────────────────────────────────  │
│ [Gap 2] Incomplete Payment Methods               │
│ Missing: PayPal, Apple Pay                       │
│ From Brief: "Support credit cards, PayPal..."   │
│ Suggested Nodes:                                │
│   - PayPal Integration (Task)                   │
│   - Apple Pay Integration (Task)                │
│ [View Details] [Create All Nodes] [Dismiss]    │
│                                                  │
│ LOW SEVERITY ───────────────────────────────────  │
│ [Gap 3] Scalability Requirement                 │
│ "Handle 10,000 concurrent users"                │
│ Type: Technical Requirement (non-functional)    │
│ [View Details] [Create] [Dismiss]              │
│                                                  │
│ [Accept All Gaps] [Dismiss All]                │
└──────────────────────────────────────────────────┘
```

### Integration with Node Creation

When user clicks "Create Node" or "Create All Nodes":
1. Validate gap suggestion structure
2. For feature/task nodes: create feature_node via Phase 030/038 logic
3. For technical requirements: create requirements_documents with doc_type='technical_requirement'
4. Show success: "{N} nodes created"
5. Refresh tree/technical requirements list

### Gap History & Trends

Optional enhancement:
- Store gap detection results (one record per check)
- Track coverage % over time
- Show trend: "Improved from 65% to 72%" or "Degraded from 80% to 75% (3 nodes deleted)"

### System Prompt Enhancement

Update agent system prompt (Phase 037) to include:

```
When detecting gaps:
1. Carefully read the entire brief/artifacts
2. Extract all requirements (functional and non-functional)
3. Build a comprehensive requirement list from the brief
4. Compare against the feature tree
5. For each requirement, determine:
   - Is it fully covered by existing nodes? (complete)
   - Is it partially covered? (partial)
   - Is it missing entirely? (none)
6. Classify gaps:
   - Missing feature: requirement in brief but no corresponding feature node
   - Missing task: requirement in brief but no corresponding task node
   - Incomplete: requirement partially addressed (e.g., missing payment methods)
   - Wrong level: requirement at wrong hierarchy level
   - Non-functional: requirement that should be in Technical Requirements, not feature tree
7. Suggest new nodes with:
   - Clear title
   - Descriptive description
   - Correct level (epic/feature/task) or type (technical_requirement)
   - Suggested parent node (which epic/feature should this belong under)
8. Include direct quotes from brief
9. Assign severity based on importance in brief
10. Calculate overall coverage percentage
11. If available, note trend from previous detection

Format response as JSON with gaps array.
```

## Database Schema

Optional extension for gap tracking (Phase 040+):

```sql
CREATE TABLE IF NOT EXISTS gap_detection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects.id ON DELETE CASCADE,
  brief_id UUID REFERENCES artifacts.id,
  tree_node_count INT,
  coverage_percent INT,
  gaps_count INT,
  gaps_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_gap_detection_project (project_id),
  INDEX idx_gap_detection_created_at (created_at)
);
```

## API Routes

### POST /api/projects/[projectId]/agent/shop (existing)

Enhanced to support gap detection:

**Body:**
```json
{
  "message": "Check for gaps in the feature tree",
  "conversationId": "conv-uuid",
  "context": {
    "treeSnapshot": {...},
    "artifacts": ["artifact-123"]
  }
}
```

**Response:** Agent response with gaps JSON (streaming)

### POST /api/projects/[projectId]/gaps/create-nodes
Bulk-create suggested nodes from gap detection.

**Body:**
```json
{
  "gaps": [
    {
      "id": "gap-1",
      "suggestedNode": {
        "level": "feature",
        "title": "Product Search",
        "description": "...",
        "suggestedParent": "Product Browsing"
      }
    },
    {
      "id": "gap-2",
      "suggestedNodes": [...]
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "created": 4,
  "nodeIds": ["feature-uuid", "task-uuid", ...],
  "results": [
    {
      "gapId": "gap-1",
      "success": true,
      "nodeId": "feature-uuid"
    }
  ]
}
```

## UI Components

### GapDetectionPanel Component
**Path:** `/components/PatternShop/GapDetectionPanel.tsx`

Displays gap detection results in chat.

```typescript
interface GapDetectionResult {
  briefId: string;
  briefName: string;
  treeNodeCount: number;
  coveragePercent: number;
  gaps: Gap[];
  summary: string;
  coverageTrend?: string;
}

interface Gap {
  id: string;
  severity: 'low' | 'medium' | 'high';
  briefQuote: string;
  briefSection: string;
  coverage: 'none' | 'partial' | 'complete';
  description: string;
  suggestedNode?: ProposedNode;
  suggestedNodes?: ProposedNode[];
}

export default function GapDetectionPanel({ result }: { result: GapDetectionResult }) {
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const gapsBySeverity = groupBy(result.gaps, 'severity');
  const severityOrder = ['high', 'medium', 'low'];
  const completeCoverage = result.gaps.every((g) => g.coverage === 'complete');

  const handleCreateNodes = async (gapIds: string[]) => {
    const selectedGaps = result.gaps.filter((g) => gapIds.includes(g.id));
    setCreating(true);
    try {
      await createNodesFromGaps(selectedGaps);
      toast.success(`${selectedGaps.reduce((sum, g) => sum + (g.suggestedNodes?.length || 1), 0)} nodes created`);
      // Refresh tree
    } catch (error) {
      toast.error('Failed to create nodes');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-amber-50 p-4 rounded border border-amber-200 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">{result.briefName}</h3>
        <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div>
            <span>Coverage: </span>
            <span className="font-semibold">{result.coveragePercent}%</span>
            <span className="text-gray-500"> ({result.treeNodeCount} nodes)</span>
          </div>
          {result.coverageTrend && (
            <span className="text-blue-600">{result.coverageTrend}</span>
          )}
        </div>
      </div>

      {completeCoverage ? (
        <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-700">
          No gaps detected! Your feature tree covers all requirements from the brief.
        </div>
      ) : (
        <div className="space-y-3">
          {severityOrder.map((severity) => {
            const gapsAtSeverity = gapsBySeverity[severity] || [];
            if (gapsAtSeverity.length === 0) return null;

            return (
              <div key={severity}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {severity.toUpperCase()} SEVERITY ({gapsAtSeverity.length})
                </h4>

                <div className="space-y-2">
                  {gapsAtSeverity.map((gap) => (
                    <GapCard
                      key={gap.id}
                      gap={gap}
                      isSelected={selectedGapId === gap.id}
                      onSelect={() => setSelectedGapId(selectedGapId === gap.id ? null : gap.id)}
                      onCreateNodes={() => handleCreateNodes([gap.id])}
                      creating={creating}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            const allGapIds = result.gaps.filter((g) => g.coverage !== 'complete').map((g) => g.id);
            handleCreateNodes(allGapIds);
          }}
          disabled={creating || completeCoverage}
          className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Create All Nodes
        </button>
        <button className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

### GapCard Component
**Path:** `/components/PatternShop/GapCard.tsx`

Individual gap display.

```typescript
interface GapCardProps {
  gap: Gap;
  isSelected: boolean;
  onSelect: () => void;
  onCreateNodes: () => void;
  creating: boolean;
}

export default function GapCard({
  gap,
  isSelected,
  onSelect,
  onCreateNodes,
  creating,
}: GapCardProps) {
  const nodeCount = gap.suggestedNodes?.length || 1;

  return (
    <div className="bg-white p-3 rounded border border-gray-200">
      <button
        onClick={onSelect}
        className="w-full text-left flex items-start gap-2 hover:bg-gray-50 p-2 -m-2"
      >
        <ChevronDown
          size={16}
          className={`flex-shrink-0 transition-transform ${isSelected ? '' : '-rotate-90'}`}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{gap.description}</p>
          <p className="text-xs text-gray-500 mt-1">Section: {gap.briefSection}</p>
        </div>
      </button>

      {isSelected && (
        <div className="mt-3 ml-6 space-y-2 text-sm">
          <div className="bg-gray-50 p-2 rounded border-l-2 border-gray-400 italic text-gray-600">
            "{gap.briefQuote}"
          </div>

          <div>
            <p className="font-semibold text-gray-700 text-xs">Suggested Node{nodeCount > 1 ? 's' : ''}:</p>
            {gap.suggestedNode && (
              <div className="mt-1 text-gray-700">
                <p><strong>{gap.suggestedNode.title}</strong> ({gap.suggestedNode.level})</p>
                <p className="text-xs text-gray-600">{gap.suggestedNode.description}</p>
              </div>
            )}
            {gap.suggestedNodes && (
              <div className="mt-1 space-y-1">
                {gap.suggestedNodes.map((node, i) => (
                  <div key={i} className="text-gray-700">
                    <p><strong>{node.title}</strong> ({node.level})</p>
                    <p className="text-xs text-gray-600">{node.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onCreateNodes}
            disabled={creating}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : `Create ${nodeCount} Node${nodeCount > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
```

## File Structure
```
components/PatternShop/
  GapDetectionPanel.tsx       (gap results display)
  GapCard.tsx                 (individual gap)

lib/
  agent/
    gapDetectionPrompt.ts     (build gap detection prompt)
    parseGaps.ts              (parse agent response)
  api/
    gaps.ts                   (client for gap endpoints)

app/api/projects/[projectId]/
  gaps/
    create-nodes/
      route.ts                (POST endpoint)
```

## Acceptance Criteria
- [ ] User can request gap detection via agent chat
- [ ] Agent analyzes brief and compares against tree
- [ ] Agent response includes structured gaps with severity
- [ ] UI displays gaps grouped by severity
- [ ] Coverage % calculated correctly
- [ ] User can expand/collapse individual gaps
- [ ] "Create Node(s)" button creates suggested nodes in tree
- [ ] Created nodes appear in feature tree immediately
- [ ] Bulk "Create All Nodes" works for multiple gaps
- [ ] Technical requirements suggestions recognized and handled separately
- [ ] Coverage trend tracked (if enabled)

## Testing Instructions

1. **Test gap detection:**
   - Upload brief with 10 requirements
   - Create tree with 7 of them covered
   - In agent chat: "Check for gaps"
   - Verify agent identifies 3 gaps

2. **Test gap display:**
   - Verify gaps grouped by severity
   - Verify brief quotes visible
   - Verify suggested nodes shown

3. **Test node creation:**
   - Click "Create Node" on a gap
   - Verify node is created in database
   - Verify node appears in tree

4. **Test bulk creation:**
   - Have 3 high-severity gaps
   - Click "Create All Nodes"
   - Verify all suggested nodes created

5. **Test coverage calculation:**
   - Create brief with 20 requirements
   - Create tree with 14 covered
   - Verify coverage shows 70%
   - Create one more node
   - Verify coverage updates to 75%

6. **Test technical requirements:**
   - Upload brief mentioning "Handle 10,000 concurrent users"
   - Run gap detection
   - Verify agent suggests technical requirement (not feature)
   - Create it, verify it goes to Technical Requirements section

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 029: Feature tree
- Phase 037: Agent infrastructure

# Phase 038 - Agent: Feature Tree Generation

## Objective
Enable the Pattern Shop Agent to generate a complete feature tree from project briefs or high-level descriptions, with a UI for accepting/rejecting proposed nodes and inserting approved nodes into the database.

## Prerequisites
- Pattern Shop Agent infrastructure (Phase 037)
- Feature Tree (Phase 029)
- Add Nodes to Feature Tree (Phase 030)
- Pattern Shop database schema (Phase 026)

## Context
One of the most time-consuming tasks in feature decomposition is decomposing a project brief into a structured hierarchy. The agent can generate an initial tree structure by analyzing the brief, artifacts, and product overview. Users can then refine it node-by-node before committing to the database.

## Detailed Requirements

### User Prompt

In agent chat, user types a command like:

```
"Generate feature tree from the brief"
"Generate feature tree based on the project requirements"
"Create a feature tree for [project name]"
```

The agent recognizes these patterns and initiates tree generation.

### Agent Response Format

The agent generates a JSON structure representing the proposed tree:

```json
{
  "action": "generate_tree",
  "tree": {
    "nodes": [
      {
        "id": "proposed-epic-1",
        "title": "User Authentication",
        "description": "User login, signup, password reset functionality",
        "level": "epic",
        "children": [
          {
            "id": "proposed-feature-1-1",
            "title": "Email Sign-up",
            "description": "Allow users to create account with email and password",
            "level": "feature",
            "children": [
              {
                "id": "proposed-task-1-1-1",
                "title": "Email validation",
                "description": "Validate email format and uniqueness",
                "level": "task",
                "children": []
              }
            ]
          },
          {
            "id": "proposed-feature-1-2",
            "title": "Login",
            "description": "Login with email and password",
            "level": "feature",
            "children": []
          }
        ]
      }
    ],
    "summary": "Generated 1 epic, 4 features, 3 sub-features, and 2 tasks based on the brief"
  }
}
```

### Tree Review UI

When agent generates tree, render a special UI in the chat that allows per-node approval:

**Display:**
```
┌─ Proposed Feature Tree ─────────────────────────────┐
│ Generated from brief (Summary: 1 epic, 4 features)  │
│                                                     │
│ ┌─ [✓] User Authentication (Epic)                 │
│ │       Allow users to manage their accounts       │
│ │       [View] [Edit Title] [Accept] [Reject]     │
│ │                                                   │
│ │ ├─ [✓] Email Sign-up (Feature)                  │
│ │ │       Allow users to create account            │
│ │ │       [View] [Edit Title] [Accept] [Reject]   │
│ │ │                                                 │
│ │ │ └─ [✓] Email validation (Task)                │
│ │ │       Validate email format and uniqueness     │
│ │ │       [View] [Edit Title] [Accept] [Reject]   │
│ │ │                                                 │
│ │ └─ [ ] Login (Feature)                          │
│ │       Login with email and password              │
│ │       [View] [Edit Title] [Accept] [Reject]     │
│ │                                                   │
│ └─ [ ] Payment Processing (Epic)                  │
│       Allow users to purchase items                │
│       [View] [Edit Title] [Accept] [Reject]       │
│                                                     │
│ [Accept All] [Reject All] [Insert Accepted Nodes] │
└─────────────────────────────────────────────────────┘
```

**Node States:**
- `[✓]` = Accepted (checkbox checked, highlighted)
- `[ ]` = Pending (checkbox unchecked, normal)
- Can toggle individual checkboxes

**Action Buttons Per Node:**
1. **View:** Show full node details (title, description, children count)
2. **Edit Title:** Inline edit node title
3. **Accept:** Accept this node (check checkbox)
4. **Reject:** Reject this node (uncheck checkbox, hide from tree in UI)

**Bulk Actions:**
- **Accept All:** Check all checkboxes
- **Reject All:** Uncheck all checkboxes
- **Insert Accepted Nodes:** Commit accepted nodes to database

### Insertion Logic

**On "Insert Accepted Nodes":**
1. Collect all nodes with checkbox = true
2. Validate tree structure (all parents are accepted, no orphaned nodes)
3. For each accepted node:
   - Generate real UUID (replace "proposed-xxx" IDs)
   - Look up parent by title match (if parent is accepted)
   - Create feature_node row in database
4. Insert in order (parents before children)
5. Show success message: "5 nodes inserted successfully"
6. Refresh tree in left panel
7. Agent responds: "Feature tree created! You can now edit individual nodes and their requirements."

**Validation:**
- If child is accepted but parent is rejected, show warning: "Cannot accept child without accepting parent"
- Offer option to auto-accept parent or reject child

### Node Details Modal

When user clicks "View" on a node:

```
┌─ Node Details ──────────────────┐
│ User Authentication             │
│ Level: Epic                     │
│                                 │
│ Description:                    │
│ User login, signup, password... │
│                                 │
│ Children:                       │
│ - Email Sign-up                 │
│ - Login                         │
│ - Password Reset                │
│                                 │
│ [Close]                         │
└─────────────────────────────────┘
```

### Edit Title Inline

When user clicks "Edit Title":
1. Node title becomes editable input
2. Auto-focus input
3. Press Enter to save, Escape to cancel
4. Update proposed tree state

### Error Handling

**Invalid Tree Structure:**
- If agent generates invalid structure (parent_id not found, level mismatch):
  - Show warning: "Agent generated invalid structure. Please edit or reject this node."
  - Allow manual edits before insertion

**Insertion Errors:**
- If DB insert fails:
  - Show error toast: "Failed to insert nodes. Some were created before the error."
  - Show list of which nodes were/weren't created
  - Offer to rollback (if implemented) or continue

### Undo Generation

If user rejects the tree generation:
- Show: "Generation cancelled. You can create nodes manually or ask the agent to try again."
- Don't save anything
- Clear UI

## Database Schema
Uses Phase 026 schema. No new tables.

## API Routes

### POST /api/projects/[projectId]/feature-nodes/bulk-create
Batch insert multiple nodes (from agent generation).

**Body:**
```json
{
  "nodes": [
    {
      "parentId": null,
      "title": "User Authentication",
      "description": "User login, signup, password reset",
      "level": "epic",
      "position": 0
    },
    {
      "parentId": "<epic-1-uuid>",
      "title": "Email Sign-up",
      "description": "Allow users to create account",
      "level": "feature",
      "position": 0
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "created": 2,
  "nodeIds": ["epic-uuid", "feature-uuid"],
  "tree": {
    "id": "epic-uuid",
    "title": "User Authentication",
    "children": [
      {
        "id": "feature-uuid",
        "title": "Email Sign-up",
        "children": []
      }
    ]
  }
}
```

**Logic:**
1. Validate all nodes have valid levels and parent references
2. Group by parent to calculate positions
3. INSERT all nodes in transaction
4. If any insert fails, rollback entire batch
5. Return created node IDs and tree structure

**Error Responses:**
- 400 Bad Request: Invalid node structure
- 409 Conflict: Parent node not found or invalid level transition

### Existing Endpoints Reused
- POST /api/projects/[projectId]/agent/shop (send agent message with "generate tree" command)

## UI Components

### ProposedTreeReview Component
**Path:** `/components/PatternShop/ProposedTreeReview.tsx`

Displays proposed tree with accept/reject UI.

```typescript
interface ProposedTreeReviewProps {
  tree: ProposedTreeStructure;
  onInsert: (acceptedNodes: ProposedNode[]) => Promise<void>;
  onCancel: () => void;
}

interface ProposedNode {
  id: string;
  title: string;
  description: string;
  level: FeatureLevel;
  children: ProposedNode[];
}

export default function ProposedTreeReview({
  tree,
  onInsert,
  onCancel,
}: ProposedTreeReviewProps) {
  const [acceptedNodeIds, setAcceptedNodeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleToggleAccept = (nodeId: string) => {
    const newAccepted = new Set(acceptedNodeIds);
    if (newAccepted.has(nodeId)) {
      newAccepted.delete(nodeId);
    } else {
      newAccepted.add(nodeId);
    }
    setAcceptedNodeIds(newAccepted);
  };

  const handleInsert = async () => {
    const acceptedNodes = collectAcceptedNodes(tree.nodes, acceptedNodeIds);

    if (!validateTreeStructure(acceptedNodes)) {
      toast.error('Invalid tree structure. Cannot accept child without parent.');
      return;
    }

    setLoading(true);
    try {
      await onInsert(acceptedNodes);
      toast.success('Feature tree created successfully!');
      onCancel();
    } catch (error) {
      toast.error('Failed to insert nodes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-2">Proposed Feature Tree</h3>
      <p className="text-sm text-gray-600 mb-4">{tree.summary}</p>

      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {tree.nodes.map((node) => (
          <ProposedTreeNode
            key={node.id}
            node={node}
            isAccepted={acceptedNodeIds.has(node.id)}
            onToggleAccept={handleToggleAccept}
            onSelectNode={setSelectedNodeId}
            level={0}
          />
        ))}
      </div>

      {selectedNodeId && (
        <NodeDetailsModal
          nodeId={selectedNodeId}
          tree={tree}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setAcceptedNodeIds(new Set(getAllNodeIds(tree.nodes)))}
          className="text-sm px-2 py-1 text-blue-600 hover:underline"
        >
          Accept All
        </button>
        <button
          onClick={() => setAcceptedNodeIds(new Set())}
          className="text-sm px-2 py-1 text-blue-600 hover:underline"
        >
          Reject All
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleInsert}
          disabled={loading || acceptedNodeIds.size === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Inserting...' : `Insert ${acceptedNodeIds.size} Nodes`}
        </button>
      </div>
    </div>
  );
}
```

### ProposedTreeNode Component
**Path:** `/components/PatternShop/ProposedTreeNode.tsx`

Individual node in proposed tree.

```typescript
interface ProposedTreeNodeProps {
  node: ProposedNode;
  level: number;
  isAccepted: boolean;
  onToggleAccept: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export default function ProposedTreeNode({
  node,
  level,
  isAccepted,
  onToggleAccept,
  onSelectNode,
}: ProposedTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(node.title);

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded ${
          isAccepted ? 'bg-green-50 border-l-4 border-green-500' : 'bg-white border-l-4 border-gray-200'
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {node.children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        <input
          type="checkbox"
          checked={isAccepted}
          onChange={() => onToggleAccept(node.id)}
          className="cursor-pointer"
        />

        {editingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              node.title = title;
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                node.title = title;
                setEditingTitle(false);
              } else if (e.key === 'Escape') {
                setTitle(node.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
            className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm"
          />
        ) : (
          <>
            <span className="flex-1 text-sm font-medium">{node.title}</span>
            <span className="text-xs text-gray-500">{node.level}</span>
          </>
        )}

        <button
          onClick={() => onSelectNode(node.id)}
          className="text-xs px-2 py-1 text-blue-600 hover:underline"
        >
          View
        </button>
        <button
          onClick={() => setEditingTitle(true)}
          className="text-xs px-2 py-1 text-blue-600 hover:underline"
        >
          Edit
        </button>
      </div>

      {expanded && node.children.map((child) => (
        <ProposedTreeNode
          key={child.id}
          node={child}
          level={level + 1}
          isAccepted={isAccepted && acceptedNodeIds.has(child.id)}
          onToggleAccept={onToggleAccept}
          onSelectNode={onSelectNode}
        />
      ))}
    </>
  );
}
```

## File Structure
```
components/PatternShop/
  ProposedTreeReview.tsx       (main review UI)
  ProposedTreeNode.tsx         (individual node)
  NodeDetailsModal.tsx         (node details)

lib/
  api/
    featureNodes.ts            (bulk create endpoint)
  agent/
    treeGeneration.ts          (helper functions)
    parseTreeResponse.ts        (parse agent JSON response)

app/api/projects/[projectId]/
  feature-nodes/
    bulk-create/
      route.ts                 (POST endpoint)
```

## Acceptance Criteria
- [ ] Agent recognizes "generate tree" command
- [ ] Agent generates tree in correct JSON format
- [ ] UI renders proposed tree with accept/reject checkboxes
- [ ] Clicking "Accept All" checks all nodes
- [ ] Clicking "Reject All" unchecks all nodes
- [ ] Clicking "Insert" commits accepted nodes to database
- [ ] Parent-child relationships are preserved in database
- [ ] Validation prevents orphaned nodes (child without parent)
- [ ] Positions are auto-calculated (0, 1, 2...)
- [ ] "View" button shows node details (title, description, children)
- [ ] "Edit Title" allows inline editing of proposed titles
- [ ] Success toast shows after insertion
- [ ] Tree in left panel updates to show new nodes
- [ ] POST /api/projects/[projectId]/feature-nodes/bulk-create works (201)

## Testing Instructions

1. **Test agent generation:**
   - In agent chat, send: "Generate feature tree from the brief"
   - Verify JSON tree structure appears
   - Verify UI renders proposed tree

2. **Test accept/reject:**
   - Click checkbox on Epic node
   - Verify it's highlighted and checkboxes update
   - Click "Accept All"
   - Verify all nodes checked

3. **Test insertion:**
   - Accept all nodes
   - Click "Insert"
   - Verify success toast
   - Verify tree in left panel has new nodes

4. **Test validation:**
   - Accept a child Feature but reject its Epic parent
   - Try to insert
   - Verify error: "Cannot accept child without accepting parent"

5. **Test edit title:**
   - Click "Edit" on a node title
   - Change text
   - Press Enter
   - Verify title updates in UI

6. **Test API:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"nodes": [{"parentId": null, "title": "Epic", "level": "epic"}]}' \
     "http://localhost:3000/api/projects/xyz/feature-nodes/bulk-create"
   ```

## Dependencies
- Phase 026: Database schema
- Phase 029: Feature tree
- Phase 030: Add nodes
- Phase 037: Agent infrastructure

# Phase 033 - Feature Requirements Document (FRD)

## Objective
Create auto-generated Feature Requirements Documents (FRDs) linked to feature nodes, with a standard template that guides teams through defining user stories, requirements, acceptance criteria, and dependencies for each feature.

## Prerequisites
- Pattern Shop database schema (Phase 026)
- Feature Tree component (Phase 029)
- Pattern Shop layout (Phase 027)

## Context
Each feature node (Feature, Sub-feature, or Task) can have an associated FRD. The FRD is created automatically the first time a user selects a node that lacks one. The template provides structure while allowing flexible editing. FRDs are displayed in the center panel editor (Phase 034).

## Detailed Requirements

### FRD Auto-Creation

**Trigger:**
- User clicks feature node in tree that has no FRD yet
- System checks: SELECT requirements_documents WHERE feature_node_id = ? AND doc_type = 'feature_requirement'
- If no row found: create FRD with template

**Creation Logic:**
1. POST to `/api/projects/[projectId]/requirements-documents`
2. Fields:
   - `project_id` = current project
   - `feature_node_id` = clicked node ID
   - `doc_type` = 'feature_requirement'
   - `title` = "{node.title} - Feature Requirement"
   - `content` = FRD template (HTML)
3. Insert into requirements_documents table
4. Return created document to UI

### FRD Template

Standard sections guiding teams through requirements definition:

```html
<h1>{Feature Title} - Feature Requirement</h1>

<h2>Overview</h2>
<p><em>Provide a brief description of what this feature does and why it matters.</em></p>
<p>Replace this with your overview...</p>

<h2>User Story</h2>
<p><em>Write user stories in the format: As a [user role], I want to [action], so that [benefit].</em></p>
<p>Replace this with your user story...</p>

<h2>Requirements</h2>
<ul>
  <li><em>Functional requirement 1</em></li>
  <li><em>Functional requirement 2</em></li>
  <li><em>Non-functional requirement 1</em></li>
</ul>
<p>Replace this with your requirements...</p>

<h2>Acceptance Criteria</h2>
<p><em>Define what "done" looks like. Use GIVEN/WHEN/THEN or checklist format.</em></p>
<ul>
  <li>[ ] Criterion 1</li>
  <li>[ ] Criterion 2</li>
</ul>

<h2>Out of Scope</h2>
<p><em>Explicitly state what is NOT included in this feature.</em></p>
<p>Replace this with out-of-scope items...</p>

<h2>Dependencies</h2>
<p><em>List other features, tasks, or systems this depends on.</em></p>
<ul>
  <li>Dependency on [Feature Name]</li>
</ul>
```

### FRD Editing

(Defer to Phase 034: Requirements Document Editor for full rich-text editing)

For Phase 033:
- FRD content is displayed in center panel
- Basic text display only (HTML rendering)
- Link to editor component (phase 034)

### Linking FRDs to Feature Nodes

**1:1 Relationship:**
- One FRD per feature node
- Multiple feature nodes share no FRD
- UNIQUE constraint: (feature_node_id, doc_type) in Phase 026 enforces this

**Display:**
- When feature node is selected in tree
- Load FRD by querying: SELECT * FROM requirements_documents WHERE feature_node_id = ? AND doc_type = 'feature_requirement'
- Display in center panel

### Reading FRDs

**Route:** `GET /api/projects/[projectId]/requirements-documents?feature_node_id=[nodeId]`

**Response:**
```json
{
  "id": "frd-123",
  "project_id": "project-xyz",
  "feature_node_id": "feature-1",
  "doc_type": "feature_requirement",
  "title": "Email Verification - Feature Requirement",
  "content": "<h1>Email Verification...</h1>",
  "created_by": "user-uuid",
  "created_at": "2025-02-20T12:00:00Z",
  "updated_at": "2025-02-20T12:00:00Z"
}
```

## Database Schema
Uses Phase 026 schema:
- `requirements_documents` table
- `doc_type = 'feature_requirement'`
- `feature_node_id` is NOT NULL

## API Routes

### POST /api/projects/[projectId]/requirements-documents
Create a new requirements document (FRD).

**Body:**
```json
{
  "feature_node_id": "feature-1",
  "doc_type": "feature_requirement",
  "title": "Email Verification - Feature Requirement",
  "content": "<h1>Email Verification...</h1>"
}
```

**Alternative (auto-generate from template):**
```json
{
  "feature_node_id": "feature-1",
  "templateId": "default"
}
```

**Response (201 Created):**
```json
{
  "id": "frd-123",
  "project_id": "project-xyz",
  "feature_node_id": "feature-1",
  "doc_type": "feature_requirement",
  "title": "Email Verification - Feature Requirement",
  "content": "<h1>Email Verification - Feature Requirement</h1>...",
  "created_by": "user-uuid",
  "created_at": "2025-02-20T12:00:00Z",
  "updated_at": "2025-02-20T12:00:00Z"
}
```

**Error Responses:**
- 400 Bad Request: feature_node_id required
- 404 Not Found: Feature node not found
- 409 Conflict: FRD already exists for this feature

### GET /api/projects/[projectId]/requirements-documents
Fetch requirement documents (can filter by feature_node_id).

**Query Parameters:**
- `feature_node_id` (optional): UUID of feature node
- `doc_type` (optional): 'feature_requirement', 'product_overview', 'technical_requirement'

**Response (200 OK):**
```json
{
  "documents": [
    {
      "id": "frd-123",
      "feature_node_id": "feature-1",
      "doc_type": "feature_requirement",
      "title": "Email Verification - Feature Requirement",
      "content": "<h1>...</h1>",
      "created_at": "2025-02-20T12:00:00Z",
      "updated_at": "2025-02-20T12:00:00Z"
    }
  ]
}
```

### GET /api/projects/[projectId]/requirements-documents/[docId]
Fetch a single requirements document.

**Response (200 OK):**
```json
{
  "id": "frd-123",
  "project_id": "project-xyz",
  "feature_node_id": "feature-1",
  "doc_type": "feature_requirement",
  "title": "Email Verification - Feature Requirement",
  "content": "<h1>Email Verification...</h1>",
  "created_by": "user-uuid",
  "created_at": "2025-02-20T12:00:00Z",
  "updated_at": "2025-02-20T12:00:00Z"
}
```

## UI Components

### FRDDisplay Component
**Path:** `/components/PatternShop/FRDDisplay.tsx`

Displays FRD content (read-only or with edit link).

```typescript
interface FRDDisplayProps {
  featureNodeId: string;
  projectId: string;
  onEditClick?: () => void;
}

export default function FRDDisplay({
  featureNodeId,
  projectId,
  onEditClick,
}: FRDDisplayProps) {
  const [document, setDocument] = useState<RequirementsDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequirementsDocument(projectId, featureNodeId)
      .then(setDocument)
      .catch(() => {
        // Auto-create if not found
        return createRequirementsDocument(projectId, featureNodeId).then(setDocument);
      })
      .finally(() => setLoading(false));
  }, [featureNodeId, projectId]);

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
  if (!document) return <div className="p-4 text-gray-500">Failed to load document</div>;

  return (
    <div className="p-6 overflow-y-auto flex-1">
      <div className="prose max-w-none mb-6">
        <div dangerouslySetInnerHTML={{ __html: document.content }} />
      </div>

      {onEditClick && (
        <button
          onClick={onEditClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit Document
        </button>
      )}
    </div>
  );
}
```

### FRDLoader Component
**Path:** `/components/PatternShop/FRDLoader.tsx`

Hooks into tree node selection to load and display FRD.

```typescript
interface FRDLoaderProps {
  selectedNodeId?: string;
  projectId: string;
}

export default function FRDLoader({
  selectedNodeId,
  projectId,
}: FRDLoaderProps) {
  if (!selectedNodeId) {
    return <div className="p-6 text-gray-500">Select a feature node to view its requirements</div>;
  }

  return <FRDDisplay featureNodeId={selectedNodeId} projectId={projectId} />;
}
```

## File Structure
```
components/PatternShop/
  FRDDisplay.tsx              (read-only FRD display)
  FRDLoader.tsx               (loader for selected node)

lib/
  api/
    requirementsDocuments.ts  (API client)
    frdTemplates.ts           (template generation)

app/api/projects/[projectId]/
  requirements-documents/
    route.ts                  (GET, POST)
    [docId]/
      route.ts                (GET single doc, PUT update)
```

## Acceptance Criteria
- [ ] Selecting feature node without FRD triggers auto-creation
- [ ] Auto-created FRD has correct template with all sections
- [ ] FRD title matches node title
- [ ] FRD displays in center panel when node is selected
- [ ] POST /api/projects/[projectId]/requirements-documents creates FRD (201)
- [ ] GET endpoint retrieves FRD by feature_node_id
- [ ] UNIQUE constraint prevents duplicate FRDs per node
- [ ] RLS restricts access by project membership
- [ ] FRD content is HTML and renders correctly
- [ ] Multiple nodes can have FRDs (no conflicts)

## Testing Instructions

1. **Test auto-creation:**
   - Create feature node
   - Click it in tree
   - Verify FRD is created automatically
   - Query DB: `SELECT * FROM requirements_documents WHERE feature_node_id = ?`
   - Verify row exists with doc_type='feature_requirement'

2. **Test template:**
   - Auto-created FRD should contain all 6 sections (Overview, User Story, Requirements, etc.)
   - Verify HTML renders correctly

3. **Test GET endpoint:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/projects/xyz/requirements-documents?feature_node_id=feature-1"
   ```
   Verify response contains FRD.

4. **Test UNIQUE constraint:**
   - Attempt to create second FRD for same feature node
   - Verify 409 Conflict error

5. **Test display:**
   - Click different feature nodes
   - Verify different FRDs load in center panel

6. **Test RLS:**
   - Sign in as user not in project
   - Attempt to fetch FRD
   - Verify 403 Forbidden

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 029: Feature tree
- Phase 034: Rich text editor (for editing FRDs)

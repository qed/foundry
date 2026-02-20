# Phase 028 - Product Overview Document

## Objective
Create a product overview document that is auto-generated for each project, serving as a repository for high-level business context, user insights, success metrics, and key decisions that inform the entire feature tree decomposition.

## Prerequisites
- Pattern Shop database schema (Phase 026)
- Pattern Shop layout (Phase 027)
- Rich text editor capabilities (Phase 034 for full implementation; basic editor acceptable here)

## Context
The Product Overview is a special requirements document (doc_type='product_overview') created automatically when a project is initialized. It is pinned at the top of the left panel navigation and provides context that shapes all downstream feature definitions. Teams edit it collaboratively to maintain a single source of truth about the product's goals and constraints.

## Detailed Requirements

### Auto-Creation on Project Initialization

When a new project is created (via Phase 009 or similar):

1. Create a product overview document automatically:
   - `project_id` = new project ID
   - `feature_node_id` = NULL
   - `doc_type` = 'product_overview'
   - `title` = "Product Overview"
   - `content` = template HTML (see below)
   - `created_by` = project creator user ID
   - `created_at` = NOW()

2. Persist to `requirements_documents` table (Phase 026)

### Product Overview Template

The document contains five main sections with placeholder guidance:

```html
<h1>Product Overview</h1>

<h2>Business Context</h2>
<p><em>Describe the business problem and opportunity. Who is the customer? What market are we addressing?</em></p>
<p>Replace this with your business context...</p>

<h2>Problem Statement</h2>
<p><em>What specific problem(s) are we solving? What pain points do users face?</em></p>
<p>Replace this with your problem statement...</p>

<h2>Target Users</h2>
<p><em>Define primary and secondary user personas. Include roles, experience levels, and key characteristics.</em></p>
<p>Replace this with your target users...</p>

<h2>Success Metrics</h2>
<p><em>How will we measure success? List quantifiable metrics (adoption rate, time-to-value, user satisfaction, etc.).</em></p>
<p>Replace this with your success metrics...</p>

<h2>Key Decisions</h2>
<p><em>Document critical decisions made about the product direction. Include constraints, technical decisions, or strategic choices.</em></p>
<p>Replace this with your key decisions...</p>
```

### Display in UI

**Location:** Top of left panel, always visible above feature tree

**Styling:**
- Special section header: "Product Overview" with icon (document icon from Lucide)
- Clickable item (same interactive styling as feature nodes)
- When selected, center panel displays full product overview in editor
- No status dropdown (product overview is not "in progress" or "complete")
- Read-only view with edit toggle if user lacks edit permissions

### Editing the Product Overview

When product overview is selected:
1. Center panel loads the document content
2. Full rich text editor is available (defer rich editor to Phase 034, but basic editing must work)
3. Auto-save functionality (debounced 2s after edit)
4. Version history captured on significant saves (Phase 043)

### Content Validation

- Title must not be empty (default: "Product Overview")
- Content can be any valid HTML
- No character length restrictions

### Permissions

Follows project-level RLS from Phase 026:
- View: all project members
- Edit: only owner and editor roles
- Create: done by system automatically, no user action needed

## Database Schema
Uses Phase 026 schema. The product overview is a `requirements_document` row with:
- `doc_type = 'product_overview'`
- `feature_node_id = NULL`
- `project_id = <the project>`

## API Routes

### GET /api/projects/[projectId]/product-overview
Fetch the product overview for a project.

**Query Parameters:**
- `projectId` (string, required): Project UUID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "doc_type": "product_overview",
  "title": "Product Overview",
  "content": "<h1>Product Overview</h1>...",
  "created_by": "uuid",
  "created_at": "2025-02-20T12:00:00Z",
  "updated_at": "2025-02-20T12:00:00Z"
}
```

**Error Responses:**
- 404 Not Found: Product overview not found for project (should not happen)
- 403 Forbidden: User not a member of project

### POST /api/projects/[projectId]/product-overview/initialize
Auto-initialize product overview on project creation (internal use).

**Body:**
```json
{
  "projectId": "uuid",
  "createdBy": "uuid"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "doc_type": "product_overview",
  "title": "Product Overview",
  "content": "<h1>Product Overview</h1>...",
  "created_by": "uuid",
  "created_at": "2025-02-20T12:00:00Z",
  "updated_at": "2025-02-20T12:00:00Z"
}
```

### PUT /api/requirements-documents/[docId]
Update a requirements document (reused from Phase 034). Applies to product overview.

**Body:**
```json
{
  "title": "Product Overview",
  "content": "<h1>Product Overview</h1>..."
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "updated_at": "2025-02-20T12:05:00Z"
}
```

## UI Components

### ProductOverviewSection Component
**Path:** `/components/PatternShop/ProductOverviewSection.tsx`

Renders pinned product overview item in left panel.

```typescript
interface ProductOverviewSectionProps {
  projectId: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ProductOverviewSection({
  projectId,
  isSelected,
  onSelect,
}: ProductOverviewSectionProps) {
  const [document, setDocument] = useState<RequirementsDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductOverview(projectId).then(setDocument).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className={`p-3 border-b ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      <button onClick={onSelect} className="flex items-center gap-2 w-full text-left">
        <DocumentIcon size={18} />
        <span className="font-semibold text-gray-900">Product Overview</span>
      </button>
    </div>
  );
}
```

### ProductOverviewEditor Component
**Path:** `/components/PatternShop/ProductOverviewEditor.tsx`

Displays product overview content in center panel editor.

## File Structure
```
app/api/projects/[projectId]/
  product-overview/
    route.ts              (GET for fetching)
    initialize/
      route.ts            (POST for auto-initialization)

components/PatternShop/
  ProductOverviewSection.tsx  (left panel item)
  ProductOverviewEditor.tsx   (center panel editor)

lib/
  productOverview.ts      (utility functions for CRUD)
```

## Acceptance Criteria
- [ ] Product overview document is auto-created when new project is initialized
- [ ] Auto-created document has correct template with all five sections
- [ ] Product overview appears pinned at top of left panel in Pattern Shop
- [ ] Clicking product overview in left panel loads content in center panel
- [ ] Product overview can be edited via editor in center panel
- [ ] Auto-save works (content persisted to DB after edit)
- [ ] Product overview is read-only for users without edit permissions
- [ ] GET /api/projects/[projectId]/product-overview returns correct document
- [ ] POST /api/projects/[projectId]/product-overview/initialize creates document if missing
- [ ] RLS restricts access by project membership

## Testing Instructions

1. **Test auto-creation:**
   - Create a new project via the UI
   - Query database: `SELECT * FROM requirements_documents WHERE doc_type = 'product_overview' AND project_id = ?`
   - Verify one row exists with correct template content

2. **Test API fetch:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/projects/xyz/product-overview"
   ```
   Verify response contains product overview document.

3. **Test UI rendering:**
   - Open Pattern Shop for project
   - Verify "Product Overview" appears in left panel above feature tree
   - Click product overview item
   - Verify center panel shows document content

4. **Test editing:**
   - Edit product overview text in editor (change a section)
   - Wait 2 seconds for auto-save
   - Reload page
   - Verify edits persist

5. **Test permissions:**
   - Sign in as viewer (read-only role)
   - Open product overview
   - Verify editor is disabled (read-only mode)
   - Sign in as editor
   - Verify editor is enabled

6. **Test initialization endpoint:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"projectId": "xyz", "createdBy": "user-uuid"}' \
     "http://localhost:3000/api/projects/xyz/product-overview/initialize"
   ```
   Verify 201 response and document is created.

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 034: Rich text editor (for advanced editing; basic editing acceptable)

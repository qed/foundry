# Phase 045 - Technical Requirements Documents

## Objective
Create a dedicated section for Technical Requirements Documents (non-functional requirements) separate from the feature tree, including categories for authentication, API, performance, and data storage.

## Prerequisites
- Requirements Document Editor (Phase 034)
- Requirements documents schema (Phase 026)
- Pattern Shop layout (Phase 027)
- Feature Tree (Phase 029)

## Context
Feature trees focus on functional requirements (what the system does). Technical requirements cover non-functional aspects: security, performance, scalability, data handling, and integrations. Unlike feature nodes, technical requirements are not hierarchical or decomposable—they are standalone document silos.

## Detailed Requirements

### Technical Requirements Categories

Technical requirements are organized by category:

1. **Authentication & Security:**
   - User authentication mechanisms
   - Authorization and access control
   - Data encryption (in transit, at rest)
   - Audit logging
   - Compliance (GDPR, SOC2, etc.)

2. **API & Integrations:**
   - API specifications (REST, GraphQL)
   - Third-party integrations (payment, email, etc.)
   - Webhook support
   - Rate limiting
   - API versioning

3. **Performance & Scalability:**
   - Response time SLAs
   - Throughput requirements
   - Concurrent user capacity
   - Database query performance
   - Caching strategy

4. **Data & Storage:**
   - Data retention policies
   - Backup and disaster recovery
   - Database schema requirements
   - Data migration strategy
   - Archival procedures

### Technical Requirements Section

**Location:**
- Left panel, below feature tree
- Collapsed by default
- Expands to show list of technical requirements

**Display:**
```
┌─ Technical Requirements ─────────────┐
│ [▼ Authentication & Security (2)]   │
│   [Secure Password Hashing]         │
│   [Two-Factor Authentication]       │
│ [▶ API & Integrations (0)]          │
│ [▶ Performance & Scalability (1)]   │
│   [Handle 10,000 Concurrent Users]  │
│ [▶ Data & Storage (1)]              │
│   [Daily Backups to S3]             │
│                                     │
│ [+ Add Technical Requirement]       │
└─────────────────────────────────────┘
```

**Features:**
- Click category header to expand/collapse
- Click requirement to open in center panel editor
- Count badges show items per category
- "+" button to add new requirement

### Create Technical Requirement

**Trigger:**
1. Click "+ Add Technical Requirement" button
2. Right-click on category header → "Add Requirement"
3. Agent suggests technical requirements (Phase 040)

**Dialog:**
```
Create Technical Requirement

Category:
[Select Category ▼]
  - Authentication & Security
  - API & Integrations
  - Performance & Scalability
  - Data & Storage

Title:
[Secure Password Hashing]

Description (optional):
[Passwords must be hashed using bcrypt with at least 10 rounds...]

[Cancel] [Create]
```

**Process:**
1. Create requirements_documents row:
   - `doc_type = 'technical_requirement'`
   - `feature_node_id = NULL` (not linked to feature)
   - `title` = user-provided title
   - `content` = template with category guidelines
2. Show in left panel under appropriate category
3. Open editor in center panel

### Technical Requirements Template

When new technical requirement is created, populate with category-specific template:

**Authentication & Security Template:**
```html
<h1>Secure Password Hashing</h1>

<h2>Overview</h2>
<p>Describe the security requirement and its business context.</p>

<h2>Specification</h2>
<p>Define technical specification and implementation approach.</p>

<h2>Compliance</h2>
<p>Reference applicable standards, regulations, or best practices.</p>

<h2>Testing Requirements</h2>
<p>How will this be tested and verified?</p>

<h2>Acceptance Criteria</h2>
<ul>
  <li>Criterion 1</li>
  <li>Criterion 2</li>
</ul>
```

**API & Integrations Template:**
```html
<h1>Stripe Payment Integration</h1>

<h2>Overview</h2>
<p>Integration summary.</p>

<h2>API Endpoint</h2>
<p>Endpoint URL, method, request/response format.</p>

<h2>Authentication</h2>
<p>How API is authenticated.</p>

<h2>Error Handling</h2>
<p>How errors are handled and retried.</p>

<h2>Rate Limiting</h2>
<p>Rate limits and retry strategy.</p>
```

**Performance & Scalability Template:**
```html
<h1>Handle 10,000 Concurrent Users</h1>

<h2>Requirement</h2>
<p>System must support 10,000 concurrent users.</p>

<h2>SLA</h2>
<p>Response time: <2 seconds for 95th percentile.</p>

<h2>Current Capacity</h2>
<p>Current system handles X concurrent users.</p>

<h2>Scaling Strategy</h2>
<p>How will the system scale? Load balancing, caching, database sharding?</p>

<h2>Testing</h2>
<p>Load testing plan and success criteria.</p>
```

**Data & Storage Template:**
```html
<h1>Daily Backups to S3</h1>

<h2>Overview</h2>
<p>Daily automated backups to AWS S3.</p>

<h2>Backup Frequency</h2>
<p>Daily at 2 AM UTC.</p>

<h2>Retention Policy</h2>
<p>Keep 30 days of daily backups, 12 months of weekly backups.</p>

<h2>Recovery Process</h2>
<p>Steps to recover from backup.</p>

<h2>Testing</h2>
<p>How will backups be tested?</p>
```

### Display in Left Panel

**Organization:**
- Collapsible categories
- Show count per category
- Sorted: items with most recent changes first within category
- Same styling as feature tree nodes (but not hierarchical)

**Interaction:**
- Click to select (loads in center panel)
- Right-click → Edit, Delete, Move to Category
- Drag to reorder within category (optional)

### Database Schema

Uses Phase 026 `requirements_documents` table:

**For Technical Requirements:**
- `doc_type = 'technical_requirement'`
- `feature_node_id = NULL`
- `title` = requirement title
- `content` = HTML content
- Metadata: category stored as first tag or in separate column (optional)

**Optional: Technical Requirements Metadata Table:**
```sql
CREATE TABLE IF NOT EXISTS technical_requirements_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL UNIQUE REFERENCES requirements_documents(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('draft', 'in_review', 'approved', 'implemented') DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tech_req_category ON technical_requirements_metadata(category);
```

## API Routes

### POST /api/projects/[projectId]/requirements-documents
(Reuse from Phase 033, with doc_type='technical_requirement')

**Body:**
```json
{
  "doc_type": "technical_requirement",
  "category": "Authentication & Security",
  "title": "Secure Password Hashing",
  "content": "<h1>Secure Password Hashing</h1>..."
}
```

### GET /api/projects/[projectId]/technical-requirements
Fetch all technical requirements, grouped by category.

**Query Parameters:**
- `projectId` (required): Project UUID
- `category` (optional): Filter by category

**Response (200 OK):**
```json
{
  "categories": {
    "Authentication & Security": [
      {
        "id": "tr-uuid",
        "title": "Secure Password Hashing",
        "status": "approved",
        "created_at": "2025-02-20T12:00:00Z"
      },
      {
        "id": "tr-uuid",
        "title": "Two-Factor Authentication",
        "status": "draft"
      }
    ],
    "API & Integrations": [],
    "Performance & Scalability": [
      {
        "id": "tr-uuid",
        "title": "Handle 10,000 Concurrent Users",
        "status": "in_review"
      }
    ],
    "Data & Storage": [
      {
        "id": "tr-uuid",
        "title": "Daily Backups to S3",
        "status": "approved"
      }
    ]
  }
}
```

## UI Components

### TechnicalRequirementsSection Component
**Path:** `/components/PatternShop/TechnicalRequirementsSection.tsx`

Left panel section displaying technical requirements by category.

```typescript
interface TechnicalRequirementsCategory {
  name: string;
  requirements: RequirementsDocument[];
}

export default function TechnicalRequirementsSection({
  projectId,
  selectedDocId,
  onSelectDocument,
}: {
  projectId: string;
  selectedDocId?: string;
  onSelectDocument: (docId: string) => void;
}) {
  const [categories, setCategories] = useState<Record<string, RequirementsDocument[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Authentication & Security'])
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTechnicalRequirements(projectId)
      .then(({ categories }) => setCategories(categories))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleToggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddRequirement = (category: string) => {
    showCreateTechnicalRequirementDialog(projectId, category, () => {
      // Refresh list
      fetchTechnicalRequirements(projectId).then(({ categories }) => setCategories(categories));
    });
  };

  if (loading) return <div className="p-2 text-gray-500 text-sm">Loading...</div>;

  return (
    <div className="border-t border-gray-200 pt-3 px-3">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Technical Requirements</h3>

      <div className="space-y-1">
        {Object.entries(categories).map(([category, requirements]) => (
          <div key={category}>
            <button
              onClick={() => handleToggleCategory(category)}
              className="w-full flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium text-gray-700"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span>{category}</span>
              <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">
                {requirements.length}
              </span>
            </button>

            {expandedCategories.has(category) && (
              <div className="ml-4 space-y-1 my-2">
                {requirements.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => onSelectDocument(req.id)}
                    className={`w-full text-left text-sm px-2 py-1 rounded truncate ${
                      selectedDocId === req.id
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {req.title}
                  </button>
                ))}

                <button
                  onClick={() => handleAddRequirement(category)}
                  className="w-full text-left text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                >
                  + Add Requirement
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### CreateTechnicalRequirementDialog Component
**Path:** `/components/PatternShop/CreateTechnicalRequirementDialog.tsx`

Dialog for creating new technical requirement.

## File Structure
```
components/PatternShop/
  TechnicalRequirementsSection.tsx  (section in left panel)
  CreateTechnicalRequirementDialog.tsx (create dialog)

lib/
  api/
    technicalRequirements.ts        (API client)
  technicalRequirements/
    templates.ts                    (category templates)

app/api/projects/[projectId]/
  technical-requirements/
    route.ts                        (GET endpoint)
```

## Acceptance Criteria
- [ ] Technical Requirements section appears in left panel below feature tree
- [ ] Section collapsed by default with category count badges
- [ ] Clicking category header expands/collapses that category
- [ ] Creating new requirement shows category selector
- [ ] New requirement created with appropriate template
- [ ] Technical requirement appears in correct category
- [ ] Clicking requirement loads it in center panel
- [ ] Requirement can be edited with same editor as FRDs
- [ ] Can delete technical requirement
- [ ] GET /api/projects/[projectId]/technical-requirements returns grouped by category
- [ ] Agent gap detection suggests technical requirements (Phase 040)

## Testing Instructions

1. **Test display:**
   - Open Pattern Shop
   - Verify Technical Requirements section visible in left panel
   - Verify 4 category headers (collapsed)

2. **Test expand/collapse:**
   - Click "Authentication & Security"
   - Verify section expands showing requirements
   - Click again to collapse

3. **Test create:**
   - Click "+ Add Requirement" under a category
   - Select category
   - Enter title and description
   - Click Create
   - Verify requirement appears in that category

4. **Test editing:**
   - Click on technical requirement
   - Verify it opens in center panel editor
   - Edit content
   - Verify auto-save works

5. **Test API:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/projects/xyz/technical-requirements"
   ```
   Verify response is grouped by category.

6. **Test agent integration:**
   - Run gap detection that suggests technical requirement
   - Verify agent response recognizes non-functional requirement
   - Accept agent's suggestion
   - Verify it creates in Technical Requirements section

## Dependencies
- Phase 026: Database schema
- Phase 027: Pattern Shop layout
- Phase 033: Requirements documents
- Phase 034: Requirements editor
- Phase 040: Gap detection (for technical req suggestions)

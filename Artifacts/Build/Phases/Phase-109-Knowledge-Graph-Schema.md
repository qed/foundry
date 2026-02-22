# Phase 109 - Knowledge Graph Schema

## Objective
Create database schema for entity connection tracking enabling visualization of relationships between ideas, features, blueprints, work orders, feedback, and artifacts across the knowledge base.

## Prerequisites
- Phase 002 (Project Schema & Core Tables) completed
- All entity creation phases completed (ideas, features, blueprints, work orders, feedback)

## Context
As projects grow, understanding how entities relate to each other becomes critical. The knowledge graph captures explicit manual connections and auto-detected relationships from document references. This enables discovery, impact analysis, and comprehensive project visualization.

## Detailed Requirements

### Database Schema

#### entity_connections table
```sql
CREATE TABLE entity_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  connection_type VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_auto_detected BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, target_type, target_id, connection_type),
  CHECK (source_type IN ('idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact')),
  CHECK (target_type IN ('idea', 'feature', 'blueprint', 'work_order', 'feedback', 'artifact')),
  CHECK (connection_type IN ('references', 'depends_on', 'relates_to', 'implements', 'derived_from', 'conflicts_with', 'complements'))
);

CREATE INDEX idx_entity_connections_source ON entity_connections(source_type, source_id);
CREATE INDEX idx_entity_connections_target ON entity_connections(target_type, target_id);
CREATE INDEX idx_entity_connections_project ON entity_connections(project_id);
CREATE INDEX idx_entity_connections_created_at ON entity_connections(created_at DESC);
CREATE INDEX idx_entity_connections_auto_detected ON entity_connections(is_auto_detected);
```

### Connection Types

#### references
- Source mentions or references target
- Example: Feature references Design System artifact
- Direction: unidirectional, can be auto-detected

#### depends_on
- Source depends on target for implementation
- Example: Feature depends_on API blueprint
- Direction: unidirectional, typically manual

#### relates_to
- Source is related to target conceptually
- Example: Feature relates_to similar feature in different module
- Direction: can be bidirectional
- Usually manual connection

#### implements
- Source implements requirements in target
- Example: Feature implements Requirement
- Direction: unidirectional, can be auto-detected

#### derived_from
- Source is derived or extended from target
- Example: Feature derived_from initial idea
- Direction: unidirectional, typically manual

#### conflicts_with
- Source conflicts with or contradicts target
- Example: Feature conflicts_with another feature
- Direction: bidirectional, manual

#### complements
- Source complements or enhances target
- Example: Feature complements another feature
- Direction: bidirectional, manual

### Metadata Field

#### metadata JSONB Structure
```typescript
interface ConnectionMetadata {
  confidence?: number;          // 0-100 for auto-detected connections
  evidence?: string[];          // Text excerpts showing connection
  reasoning?: string;           // Why connection was created
  tags?: string[];             // Custom tags for grouping
  notes?: string;              // User notes about connection
  detected_method?: string;    // e.g., "keyword_match", "user_specified", "manual_review"
}
```

### Composite Connection Index
Create filtered index for fast queries:

```sql
CREATE INDEX idx_entity_connections_lookup ON entity_connections(
  project_id,
  source_type,
  source_id,
  connection_type
) WHERE is_auto_detected = FALSE;

-- For bi-directional queries
CREATE VIEW bidirectional_connections AS
  SELECT * FROM entity_connections
  UNION ALL
  SELECT
    id, project_id, target_type, target_id, source_type, source_id,
    connection_type, created_by, is_auto_detected, metadata, created_at, updated_at
  FROM entity_connections
  WHERE connection_type IN ('relates_to', 'conflicts_with', 'complements');
```

## Entity Relationship Patterns

### Common Connection Patterns

#### Idea → Feature → Blueprint → Work Order
```
Idea (concept)
  ├─ implements → Feature (in one module)
  ├─ implements → Feature (in another module)
  └─ relates_to → Idea (similar concept)

Feature
  ├─ depends_on → Blueprint (technical design)
  ├─ depends_on → Artifact (brand guidelines, API spec)
  └─ complements → Feature (in different module)

Blueprint
  ├─ implements → Feature
  ├─ depends_on → Blueprint (other technical designs)
  └─ complements → Blueprint

Work Order
  ├─ implements → Feature
  ├─ implements → Blueprint requirement
  └─ depends_on → Artifact (design reference)
```

#### Feedback Loop
```
Feedback
  ├─ relates_to → Feature (feedback on feature)
  ├─ relates_to → Work Order (feedback on implementation)
  └─ derived_from → User testing results
```

## Connection Operations

### Query Examples

#### Get All Outbound Connections
```sql
SELECT * FROM entity_connections
WHERE source_type = $1 AND source_id = $2
ORDER BY created_at DESC;
```

#### Get All Inbound Connections
```sql
SELECT * FROM entity_connections
WHERE target_type = $1 AND target_id = $2
ORDER BY created_at DESC;
```

#### Get Connected Component (All Related Entities)
```sql
-- Recursive CTE to find all connected entities
WITH RECURSIVE connected AS (
  SELECT source_type, source_id, target_type, target_id, connection_type, 1 as depth
  FROM entity_connections
  WHERE project_id = $1 AND source_type = $2 AND source_id = $3
  UNION ALL
  SELECT ec.source_type, ec.source_id, ec.target_type, ec.target_id, ec.connection_type, c.depth + 1
  FROM entity_connections ec
  JOIN connected c ON ec.source_type = c.target_type AND ec.source_id = c.target_id
  WHERE c.depth < 5  -- Limit recursion depth
)
SELECT DISTINCT target_type, target_id FROM connected;
```

#### Find Conflicts
```sql
SELECT ec1.source_type, ec1.source_id, ec2.source_type, ec2.source_id
FROM entity_connections ec1
JOIN entity_connections ec2 ON ec1.target_id = ec2.target_id
WHERE ec1.project_id = $1
  AND ec1.connection_type = 'conflicts_with'
  AND ec1.source_id != ec2.source_id;
```

## File Structure
```
src/
├── lib/
│   ├── knowledge-graph/
│   │   ├── schema.ts           (schema types)
│   │   ├── queries.ts          (fetch connections)
│   │   ├── mutations.ts        (create/update/delete)
│   │   ├── traversal.ts        (graph traversal algorithms)
│   │   └── analysis.ts         (graph analysis - cycles, clusters)
│   └── types/
│       └── knowledge-graph.ts  (TypeScript types)
└── app/api/
    └── connections/
        ├── route.ts            (GET/POST)
        ├── [id]/
        │   ├── route.ts        (PATCH/DELETE)
        │   └── validate/
        │       └── route.ts    (check if connection valid)
        └── analyze/
            └── route.ts        (analyze graph)
```

## API Routes

### GET /api/connections
List connections (filter by source or target):

```
Query params:
- project_id: string (required)
- source_type?: string
- source_id?: string
- target_type?: string
- target_id?: string
- connection_type?: string
- is_auto_detected?: boolean

Response:
{
  connections: [
    {
      id: string,
      source: { type, id },
      target: { type, id },
      connection_type: string,
      created_by: { id, name },
      is_auto_detected: boolean,
      metadata: object,
      created_at: string
    }
  ],
  total_count: number
}
```

### POST /api/connections
Create connection:

```
Headers: Authorization: Bearer token

Body:
{
  project_id: string,
  source_type: string,
  source_id: string,
  target_type: string,
  target_id: string,
  connection_type: string,
  metadata?: object
}

Response:
{
  id: string,
  created_at: string
}

Errors:
- 400: Invalid entity types or connection type
- 409: Connection already exists
```

### PATCH /api/connections/[id]
Update connection metadata:

```
Body:
{
  metadata?: object,
  connection_type?: string
}

Response:
{
  id: string,
  updated_at: string
}
```

### DELETE /api/connections/[id]
Delete connection:

```
Response: { success: true }
```

### GET /api/connections/related-entities
Get all entities related to source (recursive):

```
Query params:
- source_type: string
- source_id: string
- project_id: string
- depth?: number (default 3, max 5)
- connection_types?: string[] (filter by types)

Response:
{
  entities: [
    {
      type: string,
      id: string,
      name: string,
      path: [{ type, id, connection_type }]  // Path from source
    }
  ]
}
```

## Acceptance Criteria
- [ ] entity_connections table created with proper constraints
- [ ] Unique constraint prevents duplicate connections
- [ ] All connection types supported and validated
- [ ] Metadata JSONB field stores connection details
- [ ] Indexes created for performance
- [ ] Bidirectional connections view works
- [ ] Query performance acceptable (< 200ms for typical graphs)
- [ ] API endpoints functional for CRUD operations
- [ ] Permission checks prevent cross-project connections
- [ ] Can query outbound connections
- [ ] Can query inbound connections
- [ ] Can query all related entities (recursive)
- [ ] Auto-detected flag tracks connection origin
- [ ] Can filter by auto-detected vs manual
- [ ] Timestamps track creation and updates
- [ ] Works for all entity types
- [ ] Conflict detection queries work
- [ ] Circular reference detection possible
- [ ] Schema extensible for future connection types
- [ ] Documentation clear on connection semantics

## Testing Instructions

### Database Tests
```sql
-- Create connection
INSERT INTO entity_connections
  (project_id, source_type, source_id, target_type, target_id,
   connection_type, created_by)
VALUES
  ('{project-id}', 'feature', '{feature-id}',
   'blueprint', '{blueprint-id}', 'depends_on', '{user-id}');

-- Test unique constraint
INSERT INTO entity_connections
  (project_id, source_type, source_id, target_type, target_id,
   connection_type, created_by)
VALUES
  ('{project-id}', 'feature', '{feature-id}',
   'blueprint', '{blueprint-id}', 'depends_on', '{user-id}');
-- Should fail

-- Test bidirectional view
SELECT * FROM bidirectional_connections
WHERE source_id = '{entity-id}';

-- Test recursive related entities
WITH RECURSIVE connected AS (
  SELECT target_type, target_id, 1 as depth
  FROM entity_connections
  WHERE source_type = 'feature' AND source_id = '{feature-id}'
  UNION ALL
  SELECT ec.target_type, ec.target_id, c.depth + 1
  FROM entity_connections ec
  JOIN connected c ON ec.source_type = c.target_type AND ec.source_id = c.target_id
  WHERE c.depth < 3
)
SELECT DISTINCT target_type, target_id FROM connected;
```

### API Tests
```bash
# Create connection
curl -X POST http://localhost:3000/api/connections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "project_id": "{project-id}",
    "source_type": "feature",
    "source_id": "{feature-id}",
    "target_type": "blueprint",
    "target_id": "{blueprint-id}",
    "connection_type": "depends_on"
  }'

# Get connections for entity
curl "http://localhost:3000/api/connections?source_type=feature&source_id={feature-id}&project_id={project-id}"

# Get related entities
curl "http://localhost:3000/api/connections/related-entities?source_type=feature&source_id={feature-id}&project_id={project-id}&depth=3"
```

### Manual Testing
1. Create feature, blueprint, and work order
2. Create "depends_on" connection: Feature → Blueprint
3. Create "implements" connection: Work Order → Feature
4. Query connections for feature and verify both appear
5. Query related entities for feature
6. Verify blueprint and work order both appear
7. Create bidirectional "relates_to" connection
8. Query connections and verify both directions work
9. Test conflict detection with opposing features
10. Create chain: Idea → Feature → Blueprint → Work Order
11. Query related entities with depth=4 and verify all appear
12. Test auto-detected flag on auto-created connections (Phase 111)
13. Edit connection metadata
14. Delete connection and verify removed
15. Test connection validation (invalid types)

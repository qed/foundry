# Phase 112 - Manual Entity Linking

## Objective
Implement UI for manually creating, editing, and removing entity connections with search-based entity selection and connection type specification.

## Prerequisites
- Phase 109 (Knowledge Graph Schema) completed
- Phase 110 (Knowledge Graph Explorer Panel) completed
- All entity detail views completed

## Context
While auto-detection is valuable, users need ability to manually create connections that might be contextual or not obvious from document content. A dedicated linking dialog provides intuitive interface for connecting any two entities.

## Detailed Requirements

### Manual Link Dialog

#### LinkEntityDialog Component
```typescript
interface LinkEntityDialogProps {
  sourceType: 'idea' | 'feature' | 'blueprint' | 'work_order' | 'feedback' | 'artifact';
  sourceId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (connection: EntityConnection) => void;
}

export function LinkEntityDialog({
  sourceType,
  sourceId,
  projectId,
  isOpen,
  onClose,
  onCreate,
}: LinkEntityDialogProps) {
  // Step 1: Search for target entity
  // Step 2: Select connection type
  // Step 3: Confirm and create
}
```

### Three-Step Flow

#### Step 1: Entity Search
- Search input with placeholder: "Search entities to link..."
- Search across all entity types: ideas, features, blueprints, work orders, feedback, artifacts
- Real-time results (debounce 300ms)
- Show: entity name, type (icon), status (if applicable)
- Max 20 results shown
- Exclude source entity itself
- Exclude already-connected entities (show "already linked" note)

#### SearchResults Component
```typescript
interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  onSelect: (result: SearchResult) => void;
}

export function SearchResults({
  query,
  results,
  isLoading,
  onSelect,
}: SearchResultsProps) {
  // Shows matching entities
  // Type icon, name, brief description
  // Click to select
}
```

#### Step 2: Connection Type Selection
After selecting target entity:
- Show both entities: Source → Target
- Dropdown to select connection type
- Description of each type:
  - "references": Source mentions or references target
  - "implements": Source implements requirements in target
  - "depends_on": Source depends on target for implementation
  - "relates_to": Source is conceptually related to target
  - "derived_from": Source is derived from target
  - "conflicts_with": Source conflicts with target
  - "complements": Source complements or enhances target

#### ConnectionTypeSelector Component
```typescript
interface ConnectionTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
  sourceType: string;
  targetType: string;
  isLoading?: boolean;
}

export function ConnectionTypeSelector({
  value,
  onChange,
  sourceType,
  targetType,
  isLoading = false,
}: ConnectionTypeSelectorProps) {
  // Dropdown with connection type options
  // Each option has description
  // Greyed out irrelevant options based on entity types
}
```

#### Step 3: Confirmation
- Show summary:
  - Source: [icon] [name] ([type])
  - Connection: → [connection_type] →
  - Target: [icon] [name] ([type])
- Buttons: "Create Link" (primary), "Back" (secondary), "Cancel"
- Loading state while creating

### Connection Type Filtering

#### Smart Type Suggestions
Some connection types only make sense for certain entity combinations:
- Implements: Feature/Blueprint → Requirement/Idea
- Depends_on: Feature/Work Order → Feature/Blueprint
- Relates_to: Any → Any
- References: Any → Any
- Derived_from: Idea/Feature → Idea
- Conflicts_with: Feature → Feature
- Complements: Feature → Feature

Implementation:
```typescript
function getSuggestedConnectionTypes(
  sourceType: string,
  targetType: string
): string[] {
  const suggestions: Record<string, Record<string, string[]>> = {
    feature: {
      feature: ['relates_to', 'conflicts_with', 'complements', 'depends_on'],
      blueprint: ['depends_on', 'references'],
      artifact: ['references'],
      idea: ['implements', 'derived_from'],
      requirement_doc: ['implements'],
      work_order: ['depends_on'],
      feedback: ['relates_to'],
    },
    // ... more combinations
  };

  return suggestions[sourceType]?.[targetType] || [
    'references',
    'relates_to',
  ];
}
```

### Remove Link UI

#### In Knowledge Graph Explorer
Each connection shows delete button (trash icon):
- Click shows confirmation: "Remove this connection?"
- Confirm to delete
- Connection removed from graph
- Toast notification

#### RemoveConnectionDialog
```typescript
interface RemoveConnectionDialogProps {
  sourceEntity: Entity;
  targetEntity: Entity;
  connectionType: string;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveConnectionDialog({
  sourceEntity,
  targetEntity,
  connectionType,
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: RemoveConnectionDialogProps) {
  // Confirmation dialog with summary
}
```

### API Integration

#### Search API for Linking
```typescript
// GET /api/entities/search
interface SearchEntitiesQuery {
  project_id: string;
  query: string;
  exclude_type?: string;
  exclude_id?: string;
  limit?: number;
}

interface SearchEntitiesResponse {
  results: Array<{
    type: string;
    id: string;
    name: string;
    description?: string;
    status?: string;
  }>;
  total_count: number;
}
```

## File Structure
```
src/
├── components/
│   ├── knowledge-graph/
│   │   ├── LinkEntityDialog.tsx
│   │   ├── EntitySearchResults.tsx
│   │   ├── ConnectionTypeSelector.tsx
│   │   ├── RemoveConnectionDialog.tsx
│   │   └── LinkSummary.tsx
│   └── shared/
│       └── EntitySearchInput.tsx
├── lib/
│   ├── knowledge-graph/
│   │   ├── linking.ts          (link operations)
│   │   ├── search.ts           (entity search)
│   │   └── validation.ts       (link validation)
│   └── types/
│       └── linking.ts          (TypeScript types)
├── hooks/
│   ├── useEntitySearch.ts      (search hook)
│   └── useLinkEntity.ts        (linking logic hook)
└── app/api/
    ├── entities/
    │   └── search/
    │       └── route.ts        (search endpoint)
    └── connections/
        ├── [id]/
        │   └── route.ts        (DELETE existing connection)
        └── validate/
            └── route.ts        (validate connection before creating)
```

## API Routes

### GET /api/entities/search
Search for entities to link:

```
Query params:
- project_id: string (required)
- query: string (required, min 2 chars)
- exclude_type?: string
- exclude_id?: string
- types?: string[] (filter by entity types)
- limit: number (default 20, max 50)

Response:
{
  results: [
    {
      type: 'feature' | 'idea' | 'blueprint' | 'work_order' | 'feedback' | 'artifact',
      id: string,
      name: string,
      description?: string,
      status?: string,
      already_linked?: boolean
    }
  ],
  total_count: number
}
```

### POST /api/connections/validate
Validate connection before creating:

```
Body:
{
  source_type: string,
  source_id: string,
  target_type: string,
  target_id: string,
  connection_type: string
}

Response:
{
  valid: boolean,
  error?: string,
  warning?: string,
  reason?: string
}

Examples:
- Error: "Cannot create circular reference"
- Warning: "Connection already exists but with different type"
- Error: "Cannot link entity to itself"
```

### DELETE /api/connections/[id]
Delete connection (see Phase 109)

## Validation Rules

### Pre-Creation Checks
```typescript
function validateConnection(
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  connectionType: string
): ValidationResult {
  // Cannot link entity to itself
  if (sourceType === targetType && sourceId === targetId) {
    return {
      valid: false,
      error: 'Cannot link entity to itself',
    };
  }

  // Check for circular references
  if (wouldCreateCircle(sourceId, sourceType, targetId, targetType)) {
    return {
      valid: false,
      error: 'This connection would create a circular reference',
    };
  }

  // Check for duplicates
  if (connectionExists(sourceType, sourceId, targetType, targetId)) {
    return {
      valid: false,
      error: 'This connection already exists',
    };
  }

  return { valid: true };
}
```

## Acceptance Criteria
- [ ] LinkEntityDialog component renders
- [ ] Entity search box functional with real-time results
- [ ] Search excludes source entity
- [ ] Search shows already-linked entities with note
- [ ] Search debounced 300ms
- [ ] Connection type selector shows relevant options
- [ ] Connection type descriptions shown
- [ ] Summary displays source → connection → target
- [ ] Create button initiates API call
- [ ] Dialog closes on success
- [ ] Toast notification shows on success
- [ ] Error handling for failed connections
- [ ] Remove button visible on connections (in explorer)
- [ ] Remove confirmation dialog appears
- [ ] Circular reference prevention working
- [ ] Duplicate connection prevention working
- [ ] Cannot link entity to itself
- [ ] Works for all entity type combinations
- [ ] Mobile responsive
- [ ] Performance: search < 300ms
- [ ] Accessibility: keyboard navigation, ARIA labels

## Testing Instructions

### Entity Search Tests
```typescript
// linking.test.ts
describe('Entity Search', () => {
  it('finds entities by name', async () => {
    const results = await searchEntities(projectId, 'auth');

    expect(results.some(r => r.name.includes('auth'))).toBe(true);
  });

  it('excludes source entity', async () => {
    const results = await searchEntities(projectId, 'feature', {
      exclude_type: 'feature',
      exclude_id: featureId,
    });

    expect(results.some(r => r.id === featureId)).toBe(false);
  });

  it('marks already-linked entities', async () => {
    const results = await searchEntities(projectId, 'blueprint');

    const linkedResult = results.find(r => r.already_linked);
    expect(linkedResult?.already_linked).toBe(true);
  });
});
```

### Validation Tests
```typescript
// validation.test.ts
describe('Connection Validation', () => {
  it('prevents self-linking', () => {
    const result = validateConnection('feature', featureId, 'feature', featureId, 'relates_to');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('itself');
  });

  it('prevents circular references', () => {
    // Create A → B → C
    // Try to create C → A (would form circle)
    const result = validateConnection('feature', cId, 'feature', aId, 'depends_on');
    expect(result.valid).toBe(false);
  });

  it('prevents duplicate connections', () => {
    // Connection already exists
    const result = validateConnection('feature', featureId, 'blueprint', blueprintId, 'depends_on');
    expect(result.valid).toBe(false);
  });
});
```

### Component Tests
```typescript
// LinkEntityDialog.test.tsx
describe('LinkEntityDialog', () => {
  it('searches entities on input', async () => {
    const { getByPlaceholderText, getByText } = render(
      <LinkEntityDialog
        sourceType="feature"
        sourceId={featureId}
        projectId={projectId}
        isOpen={true}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    const input = getByPlaceholderText('Search entities');
    await userEvent.type(input, 'blueprint');

    await waitFor(() => {
      expect(getByText('Sample Blueprint')).toBeInTheDocument();
    });
  });

  it('selects connection type after entity selection', async () => {
    const { getByText, getByDisplayValue } = render(
      <LinkEntityDialog {...props} />
    );

    // Select entity
    await userEvent.click(getByText('Sample Blueprint'));

    // Verify connection type selector shown
    expect(getByText(/Connection Type/)).toBeInTheDocument();
  });

  it('creates connection on confirm', async () => {
    const onCreate = vi.fn();
    const { getByText } = render(
      <LinkEntityDialog
        {...props}
        onCreate={onCreate}
      />
    );

    // ... select entity and type

    await userEvent.click(getByText('Create Link'));

    expect(onCreate).toHaveBeenCalled();
  });
});
```

### Integration Tests
```bash
# Search entities
curl "http://localhost:3000/api/entities/search?project_id={project-id}&query=blueprint"

# Validate connection
curl -X POST http://localhost:3000/api/connections/validate \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "feature",
    "source_id": "{feature-id}",
    "target_type": "blueprint",
    "target_id": "{blueprint-id}",
    "connection_type": "depends_on"
  }'

# Delete connection
curl -X DELETE http://localhost:3000/api/connections/{connection-id} \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Navigate to feature detail view
2. Click "Link Entity" or "+" button in Knowledge Graph Explorer
3. Type in search box to find entity
4. Verify search results show matching entities
5. Click entity to select it
6. Verify connection type selector appears
7. Select a connection type
8. Review summary
9. Click "Create Link"
10. Verify connection appears in Knowledge Graph Explorer
11. Try to create duplicate connection → error
12. Try to link entity to itself → error
13. Create chain A → B → C
14. Try to create C → A → error (circular)
15. Remove connection via Knowledge Graph Explorer
16. Verify confirmation dialog
17. Confirm removal
18. Verify connection removed
19. Test with all entity type combinations
20. Test on mobile viewport

# Phase 111 - Auto-Connection Detection

## Objective
Implement automatic detection and creation of entity connections when documents reference other entities by name or @mention, with user confirmation workflow.

## Prerequisites
- Phase 109 (Knowledge Graph Schema) completed
- Phase 110 (Knowledge Graph Explorer Panel) completed
- Phase 106 (@Mentions System) completed
- Document editors functional

## Context
Manual connection creation is laborious. Auto-detection scans document content for references to other entities and suggests connections for user confirmation, reducing manual work while maintaining accuracy control.

## Detailed Requirements

### Auto-Detection Triggers

#### When Scanning Occurs
1. Requirements document saved
2. Blueprint saved
3. Work order description/notes updated
4. Feedback description saved
5. Idea description saved
6. Any document content change (debounced 5 seconds after save)

#### What Gets Scanned
- Document title
- Document content body
- Comments on document
- @mentions in any of above

### Reference Detection Methods

#### Method 1: @Mentions
- Explicit mentions: @[entity_name](type:id)
- Already parsed (Phase 106)
- Create connection immediately with is_auto_detected=true

#### Method 2: Entity Name Matching
- Search document for exact matches of other entity names
- Case-insensitive matching
- Ignore partial matches in middle of words (use word boundaries)
- Filter: only match against entities in same project

```typescript
function findEntityReferences(content: string, projectId: string) {
  // Get all entities in project with their names
  const entities = await getProjectEntities(projectId);

  const references: Reference[] = [];

  for (const entity of entities) {
    // Create word-boundary regex: \b{entity.name}\b
    const regex = new RegExp(`\\b${escapeRegex(entity.name)}\\b`, 'gi');
    const matches = [...content.matchAll(regex)];

    if (matches.length > 0) {
      references.push({
        entity_type: entity.type,
        entity_id: entity.id,
        entity_name: entity.name,
        match_count: matches.length,
        match_positions: matches.map(m => m.index),
        confidence: Math.min(100, matches.length * 25), // More matches = higher confidence
      });
    }
  }

  return references;
}
```

#### Method 3: Keyword Matching (Advanced)
- Keywords associated with entity types:
  - Feature mentions: "feature", "functionality", "capability"
  - Work order mentions: "task", "ticket", "do", "implement"
  - Blueprint mentions: "design", "architecture", "system"
  - Artifact mentions: "document", "file", "specification"
- Not recommended as primary method due to high false positives
- Use as secondary filter for confidence scoring

### Confidence Scoring

#### Confidence Calculation
```typescript
interface DetectedConnection {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  connection_type: string;  // inferred or 'references' default
  confidence: number;        // 0-100
  evidence: string[];        // Matching text excerpts
}

function calculateConfidence(detection: Detection): number {
  let score = 0;

  // Method 1: @mention (highest confidence)
  if (detection.method === 'mention') {
    return 100;
  }

  // Method 2: Exact name match
  if (detection.method === 'exact_match') {
    score = 70; // Base score
    score += Math.min(20, detection.match_count * 10); // More matches increase confidence
  }

  // Reduce confidence if same entity appears many times (might be common word)
  if (detection.match_count > 10) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}
```

### Connection Type Inference

#### Inferring Connection Type
Default: 'references'

Can infer based on context keywords:
- "implements": "implement", "fulfills", "realizes", "develops", "builds"
- "depends_on": "depends on", "requires", "uses", "leverages", "based on"
- "relates_to": "related", "similar", "associated", "connected"
- "complements": "complements", "enhances", "augments", "extends"

```typescript
function inferConnectionType(context: string): string {
  const implementKeywords = ['implement', 'fulfill', 'realize', 'develop', 'build'];
  const dependsKeywords = ['depend on', 'require', 'use', 'leverage', 'based on'];
  const complementKeywords = ['complement', 'enhance', 'augment', 'extend'];

  const lowerContext = context.toLowerCase();

  if (implementKeywords.some(k => lowerContext.includes(k))) {
    return 'implements';
  }
  if (dependsKeywords.some(k => lowerContext.includes(k))) {
    return 'depends_on';
  }
  if (complementKeywords.some(k => lowerContext.includes(k))) {
    return 'complements';
  }

  return 'references';
}
```

### User Confirmation Workflow

#### Auto-Detection Dialog
When document saved with detected connections:
1. Show modal: "X possible connections detected"
2. List each suggestion with:
   - Target entity name and type
   - Confidence score (visual bar)
   - Connection type (with ability to change)
   - Evidence snippet showing matching text
   - Checkbox to include/exclude
3. Actions:
   - "Create Selected" button
   - "Review & Manually Edit" link
   - "Dismiss All" button
4. Dismissing marks suggestions as reviewed (store in dismiss history)

#### SuggestionCard Component
```typescript
interface SuggestionCardProps {
  suggestion: DetectedConnection;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onChangeType?: (newType: string) => void;
}

export function SuggestionCard({
  suggestion,
  checked,
  onToggle,
  onChangeType,
}: SuggestionCardProps) {
  // Shows entity icon, name, type
  // Confidence bar (0-100)
  // Evidence text snippet
  // Connection type dropdown
  // Checkbox to include/exclude
}
```

#### AutoConnectionDialog Component
```typescript
interface AutoConnectionDialogProps {
  sourceType: string;
  sourceId: string;
  suggestions: DetectedConnection[];
  isOpen: boolean;
  isLoading?: boolean;
  onCreate: (selected: DetectedConnection[]) => void;
  onDismiss: () => void;
  onReview?: () => void;
}

export function AutoConnectionDialog({
  sourceType,
  sourceId,
  suggestions,
  isOpen,
  isLoading = false,
  onCreate,
  onDismiss,
  onReview,
}: AutoConnectionDialogProps) {
  // Dialog showing all suggestions
  // Checkboxes to select/deselect
  // Create and Dismiss buttons
}
```

### Detection & Suggestion Job

#### Process
```typescript
async function scanDocumentForReferences(
  documentId: string,
  documentType: string,
  projectId: string
) {
  // Get document content
  const document = await getDocument(documentId);

  // Find references
  const mentions = extractMentions(document.content);
  const nameMatches = findEntityReferences(document.content, projectId);

  const detections: DetectedConnection[] = [];

  // Process mentions (highest confidence)
  for (const mention of mentions) {
    if (mention.type === 'user') continue; // Skip user mentions

    detections.push({
      source_type: documentType,
      source_id: documentId,
      target_type: mention.type,
      target_id: mention.id,
      connection_type: 'references',
      confidence: 100,
      evidence: [mention.name],
      method: 'mention',
    });
  }

  // Process name matches
  for (const match of nameMatches) {
    // Don't duplicate if already in mentions
    if (detections.some(d => d.target_id === match.entity_id)) continue;

    // Skip low confidence matches
    const confidence = calculateConfidence(match);
    if (confidence < 50) continue;

    const connectionType = inferConnectionType(
      getContextAround(document.content, match.match_positions[0], 100)
    );

    detections.push({
      source_type: documentType,
      source_id: documentId,
      target_type: match.entity_type,
      target_id: match.entity_id,
      connection_type: connectionType,
      confidence,
      evidence: match.evidenceSnippets,
      method: 'name_match',
    });
  }

  // Check for existing connections
  const existing = await getConnections(documentId, documentType);
  const newDetections = detections.filter(
    d =>
      !existing.some(
        e =>
          e.target_type === d.target_type &&
          e.target_id === d.target_id &&
          e.connection_type === d.connection_type
      )
  );

  // Store suggestions
  if (newDetections.length > 0) {
    await storeSuggestions(documentId, documentType, newDetections);

    // Notify user (trigger notification or show modal)
    await notifyUserOfSuggestions(document.owner_id, newDetections);
  }

  return newDetections;
}
```

### Suggestion Storage

#### pending_connections table (Optional)
```sql
CREATE TABLE pending_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  connection_type VARCHAR(50) NOT NULL,
  confidence INTEGER,
  evidence JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Or store in-memory with Redis for session-based suggestions.

## File Structure
```
src/
├── components/
│   ├── knowledge-graph/
│   │   ├── AutoConnectionDialog.tsx
│   │   ├── SuggestionCard.tsx
│   │   ├── ConfidenceBar.tsx
│   │   └── EvidenceSnippet.tsx
│   └── dialogs/
│       └── ConfirmAutoConnectionsDialog.tsx
├── lib/
│   ├── knowledge-graph/
│   │   ├── detection.ts        (reference detection)
│   │   ├── inference.ts        (connection type inference)
│   │   ├── confidence.ts       (scoring algorithm)
│   │   └── scanner.ts          (scan documents)
│   └── types/
│       └── detection.ts        (TypeScript types)
├── jobs/
│   └── reference-scanner.ts    (background job)
└── app/api/
    ├── documents/
    │   └── [id]/
    │       └── scan-references/
    │           └── route.ts
    └── connections/
        ├── suggestions/
        │   ├── route.ts        (GET/POST suggestions)
        │   └── [id]/
        │       └── accept/
        │           └── route.ts
```

## API Routes

### POST /api/documents/[id]/scan-references
Trigger reference scan on document:

```
Headers: Authorization: Bearer token

Response:
{
  suggestions: [
    {
      id: string,
      target_type: string,
      target_id: string,
      target_name: string,
      connection_type: string,
      confidence: number,
      evidence: string[]
    }
  ],
  count: number
}
```

### GET /api/connections/suggestions
Get pending suggestions for user:

```
Query params:
- status: 'pending' | 'accepted' | 'rejected' (default: 'pending')
- project_id?: string

Response:
{
  suggestions: [
    {
      id: string,
      source: { type, id, name },
      target: { type, id, name },
      confidence: number,
      created_at: string
    }
  ]
}
```

### POST /api/connections/suggestions/[id]/accept
Accept suggestion and create connection:

```
Body:
{
  connection_type?: string  (can override inferred type)
}

Response:
{
  success: true,
  connection_id: string
}
```

### POST /api/connections/suggestions/[id]/reject
Reject suggestion:

```
Response:
{
  success: true
}
```

## Acceptance Criteria
- [ ] Reference scanning triggered on document save
- [ ] @mentions detected and converted to connections (100% confidence)
- [ ] Entity name matches detected with word boundary regex
- [ ] Confidence scoring calculates 0-100 correctly
- [ ] Connection type inference working
- [ ] AutoConnectionDialog renders suggestions
- [ ] User can select/deselect suggestions
- [ ] User can change connection type per suggestion
- [ ] Create button creates all selected connections
- [ ] Dismiss button dismisses suggestions without creating
- [ ] Low confidence matches (< 50) filtered out
- [ ] Existing connections not suggested again
- [ ] Evidence snippets show context
- [ ] Confidence bar visual representation clear
- [ ] Performance: scanning < 1 second for typical docs
- [ ] Works for all document types
- [ ] Auto-detected connections marked appropriately
- [ ] User can review and manually edit
- [ ] Dismiss history prevents repeated suggestions
- [ ] Email notification on suggestions (integration with Phase 108)

## Testing Instructions

### Detection Algorithm Tests
```typescript
// detection.test.ts
describe('Reference Detection', () => {
  it('detects entity name matches', () => {
    const content = 'This feature relates to User Authentication and email verification';
    const entities = [
      { id: '1', name: 'User Authentication', type: 'feature' },
      { id: '2', name: 'Email Verification', type: 'feature' },
    ];

    const references = findEntityReferences(content, entities);

    expect(references.length).toBe(2);
    expect(references[0].entity_id).toBe('1');
  });

  it('uses word boundaries to avoid partial matches', () => {
    const content = 'Authentication is important for user auth';
    const entities = [
      { id: '1', name: 'User Auth', type: 'feature' },
    ];

    const references = findEntityReferences(content, entities);

    // Should not match "auth" as part of "authentication"
    expect(references.length).toBe(1);
  });

  it('calculates confidence correctly', () => {
    const mention = { method: 'mention' };
    expect(calculateConfidence(mention)).toBe(100);

    const nameMatch = {
      method: 'exact_match',
      match_count: 2,
    };
    expect(calculateConfidence(nameMatch)).toBeGreaterThan(80);
  });

  it('infers connection type from context', () => {
    const context = 'This feature implements the authentication system';
    expect(inferConnectionType(context)).toBe('implements');

    const context2 = 'Depends on the database schema';
    expect(inferConnectionType(context2)).toBe('depends_on');
  });
});
```

### Component Tests
```typescript
// AutoConnectionDialog.test.tsx
describe('AutoConnectionDialog', () => {
  it('displays all suggestions', () => {
    const suggestions = [
      { target_name: 'Feature A', confidence: 90 },
      { target_name: 'Feature B', confidence: 75 },
    ];

    const { getByText } = render(
      <AutoConnectionDialog
        suggestions={suggestions}
        onCreate={vi.fn()}
        onDismiss={vi.fn()}
        isOpen={true}
      />
    );

    expect(getByText('Feature A')).toBeInTheDocument();
    expect(getByText('Feature B')).toBeInTheDocument();
  });

  it('creates selected connections', async () => {
    const onCreate = vi.fn();
    const { getByText, getByRole } = render(
      <AutoConnectionDialog
        suggestions={[...]}
        onCreate={onCreate}
        onDismiss={vi.fn()}
        isOpen={true}
      />
    );

    await userEvent.click(getByRole('checkbox', { name: /Feature A/ }));
    await userEvent.click(getByText('Create Selected'));

    expect(onCreate).toHaveBeenCalled();
  });
});
```

### Integration Tests
```bash
# Scan document
curl -X POST http://localhost:3000/api/documents/{doc-id}/scan-references \
  -H "Authorization: Bearer {token}"

# Get suggestions
curl http://localhost:3000/api/connections/suggestions?status=pending

# Accept suggestion
curl -X POST http://localhost:3000/api/connections/suggestions/{suggestion-id}/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"connection_type": "implements"}'
```

### Manual Testing
1. Create feature named "User Authentication"
2. Create blueprint named "Database Schema"
3. Create requirement document mentioning both
4. Save document
5. Verify AutoConnectionDialog appears
6. Check that both entities suggested
7. Verify confidence scores shown
8. Verify connection types inferred
9. Select both and click "Create Selected"
10. Verify connections created in Knowledge Graph
11. Open document again
12. Verify same suggestions not suggested twice
13. Manually dismiss suggestion
14. Verify doesn't appear again
15. Test with @mentions (should show 100% confidence)
16. Test with entity name appearing multiple times (higher confidence)
17. Test with similar but not exact matches (should not suggest)
18. Test low confidence matches filtered (< 50)

# Phase 099 - Artifact Linking to Entities

## Objective
Enable artifacts to be linked to any entity (ideas, features, blueprints, work orders, feedback) via reference system and @mentions in editors.

## Prerequisites
- Phase 097 (Artifact Upload UI) completed
- Phase 096 (Artifacts Schema) completed
- Editor components from Hall, Pattern Shop, Control Room, Assembly Floor modules

## Context
Users need to connect uploaded artifacts to specific entities across all modules. For example, linking a brand guideline PDF to a feature, or an architectural diagram to a blueprint. The @mention system allows natural reference via editor typing.

## Detailed Requirements

### Database Schema

#### artifact_entity_links table
Create polymorphic linking table:

```sql
CREATE TABLE artifact_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artifact_id, entity_type, entity_id),
  CHECK (entity_type IN ('idea', 'feature', 'blueprint', 'work_order', 'feedback'))
);

CREATE INDEX idx_artifact_entity_links_artifact ON artifact_entity_links(artifact_id);
CREATE INDEX idx_artifact_entity_links_entity ON artifact_entity_links(entity_type, entity_id);
CREATE INDEX idx_artifact_entity_links_created_by ON artifact_entity_links(created_by);
```

### @Mention System Integration

#### Editor Enhancement
All editors (requirements, blueprints, work orders, etc.) support @mentions:
- Type "@" anywhere in editor content
- Autocomplete dropdown shows all artifacts in project
- Filtered by: artifact name, file_type, recently used
- Click or press Enter to insert reference
- Reference rendered as styled chip/tag

#### Reference Format
```markdown
# Rich Text Format
User typed: "See @Brand Guidelines.pdf for design system"
Rendered as: "See [Brand Guidelines.pdf](artifact:uuid)" with styling

# Plain Text Storage
Stored in database as mention reference with artifact UUID
```

### Linked Artifacts Display

#### Entity Detail Views
All entity detail pages show linked artifacts section:
- "Linked Artifacts" panel below main content
- Shows grid/list of linked artifacts with previews
- Open preview action on each
- Remove link button (visible to users who created link)
- "Link Artifact" button to add new links

#### Quick View Card
In entity listings/cards, show artifact count badge:
- "📎 3 artifacts linked"
- Click to expand and show artifact list
- Quick delete option

### Linking UI

#### LinkArtifactModal Component
```typescript
interface LinkArtifactModalProps {
  entityType: 'idea' | 'feature' | 'blueprint' | 'work_order' | 'feedback';
  entityId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onLink: (artifactId: string) => void;
}

export function LinkArtifactModal({
  entityType,
  entityId,
  projectId,
  isOpen,
  onClose,
  onLink,
}: LinkArtifactModalProps) {
  // Modal showing searchable list of artifacts
  // Allows selecting artifact to link
}
```

#### LinkedArtifacts Component
```typescript
interface LinkedArtifactsProps {
  entityType: 'idea' | 'feature' | 'blueprint' | 'work_order' | 'feedback';
  entityId: string;
  projectId: string;
  editable?: boolean;
  onLinkRemoved?: (artifactId: string) => void;
}

export function LinkedArtifacts({
  entityType,
  entityId,
  projectId,
  editable = false,
  onLinkRemoved,
}: LinkedArtifactsProps) {
  // Display linked artifacts with preview thumbnails
  // Show remove button if editable
  // "Link Artifact" button to add more
}
```

#### ArtifactMentionPopover Component
```typescript
interface ArtifactMentionPopoverProps {
  projectId: string;
  query: string;
  position: { x: number; y: number };
  onSelect: (artifact: Artifact) => void;
}

export function ArtifactMentionPopover({
  projectId,
  query,
  position,
  onSelect,
}: ArtifactMentionPopoverProps) {
  // Dropdown showing matching artifacts as user types @
  // Filtered by name and type
}
```

## File Structure
```
src/
├── components/
│   ├── artifacts/
│   │   ├── LinkArtifactModal.tsx
│   │   ├── LinkedArtifacts.tsx
│   │   ├── LinkedArtifactCard.tsx
│   │   └── ArtifactMentionPopover.tsx
│   ├── editors/
│   │   ├── MentionPlugin.tsx       (TipTap plugin)
│   │   └── useArtifactMentions.ts  (hook for mention logic)
│   └── dialogs/
│       └── ConfirmUnlinkDialog.tsx
├── lib/
│   ├── artifacts/
│   │   ├── linking.ts             (link/unlink logic)
│   │   └── mentions.ts            (mention parsing & rendering)
│   └── editor-plugins/
│       └── mentionPlugin.ts       (TipTap plugin implementation)
└── app/api/
    └── artifacts/
        └── links/
            ├── route.ts           (CRUD for links)
            └── [id]/
                └── route.ts       (delete specific link)
```

## API Routes

### POST /api/artifacts/links
Create artifact-entity link:
```
Headers: Authorization: Bearer token

Body:
{
  artifact_id: string,
  entity_type: 'idea' | 'feature' | 'blueprint' | 'work_order' | 'feedback',
  entity_id: string
}

Response:
{
  id: string,
  artifact_id: string,
  entity_type: string,
  entity_id: string,
  created_at: string
}

Errors:
- 400: Invalid entity_type
- 404: Artifact or entity not found
- 409: Link already exists
```

### GET /api/artifacts/links?entity_type=idea&entity_id={id}
Get all artifacts linked to entity:
```
Response:
{
  links: [
    {
      id: string,
      artifact_id: string,
      artifact: { id, name, file_type, file_size, storage_path },
      created_by: { id, name, avatar },
      created_at: string
    }
  ]
}
```

### DELETE /api/artifacts/links/[id]
Remove artifact-entity link:
```
Response: { success: true }

Errors:
- 403: User not authorized to remove this link
- 404: Link not found
```

### POST /api/artifacts/mention-search
Search artifacts for @mention autocomplete:
```
Query params:
- project_id: string
- query: string (search term)
- limit: number (default 10)

Response:
{
  artifacts: [
    { id, name, file_type, recently_used_rank }
  ]
}
```

## Editor Integration

### TipTap Plugin Implementation
```typescript
// Create custom TipTap extension for artifact mentions
import { Extension } from '@tiptap/core';

export const ArtifactMention = Extension.create({
  name: 'artifactMention',
  addOptions() {
    return {
      projectId: '',
      onMentionStart: (query: string, position: Position) => {},
      onMentionEnd: () => {},
    };
  },
  addKeyboardShortcuts() {
    return {
      '@': ({ editor }) => {
        // Trigger mention popup on @ key
        return true;
      },
    };
  },
  // Implementation details...
});
```

## Acceptance Criteria
- [ ] artifact_entity_links table created with proper constraints
- [ ] Unique constraint prevents duplicate links
- [ ] Polymorphic entity_type enum validation working
- [ ] @mention detection in editors (all modules)
- [ ] Artifact autocomplete dropdown appears on @
- [ ] Autocomplete filtered by artifact name
- [ ] Recently used artifacts prioritized in list
- [ ] Reference inserted as styled chip on selection
- [ ] LinkArtifactModal component renders
- [ ] Modal searchable list shows project artifacts
- [ ] LinkedArtifacts component shows linked artifacts
- [ ] Preview thumbnails display for linked artifacts
- [ ] Remove link button functional with confirmation
- [ ] "Link Artifact" button opens modal to add links
- [ ] Linked artifact count badge displays on entity cards
- [ ] API endpoints return correct data
- [ ] Auth checks prevent unauthorized linking
- [ ] Deleting artifact removes all links automatically
- [ ] RLS policies prevent cross-project artifact linking
- [ ] All modules (Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab) show linked artifacts

## Testing Instructions

### Database Tests
```sql
-- Test link creation
INSERT INTO artifact_entity_links (artifact_id, entity_type, entity_id, created_by)
VALUES ('{artifact-id}', 'feature', '{feature-id}', '{user-id}');

-- Test unique constraint
INSERT INTO artifact_entity_links (artifact_id, entity_type, entity_id, created_by)
VALUES ('{artifact-id}', 'feature', '{feature-id}', '{user-id}');
-- Should fail with unique constraint error

-- Test entity_type enum validation
INSERT INTO artifact_entity_links (artifact_id, entity_type, entity_id, created_by)
VALUES ('{artifact-id}', 'invalid_type', '{entity-id}', '{user-id}');
-- Should fail with CHECK constraint error
```

### Component Tests
```typescript
// LinkArtifactModal.test.tsx
describe('LinkArtifactModal', () => {
  it('displays list of project artifacts', () => {
    // Verify modal shows artifacts
  });

  it('filters artifacts by search query', async () => {
    // Type in search, verify list filtered
  });

  it('calls onLink with selected artifact', async () => {
    // Click artifact, verify callback
  });
});

// ArtifactMentionPopover.test.tsx
describe('ArtifactMentionPopover', () => {
  it('shows artifacts matching typed query', () => {
    // Type "@brand", verify matching artifacts shown
  });

  it('highlights first result', () => {
    // Verify first result has visual highlight
  });

  it('allows selection via keyboard', async () => {
    // Type "@", press arrow down, press Enter
    // Verify artifact selected
  });
});
```

### Integration Tests
```bash
# Create link
curl -X POST http://localhost:3000/api/artifacts/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "artifact_id": "{artifact-id}",
    "entity_type": "feature",
    "entity_id": "{feature-id}"
  }'

# Get linked artifacts for entity
curl "http://localhost:3000/api/artifacts/links?entity_type=feature&entity_id={feature-id}"

# Search for mention
curl "http://localhost:3000/api/artifacts/mention-search?project_id={project-id}&query=design"

# Remove link
curl -X DELETE http://localhost:3000/api/artifacts/links/{link-id} \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Navigate to any entity detail view (feature, idea, blueprint, etc.)
2. Verify "Linked Artifacts" section appears (initially empty)
3. Click "Link Artifact" button
4. Search and select artifact from modal
5. Verify artifact now appears in "Linked Artifacts" section
6. Click artifact preview to open it
7. Remove link by clicking X button
8. In editor, type "@brand" and verify autocomplete
9. Select artifact from autocomplete
10. Verify reference appears in content
11. Delete artifact and verify links auto-removed
12. Test linking to all entity types: idea, feature, blueprint, work order, feedback

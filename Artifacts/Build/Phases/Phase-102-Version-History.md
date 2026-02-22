# Phase 102 - Document Version History System

## Objective
Implement unified version history tracking for requirements documents and blueprints, enabling users to review, compare, and restore previous document versions.

## Prerequisites
- Phase 034 (Requirements Editor & Management) or similar doc editing phases completed
- Phase 049 (Blueprint Editor) or similar completed
- Phase 002 (Project Schema & Core Tables) completed

## Context
As requirements documents and blueprints evolve, users need to track changes, understand what changed and when, and optionally restore to previous versions. The versioning system should be generic enough to apply to any document type in future phases.

## Detailed Requirements

### Version History Architecture

#### Generic Version Schema
Create unified versioning for document types:

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  content_text TEXT,
  change_summary VARCHAR(500),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (document_type IN ('requirement', 'blueprint')),
  UNIQUE(document_id, version_number)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id, document_type);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);
```

#### Update Document Schema
Add versioning fields to existing documents:

```sql
-- For requirements_documents table (add if not exists)
ALTER TABLE requirements_documents
ADD COLUMN current_version INTEGER DEFAULT 1,
ADD COLUMN version_count INTEGER DEFAULT 1,
ADD COLUMN last_modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- For blueprints table (add if not exists)
ALTER TABLE blueprints
ADD COLUMN current_version INTEGER DEFAULT 1,
ADD COLUMN version_count INTEGER DEFAULT 1,
ADD COLUMN last_modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

### Automatic Version Creation

#### Debounced Snapshots
- On document save, create version snapshot
- Debounce window: 30 seconds (don't create version on every keystroke)
- After debounce expires with unsaved changes, create version
- Version number auto-increments per document
- Store full document content as JSONB snapshot

#### Change Tracking
```typescript
interface VersionSnapshot {
  document_id: string;
  document_type: 'requirement' | 'blueprint';
  content: DocumentContent; // Full document state
  content_text?: string;    // Extracted plaintext for diff
  change_summary?: string;  // Auto-generated or user-provided
  created_by: string;
  created_at: string;
}

// On save:
// 1. Compare new content with last version
// 2. If different: increment version_number
// 3. Store snapshot
// 4. Update document.current_version, updated_at
```

### Version History Panel Component

#### VersionHistoryPanel
```typescript
interface VersionHistoryPanelProps {
  documentId: string;
  documentType: 'requirement' | 'blueprint';
  currentVersion: number;
  onVersionSelect: (version: number) => void;
  onRestore: (version: number) => void;
}

export function VersionHistoryPanel({
  documentId,
  documentType,
  currentVersion,
  onVersionSelect,
  onRestore,
}: VersionHistoryPanelProps) {
  // Shows list of versions with timestamps
  // Highlights current version
  // "View diff", "Restore" buttons per version
}
```

#### VersionListItem
- Version number and timestamp
- Created by user name and avatar
- Change summary (if provided)
- "Current" badge on active version
- Hover shows: Preview, Diff, Restore buttons

### User Interactions

#### Accessing Version History
- Version history button in document header
- Or: side panel toggle "Show History"
- Panel shows version list (newest first)

#### Viewing Version Details
- Click version to preview its content (read-only)
- Preview shows full document at that version state
- User can read but not edit preview

#### Restoring Version
- Click "Restore" button on version
- Confirmation dialog: "Restore version X from [date]? Current content will be saved as new version."
- On confirm: create new version with restored content
- Does not delete history (non-destructive)
- Activity log entry created

## File Structure
```
src/
├── lib/
│   ├── versioning/
│   │   ├── snapshot.ts         (create version snapshots)
│   │   ├── restore.ts          (restore operations)
│   │   └── queries.ts          (version queries)
│   └── types/
│       └── versions.ts         (TypeScript types)
├── components/
│   ├── versioning/
│   │   ├── VersionHistoryPanel.tsx
│   │   ├── VersionListItem.tsx
│   │   ├── VersionPreview.tsx
│   │   └── RestoreConfirmDialog.tsx
│   └── shared/
│       └── VersionHistoryButton.tsx
├── hooks/
│   └── useDocumentVersioning.ts (hook for version management)
├── app/api/
│   └── documents/
│       └── [docId]/
│           └── versions/
│               ├── route.ts    (GET list, POST create)
│               └── [versionNum]/
│                   └── route.ts (GET details, POST restore)
└── jobs/
    └── version-snapshot-worker.ts (debounced snapshot creation)
```

## API Routes

### GET /api/documents/[docId]/versions
List all versions of document:

```
Query params:
- document_type: 'requirement' | 'blueprint'
- limit: number (default 20)
- offset: number (default 0)

Response:
{
  versions: [
    {
      version_number: number,
      created_by: { id, name, avatar },
      created_at: string,
      change_summary: string,
      is_current: boolean,
      content_length: number
    }
  ],
  total_count: number,
  current_version: number
}
```

### GET /api/documents/[docId]/versions/[versionNum]
Get specific version content:

```
Response:
{
  version_number: number,
  document_id: string,
  document_type: string,
  content: DocumentContent,
  created_by: { id, name, avatar },
  created_at: string,
  change_summary: string
}
```

### POST /api/documents/[docId]/versions/[versionNum]/restore
Restore document to specific version:

```
Headers: Authorization: Bearer token

Response:
{
  new_version_number: number,
  restored_from_version: number,
  created_at: string
}

Errors:
- 400: Cannot restore to current version
- 404: Version not found
- 403: Unauthorized
```

## Version Snapshot Logic

### Save Handler
```typescript
class DocumentVersioning {
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastSavedContent: DocumentContent;

  onDocumentChange(newContent: DocumentContent) {
    // Clear previous debounce timer
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Set new debounce timer (30 seconds)
    this.debounceTimer = setTimeout(async () => {
      await this.createVersionSnapshot(newContent);
    }, 30000);
  }

  private async createVersionSnapshot(content: DocumentContent) {
    // Check if content differs from last saved version
    if (isDeepEqual(content, this.lastSavedContent)) {
      return; // No changes, skip version
    }

    // Get current version number
    const doc = await getDocument(this.documentId);
    const newVersionNum = doc.current_version + 1;

    // Create snapshot
    await createVersion({
      document_id: this.documentId,
      document_type: this.documentType,
      version_number: newVersionNum,
      content: content,
      content_text: extractPlainText(content),
      created_by: currentUserId,
    });

    // Update document version pointers
    await updateDocument(this.documentId, {
      current_version: newVersionNum,
      version_count: newVersionNum,
      updated_at: new Date(),
      last_modified_by: currentUserId,
    });

    this.lastSavedContent = content;
  }
}
```

## Acceptance Criteria
- [ ] document_versions table created with proper constraints
- [ ] Version number auto-increments per document
- [ ] Snapshots created on save (debounced 30s)
- [ ] VersionHistoryPanel component renders version list
- [ ] Version list shows newest first
- [ ] Current version highlighted in list
- [ ] Click version shows read-only preview
- [ ] Restore button functional with confirmation
- [ ] Restore creates new version (non-destructive)
- [ ] Activity log entry created on restore
- [ ] All API endpoints functional
- [ ] Version access restricted to authorized users
- [ ] Change summary can be provided by user
- [ ] Plain text extraction working for diff/search
- [ ] Performance: loading version list < 200ms
- [ ] Works for requirements documents
- [ ] Works for blueprints
- [ ] Can be extended to other document types
- [ ] Version history accessible from document header
- [ ] Version history accessible from side panel

## Testing Instructions

### Database Tests
```sql
-- Create initial version
INSERT INTO document_versions
  (document_id, document_type, version_number, content, created_by)
VALUES ('{doc-id}', 'requirement', 1, '{"title":"Test"}', '{user-id}');

-- Create second version
INSERT INTO document_versions
  (document_id, document_type, version_number, content, created_by)
VALUES ('{doc-id}', 'requirement', 2, '{"title":"Test Updated"}', '{user-id}');

-- Query versions ordered by version_number
SELECT * FROM document_versions
WHERE document_id = '{doc-id}'
ORDER BY version_number DESC;
```

### Component Tests
```typescript
// VersionHistoryPanel.test.tsx
describe('VersionHistoryPanel', () => {
  it('displays list of versions', () => {
    // Verify all versions shown in list
  });

  it('highlights current version', () => {
    // Verify current version has highlight/badge
  });

  it('shows preview on version select', async () => {
    // Click version, verify preview content loads
  });

  it('shows restore button', () => {
    // Verify restore button on each version
  });
});
```

### Integration Tests
```bash
# Get version list
curl "http://localhost:3000/api/documents/{doc-id}/versions?document_type=requirement"

# Get specific version
curl http://localhost:3000/api/documents/{doc-id}/versions/3

# Restore to version
curl -X POST http://localhost:3000/api/documents/{doc-id}/versions/2/restore \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Create a requirements document with content
2. Edit document content and wait 30+ seconds
3. Verify version 1 created
4. Make more edits and wait 30 seconds
5. Verify version 2 created
6. Open version history panel
7. Verify versions listed with timestamps
8. Click older version to preview
9. Verify preview shows old content (read-only)
10. Click "Restore" on older version
11. Verify confirmation dialog appears
12. Confirm restore
13. Verify new version created (version count increased)
14. Verify document shows restored content
15. Test with blueprint document
16. Test that rapid changes don't create multiple versions (debounce working)

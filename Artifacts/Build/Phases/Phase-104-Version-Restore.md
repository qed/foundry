# Phase 104 - Version Restore

## Objective
Implement version restoration functionality allowing users to roll back to previous document states with confirmation, version tracking, and activity logging.

## Prerequisites
- Phase 102 (Document Version History System) completed
- Phase 103 (Version Diff & Comparison) completed
- Activity log system from Phase 119 (Audit Trail) or equivalent

## Context
Users need ability to undo mistakes by reverting to earlier document versions. The restore operation should be non-destructive (current content saved as new version), with confirmation dialogs and clear feedback.

## Detailed Requirements

### Restore Operation Flow

#### User Interface
1. User views version history panel
2. User clicks "Restore" button on a previous version
3. Confirmation dialog shows:
   - "Restore version X from [date]?"
   - Preview of differences (compact diff summary)
   - "Current content will be saved as a new version"
   - "Cancel" and "Restore" buttons

#### On Confirmation
1. Current document content saved as new version (version N+1)
2. Content from version X copied to current document
3. Document marked as modified
4. Activity log entry created: "Restored to version X"
5. Toast notification: "Document restored to version X from [date]"
6. Version history panel updated to show new version

#### Version History Preservation
- Restore does not delete any versions
- Does not overwrite old versions
- Creates new version entry with change_summary: "Restored from version X"
- Maintains chronological version sequence

### Database Operations

#### Restore Process
```sql
-- Get version to restore
SELECT * FROM document_versions
WHERE document_id = ? AND version_number = ?;

-- Create new version from current document
INSERT INTO document_versions
  (document_id, document_type, version_number, content, content_text,
   change_summary, created_by, created_at)
VALUES
  (?, ?,
   (SELECT MAX(version_number) + 1 FROM document_versions WHERE document_id = ?),
   <current_content>,
   <current_content_text>,
   'Saved before restore from version ?',
   ?,
   NOW());

-- Update document with restored content
UPDATE requirements_documents  -- or blueprints
SET content = <restored_content>,
    current_version = (SELECT MAX(version_number) FROM document_versions
                       WHERE document_id = ?),
    version_count = (SELECT COUNT(*) FROM document_versions
                     WHERE document_id = ?),
    updated_at = NOW(),
    last_modified_by = ?
WHERE id = ?;

-- Create activity log entry
INSERT INTO activity_log
  (project_id, user_id, entity_type, entity_id, action, details, created_at)
VALUES
  (?, ?, 'document', ?, 'restored_version',
   '{"restored_from_version": ?, "restored_to_version": ?}',
   NOW());
```

### UI Components

#### RestoreConfirmDialog Component
```typescript
interface RestoreConfirmDialogProps {
  documentId: string;
  documentType: 'requirement' | 'blueprint';
  sourceVersion: number;
  sourceDate: string;
  diffStats?: DiffStats;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreConfirmDialog({
  documentId,
  documentType,
  sourceVersion,
  sourceDate,
  diffStats,
  isLoading = false,
  onConfirm,
  onCancel,
}: RestoreConfirmDialogProps) {
  // Dialog with confirmation and diff summary
}
```

#### RestoreButton Component
```typescript
interface RestoreButtonProps {
  version: DocumentVersion;
  documentId: string;
  onRestore?: (version: number) => void;
  disabled?: boolean;
  variant?: 'icon' | 'text' | 'button';
}

export function RestoreButton({
  version,
  documentId,
  onRestore,
  disabled = false,
  variant = 'button',
}: RestoreButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRestore = async () => {
    const result = await restoreVersion(documentId, version.version_number);
    onRestore?.(version.version_number);
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={disabled}
        variant={variant}
      >
        Restore
      </Button>
      <RestoreConfirmDialog
        isOpen={showConfirm}
        sourceVersion={version.version_number}
        sourceDate={version.created_at}
        onConfirm={handleRestore}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
```

### Restore Logic

#### Service Function
```typescript
interface RestoreResult {
  success: boolean;
  newVersionNumber: number;
  restoredFromVersion: number;
  timestamp: string;
  message: string;
}

export async function restoreDocumentVersion(
  documentId: string,
  documentType: 'requirement' | 'blueprint',
  targetVersion: number,
  userId: string
): Promise<RestoreResult> {
  try {
    // Get document and validate user has edit permission
    const document = await getDocument(documentId);
    if (!canEditDocument(document, userId)) {
      throw new UnauthorizedError('Cannot restore to this document');
    }

    // Get version to restore
    const versionToRestore = await getDocumentVersion(
      documentId,
      targetVersion
    );
    if (!versionToRestore) {
      throw new NotFoundError('Version not found');
    }

    // Get current version to save as backup
    const currentVersion = await getDocumentVersion(
      documentId,
      document.current_version
    );

    // Create new version from current content
    const newVersionNum = document.current_version + 1;
    await createVersion({
      document_id: documentId,
      document_type: documentType,
      version_number: newVersionNum,
      content: currentVersion.content,
      content_text: currentVersion.content_text,
      change_summary: `Saved before restore from version ${targetVersion}`,
      created_by: userId,
    });

    // Update document with restored content
    await updateDocument(documentId, {
      content: versionToRestore.content,
      content_text: versionToRestore.content_text,
      current_version: newVersionNum,
      updated_at: new Date(),
      last_modified_by: userId,
    });

    // Log activity
    await createActivityLog({
      project_id: document.project_id,
      user_id: userId,
      entity_type: 'document',
      entity_id: documentId,
      action: 'restored_version',
      details: {
        restored_from_version: targetVersion,
        restored_to_version: newVersionNum,
      },
    });

    return {
      success: true,
      newVersionNumber: newVersionNum,
      restoredFromVersion: targetVersion,
      timestamp: new Date().toISOString(),
      message: `Document restored to version ${targetVersion}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}
```

## File Structure
```
src/
├── components/
│   ├── versioning/
│   │   ├── RestoreButton.tsx
│   │   ├── RestoreConfirmDialog.tsx
│   │   ├── RestoreSummary.tsx
│   │   └── VersionRestoreNotification.tsx
│   └── shared/
│       └── ConfirmDialog.tsx
├── lib/
│   ├── versioning/
│   │   └── restore.ts          (restore service logic)
│   └── types/
│       └── restore.ts          (TypeScript types)
├── hooks/
│   └── useRestoreVersion.ts    (hook for restore operations)
└── app/api/
    └── documents/
        └── [docId]/
            └── versions/
                └── [versionNum]/
                    └── restore/
                        └── route.ts
```

## API Routes

### POST /api/documents/[docId]/versions/[versionNum]/restore
Restore document to specific version:

```
Headers: Authorization: Bearer token

Response:
{
  success: true,
  new_version_number: number,
  restored_from_version: number,
  timestamp: string,
  message: string,
  document: {
    id: string,
    current_version: number,
    version_count: number,
    updated_at: string
  }
}

Errors:
- 400: Cannot restore to current version
- 401: Unauthorized (not a project member)
- 403: Forbidden (insufficient permissions)
- 404: Document or version not found
- 500: Restore operation failed
```

## Confirmation Dialog Content

### Content Example
```
Title: "Restore Document?"

Body:
"You are about to restore this document to Version 3 from Jan 15, 2025.

Current content will be saved as a new version (Version 5).

This action cannot be undone from this dialog, but you can view the
current version in history and restore it later."

Diff Summary:
"Changes: 12 lines added, 8 lines removed, 5 lines modified"

Buttons:
- Cancel
- Restore (Primary)
```

## Acceptance Criteria
- [ ] RestoreConfirmDialog component renders with correct information
- [ ] Confirmation dialog shows source version, date, and diff summary
- [ ] "Cancel" button closes dialog without restoring
- [ ] "Restore" button initiates restore operation
- [ ] API endpoint correctly restores document version
- [ ] Current content saved as new version before restore
- [ ] New version marked with "Restored from version X" summary
- [ ] Version numbers increment correctly
- [ ] Activity log entry created for restore action
- [ ] Toast notification shows on success
- [ ] Error handling for unauthorized users
- [ ] Error handling for version not found
- [ ] Cannot restore document to same version it's currently at
- [ ] Restored version history shows all versions in order (no gaps)
- [ ] Works for requirements documents
- [ ] Works for blueprints
- [ ] Multiple restores create separate version entries
- [ ] Performance: restore operation completes < 500ms
- [ ] Restore button disabled if user lacks edit permission
- [ ] All 5 modules can access restore functionality

## Testing Instructions

### Service Function Tests
```typescript
// restore.test.ts
describe('restoreDocumentVersion', () => {
  it('restores document to previous version', async () => {
    const result = await restoreDocumentVersion(
      documentId,
      'requirement',
      2,
      userId
    );

    expect(result.success).toBe(true);
    expect(result.newVersionNumber).toBe(4);
    expect(result.restoredFromVersion).toBe(2);
  });

  it('saves current content as new version', async () => {
    const result = await restoreDocumentVersion(
      documentId,
      'requirement',
      1,
      userId
    );

    const doc = await getDocument(documentId);
    const versions = await getVersions(documentId);
    expect(versions.length).toBe(4); // New version created
  });

  it('rejects unauthorized users', async () => {
    const result = await restoreDocumentVersion(
      documentId,
      'requirement',
      2,
      unauthorizedUserId
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('unauthorized');
  });

  it('fails for non-existent version', async () => {
    const result = await restoreDocumentVersion(
      documentId,
      'requirement',
      999,
      userId
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});
```

### Component Tests
```typescript
// RestoreConfirmDialog.test.tsx
describe('RestoreConfirmDialog', () => {
  it('displays source version and date', () => {
    const dialog = render(
      <RestoreConfirmDialog
        sourceVersion={2}
        sourceDate="2025-01-15T10:00:00Z"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(dialog.getByText(/Version 2/)).toBeInTheDocument();
    expect(dialog.getByText(/Jan 15, 2025/)).toBeInTheDocument();
  });

  it('shows diff summary if provided', () => {
    const diffStats = {
      linesAdded: 12,
      linesRemoved: 8,
      linesModified: 5,
    };

    const dialog = render(
      <RestoreConfirmDialog
        sourceVersion={2}
        sourceDate="2025-01-15"
        diffStats={diffStats}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(dialog.getByText(/12.*added/)).toBeInTheDocument();
  });

  it('calls onConfirm when Restore clicked', async () => {
    const onConfirm = vi.fn();
    const dialog = render(
      <RestoreConfirmDialog
        sourceVersion={2}
        sourceDate="2025-01-15"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await userEvent.click(dialog.getByText('Restore'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel clicked', async () => {
    const onCancel = vi.fn();
    const dialog = render(
      <RestoreConfirmDialog
        sourceVersion={2}
        sourceDate="2025-01-15"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    await userEvent.click(dialog.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

### Integration Tests
```bash
# Restore to version
curl -X POST http://localhost:3000/api/documents/{doc-id}/versions/2/restore \
  -H "Authorization: Bearer {token}"

# Response should show new version number
# {
#   "success": true,
#   "new_version_number": 5,
#   "restored_from_version": 2,
#   ...
# }
```

### Manual Testing
1. Create requirement with multiple versions (v1, v2, v3)
2. Open version history panel
3. Click "Restore" on version 1
4. Verify confirmation dialog appears
5. Verify dialog shows version 1 and date
6. Verify diff summary shows changes
7. Click "Cancel" - verify no restore happens
8. Click "Restore" again on version 1
9. Click "Restore" button in dialog
10. Verify toast shows success message
11. Verify document content reverted to version 1
12. Verify new version 4 created with "Restored from version 1" summary
13. Open version history and verify all versions still present (1, 2, 3, 4)
14. Test restoring again from restored version
15. Test with blueprint document
16. Test error: attempt to restore without edit permission
17. Test error: attempt to restore non-existent version

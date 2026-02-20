# Phase 101 - Artifact Folders & Organization

## Objective
Implement hierarchical folder system for organizing artifacts with create, rename, delete, and drag-drop operations supporting nested structures up to 3 levels deep.

## Prerequisites
- Phase 098 (Artifact Browser & Management) completed
- Phase 096 (Artifacts Schema) completed
- Drag-drop library configured (react-beautiful-dnd or similar)

## Context
As projects accumulate artifacts, users need organizational capabilities beyond flat file lists. The folder system enables intuitive grouping by project phase, department, document type, etc. The 3-level nesting limit (root → level 1 → level 2 → level 3) balances organization with UI simplicity.

## Detailed Requirements

### Folder Hierarchy

#### Structure Rules
- Maximum 3 nesting levels: root (project) → L1 → L2 → L3
- Root folder is implicit per project (no record needed)
- Each folder has unique name within same parent
- Empty folders allowed
- Folder icons visually distinct from file icons

#### Database Schema (Already in Phase 096)
```sql
CREATE TABLE artifact_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES artifact_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, parent_folder_id, name)
);

-- Add depth tracking helper
CREATE OR REPLACE FUNCTION get_folder_depth(folder_id UUID) RETURNS INTEGER AS $$
  WITH RECURSIVE folder_chain AS (
    SELECT id, parent_folder_id, 1 as depth
    FROM artifact_folders
    WHERE id = folder_id
    UNION ALL
    SELECT f.id, f.parent_folder_id, fc.depth + 1
    FROM artifact_folders f
    JOIN folder_chain fc ON f.id = fc.parent_folder_id
  )
  SELECT MAX(depth) FROM folder_chain;
$$ LANGUAGE SQL;
```

### Folder Operations

#### Create Folder
- Dialog prompt for folder name
- Validation: non-empty, max 255 chars, unique within parent
- Check depth before creation (fail if would exceed 3 levels)
- API call to create folder
- Update local state immediately (optimistic)

#### Rename Folder
- Inline edit field (click folder name or context menu "Rename")
- Validation: same as create
- Update on confirm (Enter key)
- Cancel on Escape
- Check uniqueness against siblings only

#### Delete Folder
- Context menu "Delete" option
- Confirmation dialog with nested content count
- Behavior: cascade delete (delete folder + all children + artifacts)
- Alternative: prevent deletion if not empty (choose one approach)
- Activity log entry for deletion

#### Move Folder (Drag-Drop)
- Drag folder card onto another folder
- Visual drop indicator showing destination
- Validation: can't move folder into its own subtree
- Validation: can't move to depth > 3
- Confirmation dialog for moves
- Update parent_folder_id on confirm

### Sidebar Navigation

#### Folder Tree Component
```typescript
interface FolderTreeProps {
  projectId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
}

export function FolderTree({
  projectId,
  selectedFolderId,
  onFolderSelect,
  expandedFolders,
  onToggleExpand,
}: FolderTreeProps) {
  // Recursive tree rendering
  // Click to select, chevron to expand/collapse
  // Context menu on right-click
}
```

#### TreeNode Component
- Folder icon + name
- Expand/collapse chevron (if has children)
- Right-click context menu (rename, delete, move)
- Drag handle for reordering
- Highlight when selected
- Show artifact count badge (optional)

### Drag-Drop System

#### Artifact Drag-Drop into Folders
- Drag artifact card from main area
- Drag over folder → visual highlight + drop zone indicator
- Drop to move artifact to folder
- Rollback on error
- Success toast

#### Folder Drag-Drop for Reordering
- Drag folder in tree
- Can only reorder within same parent (no move via drag in tree)
- Separate "Move to Folder" operation for hierarchy changes
- Visual feedback during drag

### UI Components

#### CreateFolderDialog
```typescript
interface CreateFolderDialogProps {
  projectId: string;
  parentFolderId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (folder: Folder) => void;
}
```

#### RenameFolderField
```typescript
interface RenameFolderFieldProps {
  folderName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

#### FolderContextMenu
```typescript
interface FolderContextMenuProps {
  folder: Folder;
  x: number;
  y: number;
  depth: number;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onNewChild?: () => void;
}
```

## File Structure
```
src/
├── components/
│   ├── artifacts/
│   │   ├── FolderTree.tsx
│   │   ├── TreeNode.tsx
│   │   ├── CreateFolderDialog.tsx
│   │   ├── RenameFolderField.tsx
│   │   ├── FolderContextMenu.tsx
│   │   ├── DeleteFolderDialog.tsx
│   │   └── MoveFolderDialog.tsx
│   └── dnd/
│       └── DraggableArtifact.tsx
├── lib/
│   ├── artifacts/
│   │   ├── folders.ts          (folder operations)
│   │   ├── hierarchy.ts        (depth checking, tree utilities)
│   │   └── validation.ts       (folder name validation)
│   └── dnd/
│       └── dragDrop.ts
├── hooks/
│   ├── useFolderTree.ts        (tree state management)
│   └── useFolderDragDrop.ts    (drag-drop logic)
└── app/api/
    └── artifacts/
        └── folders/
            ├── route.ts        (POST create, GET list)
            ├── [id]/
            │   ├── route.ts    (PATCH rename/move, DELETE)
            │   └── children/
            │       └── route.ts
            └── hierarchy-check/
                └── route.ts    (validate move operations)
```

## API Routes

### POST /api/artifacts/folders
Create folder:
```
Headers: Authorization: Bearer token

Body:
{
  project_id: string,
  parent_folder_id: string | null,
  name: string
}

Response:
{
  id: string,
  project_id: string,
  parent_folder_id: string | null,
  name: string,
  created_at: string,
  depth: number
}

Errors:
- 400: Invalid name, exceeds depth limit, non-unique name
- 401: Unauthorized
- 409: Folder already exists
```

### GET /api/artifacts/folders?project_id={id}
List all folders in project (hierarchical):
```
Response:
{
  folders: [
    {
      id: string,
      parent_folder_id: string | null,
      name: string,
      depth: number,
      artifact_count: number,
      children: [ ... ] (nested array)
    }
  ]
}
```

### PATCH /api/artifacts/folders/[id]
Rename or move folder:
```
Body:
{
  name?: string,
  parent_folder_id?: string | null
}

Response:
{
  id: string,
  name: string,
  parent_folder_id: string | null
}

Errors:
- 400: Would exceed depth limit, name conflict
- 403: Cannot move folder into its subtree
- 404: Folder not found
```

### DELETE /api/artifacts/folders/[id]
Delete folder and cascade delete contents:
```
Response:
{
  success: true,
  deleted_folder_count: number,
  deleted_artifact_count: number
}

Alternative (prevent delete if not empty):
Errors:
- 409: Folder not empty
```

### POST /api/artifacts/folders/[id]/validate-move
Check if move operation is valid:
```
Body:
{
  parent_folder_id: string | null
}

Response:
{
  valid: boolean,
  error?: string,
  resulting_depth: number
}
```

## Depth Validation

### Pre-Move Check
```typescript
async function validateFolderMove(
  folderId: string,
  newParentId: string | null,
  projectId: string
): Promise<{ valid: boolean; error?: string }> {
  // Get current folder depth
  const currentDepth = await getFolderDepth(folderId);

  // Get new parent depth
  const newParentDepth = newParentId
    ? await getFolderDepth(newParentId)
    : 0;

  // Resulting depth = newParentDepth + 1
  const resultingDepth = newParentDepth + 1;

  if (resultingDepth > 3) {
    return {
      valid: false,
      error: 'Cannot move folder deeper than 3 levels'
    };
  }

  // Check circular reference
  const isAncestor = await isFolderAncestor(newParentId, folderId);
  if (isAncestor) {
    return {
      valid: false,
      error: 'Cannot move folder into its own subtree'
    };
  }

  return { valid: true };
}
```

## Acceptance Criteria
- [ ] artifact_folders table has proper constraints and indexes
- [ ] Get folder depth SQL function works correctly
- [ ] Create folder dialog functional with validation
- [ ] Depth limit (3 levels) enforced on create
- [ ] Name uniqueness enforced within parent folder
- [ ] Rename folder inline edit functional
- [ ] Delete folder with cascade delete working
- [ ] Folder tree sidebar renders hierarchically
- [ ] Tree expand/collapse toggles working
- [ ] Drag artifact into folder functional
- [ ] Drag folder for reordering shows visual feedback
- [ ] Move folder to different parent validated
- [ ] Circular reference prevention working
- [ ] All API endpoints return correct responses
- [ ] Context menu appears on right-click
- [ ] Toast notifications show on success/error
- [ ] Empty folders allowed and functional
- [ ] Folder breadcrumbs show correct path
- [ ] All modules show consistent folder structure
- [ ] Performance: loading deep trees with 100+ folders < 500ms

## Testing Instructions

### Database Tests
```sql
-- Test create folder
INSERT INTO artifact_folders (project_id, name)
VALUES ('{project-id}', 'Documents')
RETURNING *;

-- Test unique constraint
INSERT INTO artifact_folders (project_id, parent_folder_id, name)
VALUES ('{project-id}', '{parent-id}', 'Duplicate');
INSERT INTO artifact_folders (project_id, parent_folder_id, name)
VALUES ('{project-id}', '{parent-id}', 'Duplicate');
-- Second should fail

-- Test depth validation
SELECT get_folder_depth('{folder-id}');

-- Test cascade delete
DELETE FROM artifact_folders WHERE id = '{folder-id}';
-- Verify children deleted and artifacts folder_id set to NULL
```

### Component Tests
```typescript
// FolderTree.test.tsx
describe('FolderTree', () => {
  it('renders folder hierarchy', () => {
    // Verify tree displays nested structure
  });

  it('expands and collapses folders', async () => {
    // Click chevron, verify children shown/hidden
  });

  it('selects folder on click', async () => {
    // Click folder, verify callback and highlight
  });

  it('shows context menu on right-click', async () => {
    // Right-click folder, verify menu appears
  });
});

// CreateFolderDialog.test.tsx
describe('CreateFolderDialog', () => {
  it('validates folder name not empty', async () => {
    // Try to create with empty name, expect error
  });

  it('prevents depth > 3', async () => {
    // Try to create at level 4, expect error
  });

  it('prevents duplicate names in same parent', async () => {
    // Create two folders with same name in same parent, expect error on second
  });
});
```

### Integration Tests
```bash
# Create root-level folder
curl -X POST http://localhost:3000/api/artifacts/folders \
  -H "Content-Type: application/json" \
  -d '{"project_id": "{project-id}", "name": "Design"}'

# Create nested folder
curl -X POST http://localhost:3000/api/artifacts/folders \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "{project-id}",
    "parent_folder_id": "{parent-id}",
    "name": "Wireframes"
  }'

# Rename folder
curl -X PATCH http://localhost:3000/api/artifacts/folders/{folder-id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Visual Design"}'

# Move folder
curl -X PATCH http://localhost:3000/api/artifacts/folders/{folder-id} \
  -H "Content-Type: application/json" \
  -d '{"parent_folder_id": "{new-parent-id}"}'

# Delete folder
curl -X DELETE http://localhost:3000/api/artifacts/folders/{folder-id}
```

### Manual Testing
1. Create root-level folder "Design" in artifacts
2. Create nested folder "Wireframes" inside "Design"
3. Create second-level nested folder "Mobile" inside "Wireframes"
4. Try to create fourth level folder → error
5. Rename "Design" folder to "Brand"
6. Move "Wireframes" folder from "Brand" to root
7. Upload artifact to "Wireframes" folder
8. Drag artifact to "Brand" folder
9. Delete empty "Mobile" folder
10. Try to delete "Design" folder (has children) → test cascade behavior
11. Verify breadcrumbs show correct path when navigating
12. Test folder tree sidebar expand/collapse
13. Right-click folder and verify context menu options
14. Test with deeply nested structure (3 levels full)

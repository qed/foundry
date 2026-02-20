# Phase 098 - Artifact Browser & Management

## Objective
Create a comprehensive file browser interface for viewing, previewing, and managing artifacts with folder navigation and file operations.

## Prerequisites
- Phase 097 (Artifact Upload UI) completed
- Phase 096 (Artifacts Schema) completed
- TypeScript and Tailwind CSS configured

## Context
Users need an intuitive file browser to explore uploaded artifacts, preview content, and perform management operations like renaming and moving files. The browser should support both grid and list views with breadcrumb navigation for folder hierarchies.

## Detailed Requirements

### View Modes

#### Grid View (Default)
- Thumbnail display for each artifact
- File type icon overlay for non-image files
- Artifact name below thumbnail
- Hover shows quick actions (preview, download, delete)
- Folder icons distinguished visually
- Responsive: 4-6 columns depending on viewport

#### List View
- Compact row-based display
- Columns: Icon | Name | Type | Size | Modified | Actions
- Sortable by: Name, Type, Size, Modified date
- Expandable folder rows showing contents
- Inline actions (rename, delete) via context menu

### Preview Panel

#### Image Preview
- Display full image in panel
- Zoom controls (100%, fit, zoom in/out)
- Image metadata: dimensions, file size, upload date

#### Text Preview
- First 500 characters of content_text
- Syntax highlighting if applicable (markdown, code)
- Link to "Open Full Text" modal for complete content
- Copy-to-clipboard button

#### Document Preview
- File metadata: name, size, type, uploaded by, date
- Upload status indicator if still processing
- Preview placeholder if type not viewable (Excel, etc.)
- "Download" button for all file types

#### Audio Preview
- Audio player with controls
- File metadata below player
- Download button

### Navigation

#### Breadcrumb Trail
- Shows path: `Artifacts / Documents / Design / Q1`
- Clickable breadcrumbs jump to folder
- Root folder labeled "Artifacts"
- Last item (current folder) not clickable

#### Folder Tree (Optional Sidebar)
- Collapsible folder tree showing nested structure
- Current folder highlighted
- Click to navigate
- Drag folders to reorder (Phase 101)

### File Management Actions

#### Rename
- Right-click context menu → "Rename"
- Inline edit field with current name
- Confirm with Enter, cancel with Escape
- Validation: no empty names, max 255 chars
- Database update on confirm

#### Delete
- Right-click context menu → "Delete"
- Confirmation dialog: "Delete {name}? This cannot be undone."
- Delete artifact from database and Storage
- Remove from preview panel if currently shown
- Success toast notification

#### Move to Folder
- Right-click → "Move to..."
- Modal showing folder tree
- Select destination folder
- Confirmation dialog
- Database update on confirm

#### Download
- Right-click → "Download"
- Download file from Supabase Storage
- Progress indicator for large files
- Original filename preserved

## UI Components

### ArtifactBrowser Component
```typescript
interface ArtifactBrowserProps {
  projectId: string;
  initialFolderId?: string;
  onArtifactSelect?: (artifact: Artifact) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export function ArtifactBrowser({
  projectId,
  initialFolderId,
  onArtifactSelect,
  viewMode = 'grid',
  onViewModeChange,
}: ArtifactBrowserProps) {
  // Implementation with state management
}
```

### PreviewPanel Component
```typescript
interface PreviewPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onMove: (id: string, newFolderId: string) => void;
}

export function PreviewPanel({
  artifact,
  onClose,
  onDelete,
  onRename,
  onMove,
}: PreviewPanelProps) {
  // Renders appropriate preview based on artifact type
}
```

### BreadcrumbNav Component
```typescript
interface BreadcrumbNavProps {
  projectId: string;
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export function BreadcrumbNav({
  projectId,
  currentFolderId,
  onNavigate,
}: BreadcrumbNavProps) {
  // Renders breadcrumb trail with navigation
}
```

### ContextMenu Component
```typescript
interface ContextMenuProps {
  artifact: Artifact;
  x: number;
  y: number;
  onPreview: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export function ContextMenu({
  artifact,
  x,
  y,
  onPreview,
  onRename,
  onMove,
  onDelete,
  onDownload,
}: ContextMenuProps) {
  // Renders context menu at specified coordinates
}
```

## File Structure
```
src/
├── components/
│   ├── artifacts/
│   │   ├── ArtifactBrowser.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── PreviewPanelImage.tsx
│   │   ├── PreviewPanelText.tsx
│   │   ├── PreviewPanelDocument.tsx
│   │   ├── PreviewPanelAudio.tsx
│   │   ├── BreadcrumbNav.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── GridView.tsx
│   │   ├── ListView.tsx
│   │   ├── ArtifactCard.tsx
│   │   ├── FileTypeIcon.tsx
│   │   └── RenameModal.tsx
│   └── dialogs/
│       ├── DeleteConfirmDialog.tsx
│       └── MoveFolderDialog.tsx
├── lib/
│   ├── artifacts/
│   │   ├── preview.ts         (preview logic by type)
│   │   └── operations.ts      (rename, delete, move)
│   └── supabase/
│       └── storage.ts         (file download)
└── hooks/
    └── useArtifactBrowser.ts  (state management)
```

## API Routes

### GET /api/artifacts/[id]/preview
Get artifact preview data:
```
Response:
{
  id: string,
  name: string,
  file_type: string,
  file_size: number,
  created_at: string,
  uploaded_by: { name, avatar },
  preview_data: {
    // For images: { width, height, format }
    // For text: { content: "first 500 chars", language? }
    // For documents: { pages?, format }
    // For audio: { duration, bitrate }
  }
}
```

### PATCH /api/artifacts/[id]
Rename artifact:
```
Body: { name: string }
Response: { id, name, updated_at }
```

### POST /api/artifacts/[id]/move
Move artifact to folder:
```
Body: { folder_id: string | null }
Response: { id, folder_id }
```

### DELETE /api/artifacts/[id]
Delete artifact (see Phase 096):
```
Response: { success: true }
```

### GET /api/artifacts/[id]/download
Trigger file download:
```
Response: Redirect to signed Storage URL or stream file
```

## Acceptance Criteria
- [ ] Grid view displays artifacts with thumbnails and names
- [ ] List view shows sortable columns
- [ ] View mode toggle switches between grid and list
- [ ] Preview panel displays for selected artifact
- [ ] Image preview shows actual image with zoom controls
- [ ] Text preview shows first 500 chars with syntax highlighting
- [ ] Audio player functional with play/pause controls
- [ ] Breadcrumb navigation shows current path
- [ ] Breadcrumbs clickable to jump to parent folders
- [ ] Context menu appears on right-click
- [ ] Rename action opens inline edit field
- [ ] Rename validation prevents empty names
- [ ] Delete action shows confirmation dialog
- [ ] Delete removes artifact from browser and Storage
- [ ] Move action shows folder selection modal
- [ ] Move updates artifact folder_id in database
- [ ] Download initiates file download with original name
- [ ] Folder icons distinguished from file icons
- [ ] Responsive layout on mobile devices
- [ ] All operations show appropriate success/error toasts

## Testing Instructions

### Component Tests
```typescript
// ArtifactBrowser.test.tsx
describe('ArtifactBrowser', () => {
  it('renders grid view by default', () => {
    // Verify grid layout with artifact cards
  });

  it('switches to list view', async () => {
    // Click view mode toggle, verify list layout
  });

  it('displays preview panel on artifact select', () => {
    // Click artifact, verify preview panel appears
  });

  it('shows correct preview for image artifact', () => {
    // Select image artifact, verify actual image displayed
  });

  it('shows correct preview for text artifact', () => {
    // Select text artifact, verify first 500 chars shown
  });
});

// ContextMenu.test.tsx
describe('ContextMenu', () => {
  it('displays context menu on right-click', () => {
    // Right-click artifact, verify menu appears
  });

  it('shows rename option', () => {
    // Verify "Rename" in context menu
  });

  it('shows delete option', () => {
    // Verify "Delete" in context menu
  });
});
```

### Integration Tests
```bash
# Get artifact preview
curl http://localhost:3000/api/artifacts/{artifact-id}/preview

# Rename artifact
curl -X PATCH http://localhost:3000/api/artifacts/{artifact-id} \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name.pdf"}'

# Move artifact
curl -X POST http://localhost:3000/api/artifacts/{artifact-id}/move \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "{folder-id}"}'
```

### Manual Testing Checklist
1. Upload multiple artifacts to test project
2. Create nested folders and organize artifacts
3. Verify grid view displays all artifacts with correct types
4. Switch to list view and verify columns sort correctly
5. Select artifact and verify preview panel appears
6. Test image preview with zoom controls
7. Test text preview with first 500 characters
8. Right-click artifact and verify context menu appears
9. Rename artifact via context menu
10. Move artifact to different folder
11. Delete artifact with confirmation
12. Download artifact and verify filename preserved
13. Use breadcrumbs to navigate folder hierarchy
14. Test responsive design on mobile viewport

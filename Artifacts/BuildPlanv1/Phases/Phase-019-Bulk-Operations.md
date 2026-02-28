# Phase 019 - Hall Bulk Operations

## Objective
Enable users to select multiple ideas and perform batch operations: tag, delete, change status, and promote to Pattern Shop.

## Prerequisites
- Phase 014: Idea List View (checkboxes for selection)
- Phase 017: Edit & Delete Ideas (delete mechanism)
- Phase 018: Tagging System (tag management)

## Context
When The Hall grows, users need efficient ways to organize groups of ideas at once. Bulk operations reduce repetitive clicks and enable rapid organization. Users should be able to select via checkbox or "Select All", then act on the batch with a floating action bar.

## Detailed Requirements

### Selection Mechanism

**Checkboxes**
- Appear on all idea cards/rows (in grid and list view)
- Grid: appear on hover or always visible
- List: always visible in first column
- Click checkbox to toggle selection for that idea
- Visual feedback: checkbox filled when selected, card/row highlighted

**Select All**
- Button/checkbox in header or filter bar: "Select All"
- Clicking selects all visible ideas on current page
- In infinite scroll, "Select All" applies to loaded items only (warn user: "Selects N loaded ideas")
- Uncheck "Select All" deselects all

**Deselect All**
- Button becomes "Deselect All" when items selected
- Or separate button always visible
- Click to clear all selections

**Selection State Persistence**
- Selections retained when filtering/searching (within reason)
- Selections cleared on page navigation or refresh
- URL does not include selection state (selections are ephemeral)

### Floating Action Bar

**Appearance**
- Appears at bottom of viewport when ideas selected
- Sticky/floating: remains visible when scrolling
- Horizontal bar with height ~64px
- Background: semi-transparent white or card background
- Shadow: elevated appearance

**Content**
- Left side: Selection count badge ("3 ideas selected")
- Center: Action buttons (see below)
- Right side: Close (X) button to deselect

**Actions** (Buttons in floating bar)

1. **Tag**
   - Icon: tag icon
   - Tooltip: "Add tags"
   - Opens tag selector modal
   - Allows multi-select of tags
   - "Apply" button confirms
   - Action: POST /api/bulk/tag with idea IDs and tag IDs
   - Result: Tags added to all selected ideas

2. **Delete (Soft Delete)**
   - Icon: trash/delete icon
   - Tooltip: "Archive selected"
   - Confirmation: "Archive N ideas?"
   - Action: DELETE /api/bulk/ideas with idea IDs
   - Result: All selected ideas archived
   - Toast: "N ideas archived" with Undo

3. **Change Status**
   - Icon: status icon or dropdown arrow
   - Tooltip: "Change status"
   - Dropdown showing: Raw, Developing, Mature
   - Select status, apply to all selected
   - Action: PUT /api/bulk/ideas with new status
   - Result: All selected ideas updated to new status

4. **Promote**
   - Icon: arrow-up or sparkle
   - Tooltip: "Promote to Pattern Shop"
   - Opens promotion wizard (Phase 025)
   - Allows bulk promotion with same seed level
   - Action: POST /api/bulk/promote
   - Result: Each idea creates seed entry

**Button Styling**
- Icon-only buttons or icon + label
- On hover: tooltip appears
- Disabled if action not applicable (e.g., Promote disabled if ideas already promoted)
- Primary action color (blue), others neutral gray

**Responsive Behavior**
- Desktop: All buttons visible in row
- Tablet: Some buttons may have labels, others icon-only
- Mobile: Stack vertically or show fewer buttons (use dropdown menu)

### Bulk Tag Operation

**Flow**
1. Select ideas (1 or more)
2. Click "Tag" button in floating bar
3. Modal opens: "Add Tags to N ideas"
4. Multi-select dropdown (same as Phase 013)
5. Select existing tags or create new ones
6. Click "Apply Tags"
7. API call adds tags to all selected ideas (union: if an idea already has tag, no duplicate)
8. Toast: "Tags added to N ideas"
9. Floating bar remains (user can continue with other actions)

**API Behavior**
- Tags union, not replace
- If idea already has a tag, no duplicate created
- New tags created if needed
- All tag links created atomically (all succeed or all fail)

### Bulk Delete Operation

**Flow**
1. Select ideas
2. Click "Delete" button in floating bar
3. Confirmation modal: "Archive N ideas? This is reversible."
4. Show list of ideas being archived (or "N ideas")
5. "Cancel" or "Archive" buttons
6. On confirm:
   - Set status to archived for all ideas
   - Toast: "N ideas archived" with "Undo" button (10 seconds)
7. Click Undo:
   - Restore all ideas to previous status
   - Toast: "Undo successful"

### Bulk Status Change

**Flow**
1. Select ideas
2. Click "Change Status" button (or select from dropdown)
3. Dropdown opens: Raw, Developing, Mature
4. Select new status
5. No confirmation needed (low-risk action)
6. API call: PUT /api/bulk/ideas with { status, ideaIds }
7. All selected ideas update
8. Toast: "N ideas updated to Developing"
9. UI: ideas in list update to reflect new status

### Bulk Promote to Pattern Shop

Deferred to Phase 025 (Hall Promotion). Summary:
- Click "Promote" button in floating bar
- Opens promotion wizard
- Allow selecting seed level (epic, feature)
- All selected ideas promoted as seeds
- Each gets unique seed entry

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   └── components/
│                       ├── BulkActionBar.tsx
│                       ├── SelectionCheckbox.tsx
│                       ├── SelectAllButton.tsx
│                       ├── BulkTagModal.tsx
│                       ├── BulkDeleteModal.tsx
│                       └── StatusChangeDropdown.tsx
└── api/
    └── bulk/
        ├── ideas/
        │   └── route.ts (PUT status, DELETE)
        ├── tag/
        │   └── route.ts (POST tag multiple)
        └── promote/
            └── route.ts (POST promote multiple)
```

## Component Specifications

### BulkActionBar.tsx

```typescript
interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  projectId: string;
  onDeselect: () => void;
  onSelectionUpdate?: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedIds,
  projectId,
  onDeselect,
  onSelectionUpdate,
}: BulkActionBarProps) {
  const [showTagModal, setShowTagModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleTagApply = async (tagIds: string[]) => {
    const response = await fetch('/api/bulk/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        ideaIds: Array.from(selectedIds),
        tagIds,
      }),
    });

    if (response.ok) {
      toast.success(`Tags added to ${selectedCount} ideas`);
      setShowTagModal(false);
      onSelectionUpdate?.();
    }
  };

  const handleStatusChange = async (status: string) => {
    const response = await fetch('/api/bulk/ideas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        ideaIds: Array.from(selectedIds),
        status,
      }),
    });

    if (response.ok) {
      toast.success(`${selectedCount} ideas updated to ${status}`);
      setStatusDropdownOpen(false);
      onSelectionUpdate?.();
    }
  };

  const handleDeleteConfirm = async () => {
    const response = await fetch('/api/bulk/ideas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        ideaIds: Array.from(selectedIds),
      }),
    });

    if (response.ok) {
      toast.success(`${selectedCount} ideas archived`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            // Call undo endpoint
            await fetch('/api/bulk/ideas/undo', {
              method: 'POST',
              body: JSON.stringify({ ideaIds: Array.from(selectedIds) }),
            });
            onSelectionUpdate?.();
          },
        },
      });
      setShowDeleteModal(false);
      onDeselect();
      onSelectionUpdate?.();
    }
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Selection Count */}
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-900">
              {selectedCount} idea{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTagModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Add tags"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Change status"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {['raw', 'developing', 'mature'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        handleStatusChange(status);
                        setStatusDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 hover:bg-red-50 rounded-lg transition"
              title="Delete"
            >
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button
              onClick={onDeselect}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Deselect all"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTagModal && (
        <BulkTagModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          selectedCount={selectedCount}
          projectId={projectId}
          onApply={handleTagApply}
        />
      )}

      {showDeleteModal && (
        <BulkDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          selectedCount={selectedCount}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Spacer to prevent content overlap */}
      <div className="h-20" />
    </>
  );
}
```

### BulkTagModal.tsx

```typescript
interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  projectId: string;
  onApply: (tagIds: string[]) => void;
}

export function BulkTagModal({
  isOpen,
  onClose,
  selectedCount,
  projectId,
  onApply,
}: BulkTagModalProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchProjectTags();
    }
  }, [isOpen]);

  const fetchProjectTags = async () => {
    try {
      const response = await fetch(`/api/tags?projectId=${projectId}`);
      const data = await response.json();
      setProjectTags(data);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add Tags
        </h2>
        <p className="text-gray-600 mb-4">
          Add tags to {selectedCount} idea{selectedCount !== 1 ? 's' : ''}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
            {projectTags.map(tag => (
              <label
                key={tag.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTagIds(prev => [...prev, tag.id]);
                    } else {
                      setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1">{tag.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(selectedTagIds);
              onClose();
            }}
            disabled={selectedTagIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Apply Tags
          </button>
        </div>
      </div>
    </div>
  );
}
```

### BulkDeleteModal.tsx

```typescript
interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: () => Promise<void>;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}: BulkDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Archive {selectedCount} idea{selectedCount !== 1 ? 's' : ''}?
        </h2>
        <p className="text-gray-600 mb-4">
          These ideas will be moved to archived and hidden from The Hall. This is reversible.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
            Archive Ideas
          </button>
        </div>
      </div>
    </div>
  );
}
```

### SelectionCheckbox.tsx

Simple checkbox component used on cards and list rows:

```typescript
interface SelectionCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SelectionCheckbox({
  checked,
  onChange,
  disabled,
}: SelectionCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-5 h-5 rounded cursor-pointer"
    />
  );
}
```

## API Routes

### POST /api/bulk/tag

```typescript
export async function POST(request: Request) {
  const { projectId, ideaIds, tagIds } = await request.json();

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify project access
  const memberCheck = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!memberCheck.data) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Insert new idea_tags (ignore duplicates)
  const inserts = ideaIds.flatMap(ideaId =>
    tagIds.map(tagId => ({ idea_id: ideaId, tag_id: tagId }))
  );

  await supabase
    .from('idea_tags')
    .upsert(inserts, { onConflict: 'idea_id,tag_id' });

  return NextResponse.json({ success: true });
}
```

### PUT /api/bulk/ideas (Update Status)

```typescript
export async function PUT(request: Request) {
  const { projectId, ideaIds, status } = await request.json();

  // Verify access...

  await supabase
    .from('ideas')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ideaIds);

  return NextResponse.json({ success: true });
}
```

### DELETE /api/bulk/ideas (Soft Delete)

```typescript
export async function DELETE(request: Request) {
  const { projectId, ideaIds } = await request.json();

  // Verify access...

  await supabase
    .from('ideas')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .in('id', ideaIds);

  return NextResponse.json({ success: true });
}
```

## Hall Page Integration

Update the Hall page component to manage selections:

```typescript
'use client';

export default function HallPage({ params }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleCheckboxChange = (ideaId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(ideaId);
      } else {
        newSet.delete(ideaId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === ideas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ideas.map(i => i.id)));
    }
  };

  return (
    <>
      <HallHeader
        onSelectAll={handleSelectAll}
        isAllSelected={selectedIds.size === ideas.length && ideas.length > 0}
      />

      <IdeaGrid
        ideas={ideas}
        selectedIds={selectedIds}
        onSelectionChange={handleCheckboxChange}
        // ...
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        projectId={params.projectId}
        onDeselect={() => setSelectedIds(new Set())}
        onSelectionUpdate={refetchIdeas}
      />
    </>
  );
}
```

## Acceptance Criteria
1. Checkboxes appear on all idea cards/rows
2. Click checkbox to select/deselect individual idea
3. Selected idea card/row highlights with blue border/background
4. Selection count badge appears on floating bar
5. Floating bar appears at bottom when items selected
6. "Tag" button: opens tag modal, applies tags to all selected
7. "Delete" button: shows confirmation, archives all selected
8. "Change Status" dropdown: changes status for all selected
9. "Deselect" button: clears all selections, hides floating bar
10. "Select All" button in header selects all loaded ideas
11. Bulk tag operation: tags added to all ideas (union, no duplicates)
12. Bulk delete: all ideas archived, single undo restores all
13. Bulk status change: no confirmation needed, instant update
14. Selection persists when scrolling or loading more
15. Selections cleared on page refresh
16. Floating bar sticky: remains visible when scrolling
17. Responsive: buttons collapse to icons or menu on mobile
18. Confirm dialogs prevent accidental bulk actions
19. Undo available for delete action (10 second window)
20. Toast feedback for all bulk actions

## Testing Instructions

### Selection
1. Open Hall with ideas
2. Click checkbox on first idea
3. Verify idea highlights
4. Verify selection count shows "1 idea selected"
5. Click second checkbox
6. Verify count updates to "2 ideas selected"
7. Click first checkbox again
8. Verify deselected and count updates to "1"

### Floating Bar
1. Select 3 ideas
2. Verify floating bar appears at bottom
3. Verify shows "3 ideas selected"
4. Verify shows Tag, Status, Delete, Deselect buttons
5. Click Deselect button
6. Verify all unchecked, floating bar disappears
7. Scroll down; verify floating bar remains visible

### Select All
1. Click "Select All" button
2. Verify all visible ideas checked
3. Verify count shows total number
4. Click "Deselect All"
5. Verify all unchecked

### Bulk Tag
1. Select 3 ideas
2. Click "Tag" button in floating bar
3. Verify modal: "Add Tags to 3 ideas"
4. Select 2 tags
5. Click "Apply Tags"
6. Verify toast: "Tags added to 3 ideas"
7. Open each idea; verify tags applied to all

### Bulk Delete
1. Select 3 ideas
2. Click "Delete" button
3. Verify confirmation: "Archive 3 ideas?"
4. Click "Archive Ideas"
5. Verify ideas disappear from list
6. Verify toast with "Undo" button
7. Click "Undo" within 10 seconds
8. Verify ideas reappear

### Bulk Status Change
1. Select 3 ideas with "raw" status
2. Click "Change Status" dropdown
3. Select "Developing"
4. Verify toast: "3 ideas updated to Developing"
5. Open ideas; verify status changed

### Responsive
- **Desktop**: Full button bar at bottom
- **Mobile (375px)**: Buttons may collapse to icons or menu

### Error Handling
1. Select ideas and attempt bulk tag with no network
2. Verify error message
3. Verify selection maintained
4. Fix network; retry
5. Verify succeeds

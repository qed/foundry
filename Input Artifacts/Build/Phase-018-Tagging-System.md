# Phase 018 - Tagging & Tag Management

## Objective
Build a comprehensive tag management system allowing creation, editing, deletion, autocomplete suggestions, and tag analytics/usage visualization.

## Prerequisites
- Phase 011: Hall Database Schema (tags, idea_tags tables)
- Phase 013: Create Idea (tag selection in modal)
- Phase 014: Idea List View (tags displayed on cards)

## Context
Tags provide the primary way to organize ideas within The Hall. Users need flexible tag creation (inline during idea capture), discovery (autocomplete suggestions), and management (rename, delete, reassign). A tag cloud or usage summary helps teams understand which categories are most active.

## Detailed Requirements

### Tag Basics

**Tag Properties**
- **Name**: Text, max 30 characters, unique per project
- **Color**: Hex color code (color picker UI)
- **Usage Count**: How many ideas have this tag
- **Created At**: Timestamp

**Tag Scope**
- Tags belong to projects, not globally
- Each project has its own tag namespace
- Users can only see/use tags from their project

### Inline Tag Creation (During Idea Capture)

Already covered in Phase 013. Summary:
- While creating/editing idea, user can type new tag name not in existing list
- "Create" option appears
- User selects color
- New tag created and linked to idea
- New tag available for future ideas in that project

### Tag Editor / Management Page

**Route**: `/org/[slug]/project/[id]/settings/tags` (or modal in project settings)

**UI Structure**

#### Header
- Title: "Manage Tags"
- Subtitle: "Organize your ideas with custom tags and colors"
- "New Tag" button (primary)

#### Tag List

**Display**: Table or card list showing:
- Color swatch (clickable to change color)
- Tag name (editable inline or via edit button)
- Usage count badge (e.g., "5 ideas")
- "Edit" button (pencil icon)
- "Delete" button (trash icon)

**Table Layout** (If table view)
```
| Color | Tag Name    | Ideas | Actions     |
|-------|-------------|-------|-------------|
| [##]  | Feature     | 12    | [edit] [x]  |
| [##]  | Backend     | 8     | [edit] [x]  |
| [##]  | UI/UX       | 15    | [edit] [x]  |
```

**Card Layout** (If grid view)
```
┌─────────────────────────┐
│ [Color]  Feature        │
│ 12 ideas                │
│ [Edit] [Delete]         │
└─────────────────────────┘
```

**Sort Options**
- Alphabetical (A-Z)
- Most used (descending)
- Least used (ascending)
- Recently created

**Search**
- Search tags by name
- Filter by usage (e.g., "unused tags", "5+ ideas")

#### Empty State
- "No tags yet" message
- "Create your first tag" CTA button
- Shows benefit of tags

### Create/Edit Tag Modal

**Trigger**: "New Tag" button or "Edit" button on tag

**Form Fields**

1. **Tag Name**
   - Text input, max 30 characters
   - Required
   - Placeholder: "e.g., Feature, Backend, UX..."
   - Display character count: "12/30"
   - Real-time validation: must be unique in project
   - Show error if duplicate: "This tag already exists"

2. **Color Picker**
   - Visual color picker or hex input
   - Default: #808080 (gray)
   - Pre-set color palette (optional):
     - Blue: #3B82F6
     - Red: #EF4444
     - Purple: #A855F7
     - Green: #10B981
     - Yellow: #F59E0B
     - Pink: #EC4899
     - Cyan: #06B6D4
     - Gray: #808080
   - Custom hex input if user wants exact color
   - Live preview of tag with selected color

**Buttons**
- "Cancel": Close without saving
- "Save Tag": Create or update tag

**Edit Mode Differences**
- Title: "Edit Tag"
- Pre-populated form with current values
- "Delete" button also available (see delete below)
- If tag is in use, show warning: "This tag is used by 12 ideas. Changes will affect them all."

### Tag Rename

**In-Place Rename** (Optional Enhancement)
- Double-click tag name in list to edit inline
- Text becomes editable
- Press Enter to save, Escape to cancel
- Same validation as modal

**Or Modal Rename**
- Click "Edit" button on tag
- Opens modal with name field
- Apply change with "Save" button

### Tag Delete

**Delete Flow**

1. **Trigger**: Click delete (X) button on tag or in tag editor modal

2. **Confirmation Modal**:
   - Show how many ideas have this tag
   - Ask what to do with ideas:
     - **Option A**: "Remove tag from all ideas" (just delete tag_id links)
     - **Option B**: "Merge into another tag" (move all ideas to different tag)
   - If tag has 0 usage: simple confirmation "Delete this tag?"

3. **Merge Flow** (If selecting merge)
   - Show dropdown of other tags in project
   - Select target tag
   - Button: "Merge" or "Move All Ideas"
   - On confirm:
     - Delete idea_tags rows linking to old tag
     - Create new idea_tags rows linking to new tag
     - Delete old tag row

4. **Delete Without Merge**
   - Remove tag from all ideas (delete idea_tags rows)
   - Delete tag row
   - Toast: "Tag deleted and removed from [X] ideas"

5. **Undo**
   - Toast with "Undo" button for 10 seconds (optional)
   - Restore tag and idea_tags relationships

### Tag Usage / Analytics

**Tag Cloud View** (Optional)

Display all tags with:
- Larger text for more-used tags
- Smaller text for less-used tags
- Color matches tag color
- Click tag to filter ideas by it

**Example**
```
Feature Backend   Security   UI/UX
  Docs  Performance   Auth
Mobile  Payment   Database
```

**Tag Summary Widget**
- Show top 5-10 most used tags
- Display usage count on hover or in table
- "Manage tags" link to editor
- Used on Hall page as quick access

### Tag Autocomplete / Suggestions

**In Idea Create/Edit Modal**

- When typing in tag search field (Phase 013):
  - Filter existing tags by name
  - Show matching tags as clickable list items
  - If no exact match, show "Create new tag" option
  - Highlight matching text in tag name
  - Show usage count: "Feature (12 ideas)"

**Quick Suggestion**
- Show most recently used tags when tag input is empty
- Show most popular tags as fallback

### Tag Keyboard Shortcuts

- `#` prefix in idea title/body: auto-suggest tags
- Ctrl+T in tag editor: toggle color picker quick-select
- (Optional advanced feature)

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               ├── settings/
│               │   └── tags/
│               │       └── page.tsx (tag management page)
│               └── hall/
│                   └── components/
│                       └── (tag selectors already exist)
├── components/
│   └── tags/
│       ├── TagManager.tsx
│       ├── TagList.tsx
│       ├── TagEditorModal.tsx
│       ├── TagDeleteModal.tsx
│       ├── TagCloud.tsx
│       ├── TagAutocomplete.tsx
│       └── ColorPicker.tsx
└── api/
    └── tags/
        ├── route.ts (GET list, POST create)
        └── [tagId]/
            ├── route.ts (PUT update, DELETE)
            └── merge/
                └── route.ts (POST merge operation)
```

## Component Specifications

### TagManager.tsx (Main Page Component)

```typescript
interface TagManagerProps {
  projectId: string;
}

export function TagManager({ projectId }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'usage'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  useEffect(() => {
    fetchTags();
  }, [projectId]);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tags?projectId=${projectId}`);
      const data = await response.json();
      setTags(data);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = (newTag: Tag) => {
    setTags(prev => [...prev, newTag]);
    setShowCreateModal(false);
  };

  const handleUpdateTag = (updatedTag: Tag) => {
    setTags(prev => prev.map(t => t.id === updatedTag.id ? updatedTag : t));
    setEditingTag(null);
  };

  const handleDeleteTag = async (tagId: string) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
    // API call handled in delete modal
  };

  // Filter and sort tags
  const filteredTags = tags
    .filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        const usageA = a.usage_count || 0;
        const usageB = b.usage_count || 0;
        return usageB - usageA;
      }
    });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Tags</h1>
        <p className="text-gray-600">Organize your ideas with custom tags and colors</p>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'usage')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="usage">Sort by Usage</option>
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          New Tag
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filteredTags.length > 0 ? (
        <TagList
          tags={filteredTags}
          onEdit={setEditingTag}
          onDelete={handleDeleteTag}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No tags found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create your first tag
          </button>
        </div>
      )}

      <TagEditorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
        onTagCreated={handleCreateTag}
      />

      {editingTag && (
        <TagEditorModal
          isOpen={!!editingTag}
          onClose={() => setEditingTag(null)}
          projectId={projectId}
          tag={editingTag}
          onTagUpdated={handleUpdateTag}
        />
      )}
    </div>
  );
}
```

### TagList.tsx

```typescript
interface TagListProps {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tagId: string) => void;
}

export function TagList({ tags, onEdit, onDelete }: TagListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tags.map(tag => (
        <div
          key={tag.id}
          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-gray-200"
              style={{ backgroundColor: tag.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 break-word">{tag.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {tag.usage_count || 0} {(tag.usage_count === 1) ? 'idea' : 'ideas'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit(tag)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(tag.id)}
              className="px-3 py-2 text-sm border border-red-300 rounded-lg hover:bg-red-50 font-medium text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### TagEditorModal.tsx

```typescript
interface TagEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  tag?: Tag;
  onTagCreated?: (tag: Tag) => void;
  onTagUpdated?: (tag: Tag) => void;
}

export function TagEditorModal({
  isOpen,
  onClose,
  projectId,
  tag,
  onTagCreated,
  onTagUpdated,
}: TagEditorModalProps) {
  const [name, setName] = useState(tag?.name || '');
  const [color, setColor] = useState(tag?.color || '#808080');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!tag;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrors({ name: 'Tag name is required' });
      return;
    }

    setIsSaving(true);

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing ? `/api/tags/${tag.id}` : '/api/tags';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          color,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors(error.errors || { form: 'Failed to save tag' });
        return;
      }

      const savedTag = await response.json();

      if (isEditing) {
        onTagUpdated?.(savedTag);
      } else {
        onTagCreated?.(savedTag);
      }

      onClose();
    } catch (err) {
      console.error('Error saving tag:', err);
      setErrors({ form: 'An error occurred. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isEditing ? 'Edit Tag' : 'Create Tag'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={30}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({});
              }}
              placeholder="e.g., Feature, Backend, UX..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isSaving}
            />
            <div className="flex justify-between mt-1">
              {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
              <span className="text-xs text-gray-500 ml-auto">{name.length}/30</span>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded border-2 border-gray-300 cursor-pointer"
                disabled={isSaving}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#808080"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                disabled={isSaving}
              />
              <div
                className="w-8 h-8 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: color }}
              />
            </div>

            {/* Color Palette (Optional) */}
            <div className="mt-3 flex gap-2">
              {['#3B82F6', '#EF4444', '#A855F7', '#10B981', '#F59E0B'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-600"
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.form}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              {isEditing ? 'Update Tag' : 'Create Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## API Routes

### GET /api/tags (List Tags)

```typescript
// File: app/api/tags/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify access
  const memberCheck = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!memberCheck.data) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch tags with usage counts
  const response = await supabase
    .from('tags')
    .select(`
      id, name, color, created_at,
      idea_tags(count)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const tags = response.data?.map(tag => ({
    ...tag,
    usage_count: tag.idea_tags?.length || 0,
  })) || [];

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const { projectId, name, color } = await request.json();

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify access and create tag...
  // (similar to Phase 013 tag creation)
}
```

### PUT /api/tags/[tagId] (Update Tag)

```typescript
export async function PUT(
  request: Request,
  { params }: { params: { tagId: string } }
) {
  const { name, color } = await request.json();
  // Validation and update logic
}
```

### DELETE /api/tags/[tagId] (Delete Tag)

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { tagId: string } }
) {
  // Soft delete or merge logic
}
```

## Acceptance Criteria
1. Tag management page accessible from project settings
2. Create tag modal: name input (max 30 chars), color picker, save button
3. Tag list displays: color, name, usage count, edit/delete buttons
4. Sort tags by name (A-Z) or by usage (most → least)
5. Search tags by name filters the list
6. Edit tag: modal shows current values, update persists
7. Delete tag: confirmation modal shows usage count
8. Delete offers merge option for in-use tags
9. Delete without merge removes tag from all ideas
10. Tag creation in idea modals works (Phase 013 integration)
11. Tag autocomplete suggests tags when typing
12. Tag color picker shows palette and hex input
13. Tag names unique per project (no duplicates)
14. Usage counts accurate and updated after idea changes
15. Empty state shows when no tags exist
16. Responsive design on mobile/tablet
17. Form validation: name required, max length enforced
18. Error handling: show errors, allow retry

## Testing Instructions

### Create Tag
1. Go to tag management page
2. Click "New Tag" button
3. Verify modal opens
4. Enter tag name "Feature"
5. Click color, select blue
6. Click "Create Tag"
7. Verify tag appears in list
8. Verify usage count is 0

### Edit Tag
1. Click "Edit" on existing tag
2. Change name to "Epic"
3. Change color to red
4. Click "Update Tag"
5. Verify list reflects changes
6. Refresh page; verify changes persisted

### Delete Tag (Unused)
1. Select tag with 0 usage
2. Click delete
3. Verify simple confirmation: "Delete this tag?"
4. Click confirm
5. Verify tag disappears from list

### Delete Tag (In Use)
1. Select tag with 5+ ideas
2. Click delete
3. Verify confirmation shows: "This tag is used by 5 ideas"
4. Verify options: "Remove from all" or "Merge into"
5. Select "Merge", choose target tag
6. Click "Merge"
7. Verify tag deleted
8. Verify ideas now have new tag instead

### Search & Sort
1. Create 5+ tags
2. Type partial name in search
3. Verify list filters
4. Select "Sort by Usage"
5. Verify tags reorder by usage count
6. Select "Sort by Name"
7. Verify alphabetical order

### Color Picker
1. Click color input
2. Click color palette option (blue)
3. Verify hex value updates
4. Manually type hex value: "#FF0000"
5. Verify color swatch updates to red
6. Use native color picker; verify updates

### Autocomplete (In Create Modal)
1. Open idea create modal
2. Click tag search field
3. Type "fea"
4. Verify "Feature" tag appears
5. Click to select
6. Verify "Feature" appears as selected pill

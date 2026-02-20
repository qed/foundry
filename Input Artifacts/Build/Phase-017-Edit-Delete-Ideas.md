# Phase 017 - Edit & Delete Ideas

## Objective
Implement in-place editing of ideas with auto-save or explicit save, soft delete with undo capability, and permanent deletion with confirmation.

## Prerequisites
- Phase 011: Hall Database Schema (ideas table)
- Phase 016: Idea Detail View (edit trigger, delete buttons)

## Context
Ideas need to be easily updated as understanding evolves. Edits should feel lightweight (auto-save) while deletions should be reversible (soft-delete/archive). Hard deletions require explicit confirmation to prevent accidents. This phase provides both quick editing and safety mechanisms.

## Detailed Requirements

### Edit Mode

**Activation**
- Click "Edit" button in detail view or card action menu
- Transforms content into editable form fields
- Same fields as create modal: title, body, tags
- Status can be manually advanced (raw → developing → mature)

**Editable Fields**

1. **Title**
   - Text input, 200 char limit
   - Required field
   - Auto-focus when entering edit mode
   - Show character count: "45/200"

2. **Body**
   - Textarea, 3000 char limit
   - Optional
   - Show character count: "892/3000"
   - Preserve formatting/line breaks

3. **Tags**
   - Multi-select same as create modal (Phase 013)
   - Can add/remove tags
   - Can create new tags inline
   - Show selected tags as pills with X to remove

4. **Status** (Optional Enhancement)
   - Dropdown: Raw → Developing → Mature
   - Users can mark idea as developed/mature as they refine it
   - Cannot go backwards (can't demote from Mature to Raw)
   - Promoted ideas are locked (cannot edit status back)

**Save Options**

**Option A: Auto-Save (Recommended)**
- Changes saved to server as user types
- Debounce 1 second after last keystroke
- Small "Saving..." indicator near title
- After save completes, show brief checkmark (1 second)
- No explicit save button needed
- Cancel button exits edit mode (changes kept)

**Option B: Explicit Save**
- Save button visible when in edit mode
- Changes only saved on button click
- Cancel button discards changes
- Show validation errors if save fails
- Confirm: "Discard unsaved changes?" on cancel if changes exist

**Recommended: Hybrid Approach**
- Auto-save with explicit Save/Cancel buttons
- Auto-save provides ongoing feedback
- Save button acts as explicit confirmation
- Cancel button discards any pending auto-saves

**Save Behavior**
- Client-side validation before saving
- Optimistic UI: Update display immediately
- Server responds with full updated idea
- On error: Revert to previous state, show toast error
- Retry automatically or with manual button

### Delete (Soft Delete / Archive)

**Soft Delete Mechanism**
- Set `status` to 'archived' instead of removing row
- Archived ideas remain in database
- RLS policies hide archived ideas by default from non-admins (optional)
- Soft delete is reversible within grace period

**Delete Flow**

1. **Trigger**: Click Delete button in detail view
2. **Confirmation Modal**:
   - Headline: "Archive this idea?"
   - Body: "The idea will be moved to archived and hidden from the Hall."
   - "This is reversible" note
   - Buttons: "Cancel", "Archive" (destructive color)

3. **Execution**:
   - Send DELETE request to API
   - API soft-deletes by setting status to 'archived'
   - Delete modal closes
   - Idea disappears from Hall list (if filter hides archived)
   - Toast: "Idea archived" with "Undo" button (10 second window)

4. **Undo Window**:
   - Toast with "Undo" button visible for 10 seconds
   - Click "Undo": API restores status to previous value
   - Toast updates: "Undo successful"
   - Idea reappears in Hall list
   - After 10 seconds, toast fades and undo no longer available

**Delete API**
- Endpoint: DELETE /api/hall/ideas/[ideaId]
- Soft-delete: Sets status to 'archived'
- Returns updated idea object
- User can undo within 10 seconds by calling PUT /api/hall/ideas/[ideaId]/undelete

### Permanent Delete (Advanced Feature)

**Access**: Admin or project owner only (future enhancement)

**Flow**
1. In archived ideas view, show permanent delete option
2. Confirmation: "Permanently delete this idea? This cannot be undone."
3. Requires confirmation of idea title or email
4. On confirm: DELETE request actually deletes row
5. Row and all relationships (idea_tags, idea_connections) cascade delete
6. Toast: "Idea permanently deleted"
7. No undo available

**Note**: Phase 017 focuses on soft delete. Permanent delete can be deferred to Phase 019 or admin panel.

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   └── components/
│                       ├── IdeaEditForm.tsx
│                       └── DeleteConfirmationModal.tsx
└── api/
    └── hall/
        └── ideas/
            └── [ideaId]/
                ├── route.ts (PUT for update, DELETE for soft-delete)
                └── undelete/
                    └── route.ts (POST for undo)
```

## Component Specifications

### Edit Form (In-Place)

Integrated into IdeaDetailModal (Phase 016). When edit mode active:

```typescript
interface IdeaEditFormProps {
  idea: Idea;
  onCancel: () => void;
  onSave: (updatedIdea: Idea) => void;
}

export function IdeaEditForm({
  idea,
  onCancel,
  onSave,
}: IdeaEditFormProps) {
  const [formData, setFormData] = useState({
    title: idea.title,
    body: idea.body || '',
    tagIds: idea.idea_tags?.map(it => it.tag_id) || [],
    newTags: [],
    status: idea.status,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveTimer = useRef<NodeJS.Timeout>();

  // Auto-save after 1 second of inactivity
  const handleFieldChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    setSaveStatus('idle');

    // Clear previous timer
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    // Set new timer for auto-save
    saveTimer.current = setTimeout(() => {
      performSave(formData);
    }, 1000);
  };

  const performSave = async (dataToSave: typeof formData) => {
    if (!dataToSave.title.trim()) {
      setErrors({ title: 'Title is required' });
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    setIsSaving(true);

    try {
      const response = await fetch(`/api/hall/ideas/${idea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dataToSave.title.trim(),
          body: dataToSave.body.trim(),
          tagIds: dataToSave.tagIds,
          newTags: dataToSave.newTags,
          status: dataToSave.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors(error.errors || { form: 'Save failed' });
        setSaveStatus('error');
        setIsSaving(false);
        return;
      }

      const updatedIdea = await response.json();
      setSaveStatus('saved');
      onSave(updatedIdea);

      // Clear saved indicator after 1 second
      setTimeout(() => setSaveStatus('idle'), 1000);
    } catch (err) {
      console.error('Save error:', err);
      setErrors({ form: 'Failed to save. Please try again.' });
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExplicitSave = () => {
    performSave(formData);
  };

  const handleCancel = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    // Check if there are unsaved changes
    const hasChanges =
      formData.title !== idea.title ||
      formData.body !== (idea.body || '') ||
      formData.status !== idea.status;

    if (hasChanges && saveStatus !== 'saving') {
      const confirmed = confirm('Discard unsaved changes?');
      if (!confirmed) return;
    }

    onCancel();
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleExplicitSave(); }}>
      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          {saveStatus === 'saving' && (
            <span className="text-xs text-blue-600">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved
            </span>
          )}
        </div>
        <input
          type="text"
          maxLength={200}
          value={formData.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
        <div className="flex justify-between mt-1">
          {errors.title && <span className="text-xs text-red-600">{errors.title}</span>}
          <span className="text-xs text-gray-500 ml-auto">{formData.title.length}/200</span>
        </div>
      </div>

      {/* Body */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
        <textarea
          maxLength={3000}
          value={formData.body}
          onChange={(e) => handleFieldChange('body', e.target.value)}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">Supports plain text</span>
          <span className="text-xs text-gray-500">{formData.body.length}/3000</span>
        </div>
      </div>

      {/* Status */}
      {idea.status !== 'promoted' && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isSaving}
          >
            <option value="raw">Raw</option>
            <option value="developing">Developing</option>
            <option value="mature">Mature</option>
          </select>
        </div>
      )}

      {/* Tags (similar to Phase 013) */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Tags</label>
        {/* Tag select component here */}
      </div>

      {/* Form Error */}
      {errors.form && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{errors.form}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !formData.title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
          Save Changes
        </button>
      </div>
    </form>
  );
}
```

### DeleteConfirmationModal.tsx

```typescript
interface DeleteConfirmationModalProps {
  ideaTitle: string;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmationModal({
  ideaTitle,
  isOpen,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">Archive this idea?</h2>
        <p className="text-gray-600 mb-4">
          "{ideaTitle}" will be moved to archived and hidden from The Hall. This is reversible.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
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
            Archive Idea
          </button>
        </div>
      </div>
    </div>
  );
}
```

## API Routes

### PUT /api/hall/ideas/[ideaId] (Update)

```typescript
// File: app/api/hall/ideas/[ideaId]/route.ts

export async function PUT(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, tagIds, newTags, status } = await request.json();

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { errors: { title: 'Title is required' } },
        { status: 400 }
      );
    }

    // Fetch idea and verify access
    const ideaResponse = await supabase
      .from('ideas')
      .select('id, project_id')
      .eq('id', params.ideaId)
      .single();

    if (!ideaResponse.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Verify user belongs to project
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', ideaResponse.data.project_id)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update idea
    const updateResponse = await supabase
      .from('ideas')
      .update({
        title: title.trim(),
        body: body?.trim() || null,
        status: status || 'raw',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.ideaId)
      .select(`
        id, title, body, status, created_at, updated_at,
        created_by(id, email, user_metadata),
        idea_tags(tag_id, tags(id, name, color))
      `)
      .single();

    if (updateResponse.error) {
      return NextResponse.json(
        { error: 'Failed to update idea' },
        { status: 500 }
      );
    }

    // Update tags
    if (tagIds !== undefined) {
      // Delete existing tag links
      await supabase
        .from('idea_tags')
        .delete()
        .eq('idea_id', params.ideaId);

      // Create new tags if provided
      let allTagIds = tagIds || [];
      if (newTags && newTags.length > 0) {
        for (const newTag of newTags) {
          const tagResponse = await supabase
            .from('tags')
            .insert({
              project_id: ideaResponse.data.project_id,
              name: newTag.name,
              color: newTag.color,
            })
            .select()
            .single();

          if (tagResponse.data) {
            allTagIds.push(tagResponse.data.id);
          }
        }
      }

      // Link tags
      if (allTagIds.length > 0) {
        await supabase
          .from('idea_tags')
          .insert(
            allTagIds.map(tagId => ({
              idea_id: params.ideaId,
              tag_id: tagId,
            }))
          );
      }
    }

    return NextResponse.json(updateResponse.data);
  } catch (error) {
    console.error('PUT /api/hall/ideas/[ideaId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### DELETE /api/hall/ideas/[ideaId] (Soft Delete)

```typescript
// File: app/api/hall/ideas/[ideaId]/route.ts (DELETE handler)

export async function DELETE(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch idea
    const ideaResponse = await supabase
      .from('ideas')
      .select('id, project_id, status')
      .eq('id', params.ideaId)
      .single();

    if (!ideaResponse.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Verify access
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', ideaResponse.data.project_id)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Store previous status for undo
    const previousStatus = ideaResponse.data.status;

    // Soft delete: set status to archived
    const deleteResponse = await supabase
      .from('ideas')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.ideaId)
      .select()
      .single();

    if (deleteResponse.error) {
      return NextResponse.json(
        { error: 'Failed to delete idea' },
        { status: 500 }
      );
    }

    // Return with undo info
    return NextResponse.json({
      ...deleteResponse.data,
      previousStatus, // Client uses this for undo
    });
  } catch (error) {
    console.error('DELETE /api/hall/ideas/[ideaId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### POST /api/hall/ideas/[ideaId]/undelete (Undo)

```typescript
// File: app/api/hall/ideas/[ideaId]/undelete/route.ts

export async function POST(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { previousStatus } = await request.json();

    if (!previousStatus) {
      return NextResponse.json(
        { error: 'Missing previousStatus' },
        { status: 400 }
      );
    }

    // Fetch idea
    const ideaResponse = await supabase
      .from('ideas')
      .select('id, project_id')
      .eq('id', params.ideaId)
      .single();

    if (!ideaResponse.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Verify access
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', ideaResponse.data.project_id)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Restore status
    const restoreResponse = await supabase
      .from('ideas')
      .update({
        status: previousStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.ideaId)
      .select()
      .single();

    return NextResponse.json(restoreResponse.data);
  } catch (error) {
    console.error('POST /api/hall/ideas/[ideaId]/undelete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Undo Toast Integration

Update Hall page or detail modal to handle undo:

```typescript
// In parent component (Hall page or IdeaDetailModal)

const handleDeleteIdea = async (ideaId: string) => {
  const response = await fetch(`/api/hall/ideas/${ideaId}`, {
    method: 'DELETE',
  });

  const deletedIdea = await response.json();

  // Show toast with undo
  toast.success('Idea archived', {
    duration: 10000,
    action: {
      label: 'Undo',
      onClick: async () => {
        await fetch(`/api/hall/ideas/${ideaId}/undelete`, {
          method: 'POST',
          body: JSON.stringify({ previousStatus: deletedIdea.previousStatus }),
        });
        // Refetch ideas to show restored idea
        toast.success('Undo successful');
      },
    },
  });
};
```

## Acceptance Criteria
1. Edit button shows in detail view
2. Click Edit: title/body/tags become editable
3. Character counts update in real-time
4. Auto-save after 1 second of inactivity (indicator shows "Saving...")
5. After save, brief checkmark shows "Saved"
6. Save button available to explicitly save
7. Cancel button exits edit mode without discarding auto-saves
8. Changes persist in database after save
9. Delete button shows in detail view
10. Click Delete: confirmation modal appears
11. Confirmation modal shows idea title and explains archiving is reversible
12. Cancel button closes modal without deleting
13. Confirm button soft-deletes (sets status to archived)
14. Idea disappears from Hall list after delete
15. Toast appears with "Undo" button for 10 seconds
16. Click Undo: idea restored and reappears in list
17. After 10 seconds, undo no longer available
18. Error handling: if save fails, show error and allow retry
19. Form validation: title required, character limits enforced
20. Responsive: edit form and modals work on mobile

## Testing Instructions

### Edit Mode
1. Open idea detail view
2. Click "Edit" button
3. Verify title/body/tags become editable inputs
4. Verify character counts display
5. Modify title; wait 1 second
6. Verify "Saving..." appears
7. Verify "Saved" checkmark appears briefly
8. Check database: verify changes persisted
9. Click Cancel; verify edit mode closes
10. Reload page; verify changes persisted

### Auto-Save
1. Edit title; wait 300ms (before save triggers)
2. Verify no save yet
3. Wait 1 more second (total 1.3s)
4. Verify "Saving..." indicator
5. Verify save completes
6. Make another change; auto-save triggers again
7. Before save completes, click Cancel; verify you're asked to confirm discard

### Explicit Save
1. Edit multiple fields
2. Click "Save Changes" button
3. Verify button shows spinner
4. Wait for response
5. Verify idea updated in database
6. Verify detail view shows updated content

### Delete Flow
1. Open idea detail
2. Click "Delete" button
3. Verify "Archive this idea?" modal appears
4. Verify modal shows idea title
5. Click "Cancel"; verify modal closes without deleting
6. Click "Delete" button again
7. Click "Archive Idea" button
8. Verify idea disappears from Hall list
9. Verify toast appears with "Undo" button

### Undo Functionality
1. Delete an idea (see above)
2. Verify toast shows with "Undo" button
3. Click "Undo" within 10 seconds
4. Verify toast updates to "Undo successful"
5. Verify idea reappears in Hall list
6. Check database: verify status restored

### Undo Expiry
1. Delete an idea
2. Wait 10 seconds (don't click Undo)
3. Verify toast automatically disappears
4. Verify idea remains archived (no undo option available)

### Validation
1. Edit idea and clear title
2. Attempt to save
3. Verify error: "Title is required"
4. Verify button disabled
5. Type title; verify button re-enabled
6. Type 201+ characters
7. Verify input stops accepting characters at 200

### Error Handling
1. Edit idea and change title
2. Simulate network error (DevTools)
3. Attempt save
4. Verify error message displays
5. Fix network (disable throttling)
6. Click retry/save again
7. Verify save succeeds

### Responsive Behavior
- **Desktop (1280px)**: Buttons horizontal at bottom
- **Tablet (768px)**: Buttons stacked if needed
- **Mobile (375px)**: Full-width buttons, stacked vertically

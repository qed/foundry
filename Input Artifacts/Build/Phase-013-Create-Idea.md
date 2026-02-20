# Phase 013 - Create Idea / Note Capture

## Objective
Implement a modal or slide-over panel that allows users to quickly capture new ideas with title, optional body, and tags. Support optimistic UI updates and provide success feedback.

## Prerequisites
- Phase 011: Hall Database Schema (ideas, tags tables exist)
- Phase 012: Hall Page Layout (modal trigger and display context)

## Context
The primary use case for The Hall is fast idea capture. Users should be able to:
1. Click "New Idea" button
2. Fill in title (required) and description (optional)
3. Apply tags from existing project tags or create new ones inline
4. Submit with minimal friction
5. See immediate feedback on success
6. Return to idea list with new idea visible

This phase prioritizes speed and low cognitive load over complex features.

## Detailed Requirements

### UI Component: IdeaCreateModal

#### Modal/Slide-Over Structure
- **Trigger**: "New Idea" button on Hall header
- **Type**: Modal dialog (on desktop) or slide-over panel (mobile)
  - Desktop: Centered modal, 600px wide, ~500px tall
  - Mobile: Full-width slide-over from right edge, with close button
- **Overlay**: Semi-transparent dark overlay, dismiss on outside click or escape key
- **Close Button**: X icon in top-right corner

#### Form Fields

1. **Title Input**
   - Label: "Idea Title"
   - Type: text input, single line
   - Placeholder: "What's the idea?"
   - Required: Yes (visual indicator: red asterisk)
   - Character limit: 200 characters
   - Display character count below input: "0/200"
   - Autofocus: Yes (cursor in field when modal opens)

2. **Body / Description**
   - Label: "Description (Optional)"
   - Type: textarea or rich text editor
   - Placeholder: "Describe the idea, pain point, or use case..."
   - Required: No
   - Character limit: 3000 characters
   - Display character count: "0/3000"
   - Height: 150px (expandable up to 300px)
   - Support: Basic markdown or plain text (no complex formatting initially)

3. **Tags**
   - Label: "Tags"
   - Display: Multi-select component with:
     - **Existing Tags**: List of all project tags with colored badges
     - **Search/Filter**: Type to filter tag list
     - **Create New Tag**:
       - Input field for tag name (appears below existing tags if user types text not matching existing)
       - Color Picker: Allow user to assign color to new tag (default: #808080)
       - "Create Tag" button to confirm
     - **Selected Tags Display**: Show selected tags as colored pills with X to remove
     - Limit: No hard limit, but show warning at 10+ tags (optional)

#### Form Submission

**Submit Button**
- Label: "Create Idea"
- State: Disabled until title is filled (min 1 character)
- Loading: On click, button shows spinner and becomes disabled
- Action: Send to API route (POST /api/hall/ideas)

**Cancel Button**
- Label: "Cancel"
- Always enabled
- Action: Close modal without saving (confirm if form has unsaved content: "Discard changes?")

#### Optimistic UI
- On submission:
  1. Create optimistic idea object with all form data
  2. Add to local state immediately (causes idea to appear in list instantly)
  3. Show "Creating..." toast
  4. Send API request in background
  5. On success:
     - Show "Idea created!" toast with undo option (10 seconds)
     - Close modal
     - Keep idea in list (server data syncs)
  6. On error:
     - Remove optimistic idea from list
     - Show error toast: "Failed to create idea. [Retry] button"

#### Validation
- **Client-side**:
  - Title: Required, min 1 character, max 200 characters
  - Body: Max 3000 characters
  - At least one character in title to enable submit

- **Server-side**:
  - Re-validate all constraints
  - Ensure user belongs to project
  - Ensure all tag IDs belong to project
  - Return validation errors to client

## File Structure
```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   └── components/
│                       └── IdeaCreateModal.tsx
├── api/
│   └── hall/
│       └── ideas/
│           └── route.ts (POST endpoint)
└── components/
    └── hall/
        └── IdeaCreateModal.tsx (can be here or in hall/components)
```

## Component Specifications

### IdeaCreateModal.tsx
```typescript
interface IdeaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onIdeaCreated?: (idea: Idea) => void;
}

interface IdeaFormData {
  title: string;
  body: string;
  tagIds: string[];
  newTags: Array<{ name: string; color: string }>;
}

export function IdeaCreateModal({
  isOpen,
  onClose,
  projectId,
  onIdeaCreated,
}: IdeaCreateModalProps) {
  const [formData, setFormData] = useState<IdeaFormData>({
    title: '',
    body: '',
    tagIds: [],
    newTags: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [charCounts, setCharCounts] = useState({ title: 0, body: 0 });

  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagData, setNewTagData] = useState({ name: '', color: '#808080' });

  // Fetch project tags on mount
  useEffect(() => {
    fetchProjectTags(projectId);
  }, [projectId]);

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({ ...prev, title: value }));
    setCharCounts(prev => ({ ...prev, title: value.length }));
    if (value.length > 0) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const handleBodyChange = (value: string) => {
    setFormData(prev => ({ ...prev, body: value }));
    setCharCounts(prev => ({ ...prev, body: value.length }));
  };

  const handleAddTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCreateNewTag = () => {
    if (newTagData.name.trim()) {
      setFormData(prev => ({
        ...prev,
        newTags: [...prev.newTags, newTagData],
      }));
      setNewTagData({ name: '', color: '#808080' });
      setShowNewTagForm(false);
      setTagSearchQuery('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/hall/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: formData.title.trim(),
          body: formData.body.trim(),
          tagIds: formData.tagIds,
          newTags: formData.newTags,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors(data.errors || { form: 'Failed to create idea' });
        setIsLoading(false);
        return;
      }

      const createdIdea = await response.json();

      // Show success toast
      // Close modal
      onClose();

      // Call callback if provided
      onIdeaCreated?.(createdIdea);

      // Reset form
      setFormData({ title: '', body: '', tagIds: [], newTags: [] });
      setErrors({});
      setCharCounts({ title: 0, body: 0 });
    } catch (error) {
      console.error('Error creating idea:', error);
      setErrors({ form: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered tags based on search query
  const filteredTags = projectTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  const showCreateTagOption =
    tagSearchQuery.trim() &&
    !filteredTags.some(tag =>
      tag.name.toLowerCase() === tagSearchQuery.toLowerCase()
    );

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">New Idea</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Idea Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              maxLength={200}
              autoFocus
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="What's the idea?"
              className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="flex justify-between mt-1">
              {errors.title && <span className="text-sm text-red-600">{errors.title}</span>}
              <span className="text-sm text-gray-500 ml-auto">{charCounts.title}/200</span>
            </div>
          </div>

          {/* Body Input */}
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="body"
              maxLength={3000}
              value={formData.body}
              onChange={(e) => handleBodyChange(e.target.value)}
              placeholder="Describe the idea, pain point, or use case..."
              rows={6}
              className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">Supports plain text</span>
              <span className="text-sm text-gray-500">{charCounts.body}/3000</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tagIds.map(tagId => {
                const tag = projectTags.find(t => t.id === tagId);
                return tag ? (
                  <div
                    key={tagId}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagId)}
                      className="text-white hover:opacity-80"
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })}
              {formData.newTags.map((tag, idx) => (
                <div
                  key={`new-${idx}`}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name} (new)
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        newTags: prev.newTags.filter((_, i) => i !== idx),
                      }))
                    }
                    className="text-white hover:opacity-80"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Tag Search Input */}
            <input
              type="text"
              placeholder="Search or create tags..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />

            {/* Tag List */}
            {tagSearchQuery && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredTags.length > 0 && (
                  <div className="p-2 space-y-1">
                    {filteredTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          formData.tagIds.includes(tag.id)
                            ? 'bg-gray-100 font-semibold'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Create New Tag Option */}
                {showCreateTagOption && (
                  <div className="p-3 border-t border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Create new tag: "{tagSearchQuery}"
                        </p>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Color</label>
                            <input
                              type="color"
                              value={newTagData.color}
                              onChange={(e) =>
                                setNewTagData(prev => ({ ...prev, color: e.target.value }))
                              }
                              className="w-10 h-10 rounded border border-gray-300"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewTagData({ name: tagSearchQuery, color: newTagData.color });
                              handleCreateNewTag();
                            }}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Default Tag List (no search) */}
            {!tagSearchQuery && projectTags.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {projectTags.slice(0, 8).map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      formData.tagIds.includes(tag.id)
                        ? 'bg-gray-100 font-semibold'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form Error */}
          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.form}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              Create Idea
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
```

## API Route Specifications

### POST /api/hall/ideas
```typescript
// File: app/api/hall/ideas/route.ts

export async function POST(request: Request) {
  try {
    const session = await getSession(request); // Get authenticated user
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      projectId,
      title,
      body,
      tagIds,
      newTags,
    } = await request.json();

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { errors: { title: 'Title is required' } },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { errors: { title: 'Title must be 200 characters or less' } },
        { status: 400 }
      );
    }

    if (body && body.length > 3000) {
      return NextResponse.json(
        { errors: { body: 'Description must be 3000 characters or less' } },
        { status: 400 }
      );
    }

    // Verify user belongs to project
    const projectMember = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (!projectMember.data) {
      return NextResponse.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      );
    }

    // Verify all provided tagIds belong to project
    if (tagIds && tagIds.length > 0) {
      const existingTags = await supabase
        .from('tags')
        .select('id')
        .eq('project_id', projectId)
        .in('id', tagIds);

      if (existingTags.data.length !== tagIds.length) {
        return NextResponse.json(
          { errors: { tags: 'One or more tags do not belong to this project' } },
          { status: 400 }
        );
      }
    }

    // Create idea
    const ideaResponse = await supabase
      .from('ideas')
      .insert({
        project_id: projectId,
        title: title.trim(),
        body: body?.trim() || null,
        created_by: session.user.id,
        status: 'raw',
      })
      .select()
      .single();

    if (ideaResponse.error) {
      console.error('Error creating idea:', ideaResponse.error);
      return NextResponse.json(
        { error: 'Failed to create idea' },
        { status: 500 }
      );
    }

    const idea = ideaResponse.data;

    // Create new tags if provided
    let allTagIds = [...(tagIds || [])];
    if (newTags && newTags.length > 0) {
      for (const newTag of newTags) {
        const tagResponse = await supabase
          .from('tags')
          .insert({
            project_id: projectId,
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

    // Link tags to idea
    if (allTagIds.length > 0) {
      await supabase
        .from('idea_tags')
        .insert(
          allTagIds.map(tagId => ({
            idea_id: idea.id,
            tag_id: tagId,
          }))
        );
    }

    // Fetch complete idea with tags
    const completeIdea = await supabase
      .from('ideas')
      .select(`
        *,
        idea_tags(tag_id, tags(id, name, color)),
        created_by:created_by(id, email, user_metadata)
      `)
      .eq('id', idea.id)
      .single();

    return NextResponse.json(completeIdea.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/hall/ideas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Integration with Hall Page

In the Hall page component, manage modal state:

```typescript
'use client';

import { useState } from 'react';
import IdeaCreateModal from './components/IdeaCreateModal';

export default function HallPage({ params: { projectId } }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div>
      <HallHeader
        onNewIdeaClick={() => setShowCreateModal(true)}
        // ... other props
      />

      <IdeaCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
        onIdeaCreated={(idea) => {
          // Optionally refresh idea list or add optimistically
        }}
      />

      {/* Ideas grid/list */}
    </div>
  );
}
```

## Acceptance Criteria
1. Modal opens when "New Idea" button clicked
2. Title input autofocuses and displays character count
3. Body input displays character count and respects max length
4. Tags can be selected from existing project tags
5. New tags can be created with custom color
6. Submit button disabled until title has at least 1 character
7. Submit button shows loading spinner while request in flight
8. On success: modal closes, success toast shows, idea appears in list
9. On error: error message displays in modal, user can retry
10. Cancel button closes modal; confirm if unsaved changes exist
11. Overlay click or escape key closes modal
12. Optimistic UI: idea appears immediately upon form submission
13. Server validation re-checks all constraints
14. Created idea appears with correct tags, creator, timestamp
15. Character count limits enforced (title: 200, body: 3000)

## Testing Instructions

### Modal Opening
1. On Hall page, click "New Idea" button
2. Verify modal appears centered on screen with overlay
3. Verify title input has focus (cursor visible)
4. Verify close button (X) in top-right corner
5. Click overlay or press Escape; verify modal closes

### Form Validation
1. Leave title empty, click "Create Idea"
2. Verify "Title is required" error message appears
3. Verify submit button is disabled when title is empty
4. Type title; verify error disappears and button becomes enabled

### Character Counts
1. Type in title input; verify count updates in real-time
2. Type 200+ characters; verify input stops accepting characters
3. Type in body input; verify count displays correctly
4. Type 3000+ characters in body; verify input stops accepting characters

### Tag Selection
1. Click tag search input
2. Type partial tag name; verify list filters
3. Click tag in list; verify it appears as selected pill
4. Click X on selected pill; verify tag is deselected
5. Type new tag name not in list; verify "Create" option appears
6. Set color and click "Create"; verify new tag pill appears

### Submission Flow
1. Fill in title and description
2. Select/create tags
3. Click "Create Idea"
4. Verify button shows spinner
5. Wait for success toast
6. Verify modal closes
7. Verify new idea appears in list with correct content and tags

### Error Handling
1. Submit idea with valid data
2. Simulate API failure (modify backend or use network throttling)
3. Verify error message displays
4. Verify "Retry" option or ability to resubmit
5. Verify form data is preserved

### Optimistic UI
1. Fill and submit form
2. Immediately after clicking submit, verify new idea appears in list (before server response)
3. Wait for server response
4. Verify final data matches (creator, timestamp, tags)

### Mobile Behavior
1. Resize to mobile width (375px)
2. Verify modal displays as full-width slide-over
3. Verify form remains usable with mobile keyboard
4. Verify close button remains accessible

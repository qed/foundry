# Phase 016 - Idea Detail View

## Objective
Build a detail view for individual ideas showing full content, tags, connections, metadata, and action buttons. Implement as either a dedicated route or a slide-over modal that preserves list context.

## Prerequisites
- Phase 011: Hall Database Schema (ideas table and relationships)
- Phase 014: Idea List View (ideas displayed in list/grid)

## Context
Users need to read full idea details without losing context or navigation. The detail view shows the complete idea body, related ideas, all metadata, and provides actions for editing, deleting, and promoting to Pattern Shop. The slide-over approach is recommended as it allows users to browse multiple ideas sequentially without page navigation.

## Detailed Requirements

### View Type: Slide-Over Modal (Recommended)

**Layout & Appearance**
- Slide-over panel from right edge of screen
- Width: 600px on desktop, full-width on mobile
- Height: Full viewport height
- Overlay: Semi-transparent dark background
- Content: Scrollable within panel
- Close button: X in top-right corner
- Animation: Smooth slide-in/out (300ms)

**Alternative: Dedicated Route**
- Route: `/org/[slug]/project/[id]/hall/[ideaId]`
- Full-page view with back button
- Better for deep linking and bookmarking
- Consider using both: slide-over for list browsing, route for direct links

**Recommended Hybrid Approach**
- Both route and modal exist
- Route is primary for direct access
- Modal opens when idea clicked from list (optional overlay)
- URL reflects which idea is open
- Closing modal goes back in browser history

### Header Section

**Idea Metadata**
- **Title** (bold, large, 24-32px)
- **Status Badge**: Colored badge showing status (raw, developing, mature, promoted, archived)
  - Raw: gray
  - Developing: blue
  - Mature: purple
  - Promoted: green
  - Archived: strikethrough gray
- **Created Info**:
  - Creator avatar (32px circle)
  - Creator name (linked to profile if available)
  - Relative creation time (e.g., "Created 3 days ago")
  - "Last updated [time]" if edited after creation

### Body Content

**Full Description**
- Display entire idea body text (no truncation)
- Support basic markdown formatting or plain text
- Code blocks if applicable
- Links clickable (open in new tab)
- Line breaks preserved
- Maximum width: ~800px for readability

**Tags Section**
- **Label**: "Tags"
- **Display**: All tags as colored badges/pills
- **Behavior**: Click tag to filter Hall by that tag (Phase 015)
- **Styling**: Colored background, white text, padding 6px 12px, border-radius 12px

### Connected Ideas Section

**Title**: "Related Ideas"
- **Display**: If idea_connections exist, show related ideas
- **Format**: List of connected ideas with:
  - Connection type badge (e.g., "related", "duplicates", "extends")
  - Idea title (clickable)
  - Brief preview (2 lines)
  - Creator avatar + name
- **Empty State**: "No connections yet"
- **Add Connection**: Button/link to add a new connection (Phase 023 enhancement)
- **Connection Types**:
  - "Related to": Bidirectional, similar concept
  - "Duplicates": This idea duplicates another
  - "Extends": This idea extends or builds on another

**Connection Display Example**
```
Related Ideas
─────────────
[related] Mobile App Authentication
  Secure login flow for mobile users
  by Sarah Chen • 1 week ago

[duplicates] Authentication Redesign
  Rethink our auth UX across platforms
  by Mike Johnson • 2 days ago
```

### Action Buttons

**Primary Actions** (aligned to bottom of panel or after body)

1. **Edit**
   - Opens in-place edit mode (Phase 017)
   - Changes content to editable fields
   - Shows Save/Cancel buttons
   - Icon: pencil

2. **Delete**
   - Soft deletes idea (archives it)
   - Shows confirmation: "Archive this idea?"
   - "Yes, archive" / "Cancel" buttons
   - Icon: trash/delete
   - See Phase 017 for details

3. **Promote to Pattern Shop**
   - Opens promotion wizard (Phase 025)
   - Launches modal with options
   - Allows selection of seed level (epic, feature)
   - Creates link between idea and seed
   - Icon: arrow-up or sparkle
   - Only available if not already promoted

**Secondary Actions** (dropdown menu or less prominent)
- Copy link to idea
- Share idea (email, Slack)
- View change history / activity log (future)

**Button Layout**
- Desktop: Horizontal button group at bottom of panel
- Mobile: Vertical stack (full-width buttons)
- Primary button (Promote/Edit) highlighted in blue
- Secondary buttons styled as outlined

### Metadata & Info Panel

**Section**: "Idea Info" or similar
- **Status**: Current status (raw, developing, etc.)
- **Created**: Date and time (ISO or human-readable)
- **Updated**: Date and time if edited
- **Created By**: User name/email
- **Connections**: Count of related ideas
- **Tags**: Count and list (also shown in Tags section above)
- **View Count**: How many times viewed (optional)

**Layout**: Two-column grid (on desktop), single column (mobile)

### Edit Mode (Toggle)

**Triggered by Edit button**
- Title input becomes editable
- Body textarea editable
- Tags editable (same as create modal)
- Status can change to developing/mature (via dropdown or context)
- Save and Cancel buttons replace action buttons
- See Phase 017 for full implementation

### Responsive Behavior

**Desktop (> 1024px)**
- Slide-over: 600px wide, right edge
- All content visible, scrollable if needed
- Action buttons horizontal at bottom
- Two-column info grid

**Tablet (640px - 1024px)**
- Slide-over: 500px or 70% width
- Maintain scrollability
- Buttons stack if needed

**Mobile (< 640px)**
- Full-width slide-over
- Fill entire viewport height
- Single-column layout
- Buttons full-width, stacked vertically
- Close button more prominent (large X)

### Keyboard Navigation & Accessibility

- Close button at top with visible X
- Tab order: title → tags → connections → buttons
- Escape key closes slide-over
- Link cards (related ideas) are clickable with keyboard (Enter)
- Color not only indicator of status (text label included)
- ARIA labels on icon-only buttons

## File Structure

```
app/
├── org/
│   └── [orgSlug]/
│       └── project/
│           └── [projectId]/
│               └── hall/
│                   ├── page.tsx
│                   ├── components/
│                   │   ├── IdeaDetailModal.tsx
│                   │   ├── IdeaDetailHeader.tsx
│                   │   ├── IdeaDetailBody.tsx
│                   │   ├── IdeaDetailTags.tsx
│                   │   ├── RelatedIdeasSection.tsx
│                   │   ├── IdeaInfoPanel.tsx
│                   │   └── IdeaActionButtons.tsx
│                   └── [ideaId]/
│                       ├── page.tsx (route option)
│                       └── layout.tsx
└── api/
    └── hall/
        └── ideas/
            └── [ideaId]/
                └── route.ts (GET endpoint)
```

## Component Specifications

### IdeaDetailModal.tsx

```typescript
interface IdeaDetailModalProps {
  ideaId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onIdeaUpdated?: (idea: Idea) => void;
  onIdeaDeleted?: (ideaId: string) => void;
}

export function IdeaDetailModal({
  ideaId,
  projectId,
  isOpen,
  onClose,
  onIdeaUpdated,
  onIdeaDeleted,
}: IdeaDetailModalProps) {
  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && ideaId) {
      fetchIdea();
    }
  }, [isOpen, ideaId]);

  const fetchIdea = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/hall/ideas/${ideaId}`);
      if (!response.ok) throw new Error('Failed to fetch idea');
      const data = await response.json();
      setIdea(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching idea:', err);
      setError('Failed to load idea details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over */}
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-xl z-50 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-title"
      >
        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-4">{error}</p>
              <button
                onClick={fetchIdea}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {idea && !isLoading && (
          <>
            {/* Header with Close Button */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1 pr-4">
                <h2 id="idea-title" className="text-2xl font-bold text-gray-900">
                  {idea.title}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Meta Info */}
                <IdeaDetailHeader idea={idea} />

                {/* Status */}
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        idea.status === 'raw'
                          ? 'bg-gray-100 text-gray-800'
                          : idea.status === 'developing'
                          ? 'bg-blue-100 text-blue-800'
                          : idea.status === 'mature'
                          ? 'bg-purple-100 text-purple-800'
                          : idea.status === 'promoted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500 line-through'
                      }`}
                    >
                      {idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                {idea.body && (
                  <IdeaDetailBody body={idea.body} isEditing={isEditing} />
                )}

                {/* Tags */}
                {idea.idea_tags && idea.idea_tags.length > 0 && (
                  <IdeaDetailTags tags={idea.idea_tags.map(it => it.tags)} />
                )}

                {/* Related Ideas */}
                <RelatedIdeasSection ideaId={ideaId} projectId={projectId} />

                {/* Info Panel */}
                <IdeaInfoPanel idea={idea} />
              </div>
            </div>

            {/* Action Buttons */}
            <IdeaActionButtons
              idea={idea}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onEditCancel={() => setIsEditing(false)}
              onIdeaUpdated={(updated) => {
                setIdea(updated);
                onIdeaUpdated?.(updated);
              }}
              onDelete={() => {
                onIdeaDeleted?.(ideaId);
                handleClose();
              }}
              projectId={projectId}
            />
          </>
        )}
      </div>
    </>
  );
}
```

### IdeaDetailHeader.tsx

```typescript
interface IdeaDetailHeaderProps {
  idea: Idea;
}

export function IdeaDetailHeader({ idea }: IdeaDetailHeaderProps) {
  const creatorName = idea.created_by?.user_metadata?.full_name
    || idea.created_by?.email?.split('@')[0]
    || 'Unknown';

  const relativeCreatedTime = getRelativeTime(idea.created_at);
  const relativeUpdatedTime = idea.updated_at !== idea.created_at ? getRelativeTime(idea.updated_at) : null;

  return (
    <div className="flex items-center gap-4">
      <img
        src={idea.created_by?.user_metadata?.avatar_url || '/avatar-placeholder.svg'}
        alt={creatorName}
        className="w-10 h-10 rounded-full bg-gray-300"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">{creatorName}</p>
        <p className="text-xs text-gray-500">
          Created {relativeCreatedTime}
          {relativeUpdatedTime && ` • Updated ${relativeUpdatedTime}`}
        </p>
      </div>
    </div>
  );
}
```

### IdeaDetailBody.tsx

```typescript
interface IdeaDetailBodyProps {
  body: string;
  isEditing?: boolean;
}

export function IdeaDetailBody({ body, isEditing }: IdeaDetailBodyProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
      {!isEditing ? (
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
      ) : (
        <textarea
          value={body}
          className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          readOnly={!isEditing}
        />
      )}
    </div>
  );
}
```

### IdeaDetailTags.tsx

```typescript
interface IdeaDetailTagsProps {
  tags: Tag[];
  onTagClick?: (tagId: string) => void;
}

export function IdeaDetailTags({ tags, onTagClick }: IdeaDetailTagsProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => onTagClick?.(tag.id)}
            className="px-3 py-1 rounded-full text-sm text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### RelatedIdeasSection.tsx

```typescript
interface RelatedIdeasSectionProps {
  ideaId: string;
  projectId: string;
}

export function RelatedIdeasSection({
  ideaId,
  projectId,
}: RelatedIdeasSectionProps) {
  const [connections, setConnections] = useState<IdeaConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, [ideaId]);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/hall/ideas/${ideaId}/connections`
      );
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-gray-200 rounded" />;
  }

  if (connections.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Ideas</h3>
      <div className="space-y-3">
        {connections.map(conn => (
          <div
            key={conn.target_idea_id}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
            onClick={() => {
              // Trigger load of new idea detail
            }}
          >
            <div className="flex items-start gap-3">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                {conn.connection_type}
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {conn.target_idea?.title}
                </h4>
                {conn.target_idea?.body && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {conn.target_idea.body}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### IdeaInfoPanel.tsx

```typescript
interface IdeaInfoPanelProps {
  idea: Idea;
}

export function IdeaInfoPanel({ idea }: IdeaInfoPanelProps) {
  const statusLabel = idea.status.charAt(0).toUpperCase() + idea.status.slice(1);
  const createdDate = new Date(idea.created_at).toLocaleDateString();
  const updatedDate = new Date(idea.updated_at).toLocaleDateString();

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Idea Info</h3>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-600">Status</dt>
          <dd className="font-medium text-gray-900">{statusLabel}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Created</dt>
          <dd className="font-medium text-gray-900">{createdDate}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Updated</dt>
          <dd className="font-medium text-gray-900">{updatedDate}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Tags</dt>
          <dd className="font-medium text-gray-900">
            {idea.idea_tags?.length || 0}
          </dd>
        </div>
      </dl>
    </div>
  );
}
```

### IdeaActionButtons.tsx

```typescript
interface IdeaActionButtonsProps {
  idea: Idea;
  isEditing: boolean;
  onEdit: () => void;
  onEditCancel: () => void;
  onIdeaUpdated: (idea: Idea) => void;
  onDelete: () => void;
  projectId: string;
}

export function IdeaActionButtons({
  idea,
  isEditing,
  onEdit,
  onEditCancel,
  onIdeaUpdated,
  onDelete,
  projectId,
}: IdeaActionButtonsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePromote = () => {
    // Open promotion wizard (Phase 025)
  };

  return (
    <div className="border-t border-gray-200 p-6 flex gap-3 flex-col md:flex-row">
      {!isEditing ? (
        <>
          <button
            onClick={onEdit}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 flex-1 md:flex-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 flex items-center gap-2 flex-1 md:flex-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

          {idea.status !== 'promoted' && (
            <button
              onClick={handlePromote}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 flex-1 md:flex-none md:ml-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Promote
            </button>
          )}
        </>
      ) : (
        <>
          <button
            onClick={onEditCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex-1"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              // Save logic (Phase 017)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex-1"
          >
            Save Changes
          </button>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmationModal
          title={idea.title}
          onConfirm={() => {
            // Delete logic (Phase 017)
            onDelete();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
```

## API Route: GET /api/hall/ideas/[ideaId]

```typescript
// File: app/api/hall/ideas/[ideaId]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ideaResponse = await supabase
      .from('ideas')
      .select(`
        id, title, body, status, created_at, updated_at,
        project_id,
        created_by(id, email, user_metadata),
        idea_tags(tag_id, tags(id, name, color))
      `)
      .eq('id', params.ideaId)
      .single();

    if (ideaResponse.error || !ideaResponse.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const idea = ideaResponse.data;

    // Verify user has access to idea's project
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('GET /api/hall/ideas/[ideaId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Integration with Hall Page

```typescript
'use client';

export default function HallPage({ params }) {
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  return (
    <>
      <HallHeader onNewIdeaClick={/* ... */} />
      <IdeaGrid
        ideas={ideas}
        onCardClick={(ideaId) => setSelectedIdeaId(ideaId)}
        // ...
      />

      <IdeaDetailModal
        isOpen={!!selectedIdeaId}
        ideaId={selectedIdeaId!}
        projectId={params.projectId}
        onClose={() => setSelectedIdeaId(null)}
      />
    </>
  );
}
```

## Acceptance Criteria
1. Slide-over opens from right edge when idea clicked
2. Slide-over width is 600px on desktop, full-width on mobile
3. Content scrolls within panel while header/footer sticky (optional)
4. Close button (X) in top-right corner
5. Clicking overlay closes slide-over
6. Escape key closes slide-over
7. Full idea title, body, and all tags displayed
8. Creator name, avatar, and timestamps shown
9. Status badge colored appropriately
10. Related ideas section shows connected ideas (if any)
11. Click related idea loads that idea's detail
12. Info panel shows all metadata (created, updated, status, tag count)
13. Edit button opens edit mode (Phase 017)
14. Delete button shows confirmation modal
15. Promote button visible if idea not promoted (launches Phase 025)
16. Responsive: layout adapts to mobile screen size
17. Keyboard navigation works (Tab, Escape)
18. Loading state shows spinner while fetching
19. Error state shows with retry button
20. All links use accessible patterns (keyboard, screen readers)

## Testing Instructions

### Modal Opening & Closing
1. On Hall page, click an idea card
2. Verify slide-over opens from right edge
3. Verify content loads (title, body, tags)
4. Click X button; verify slide-over closes
5. Click overlay; verify slide-over closes
6. Press Escape; verify slide-over closes

### Content Display
1. Open idea detail
2. Verify title displayed as main heading
3. Verify full body text displayed (not truncated)
4. Verify all tags shown as colored badges
5. Verify creator info: name, avatar, creation time
6. Verify status badge colored correctly
7. Verify timestamps in ISO or human-readable format

### Related Ideas
1. Open idea with connections (or create manually in DB)
2. Verify "Related Ideas" section displays
3. Verify connection type badge shown (related, duplicates, extends)
4. Click related idea title; verify new idea loads
5. Verify you can browse multiple ideas sequentially

### Responsive Behavior
- **Desktop (1280px)**: 600px slide-over on right, full content visible
- **Tablet (768px)**: 500px slide-over or wider
- **Mobile (375px)**: Full-width slide-over, stacked buttons

### Action Buttons
1. Click Edit button
2. Verify title/body become editable (Phase 017)
3. Click Cancel; verify edit mode closes
4. Click Delete button
5. Verify confirmation modal appears
6. Confirm delete; verify idea deleted and modal closed
7. Click Promote button (if not promoted)
8. Verify promotion wizard opens (Phase 025)

### Keyboard Navigation
1. Tab through elements in detail view
2. Verify Tab order is logical
3. Verify focus visible on all buttons
4. Press Enter on buttons; verify action triggers
5. Press Escape; verify modal closes

### Loading & Error States
1. Open idea detail with slow network
2. Verify spinner shows while loading
3. Simulate API error (modify URL or network)
4. Verify error message with retry button
5. Click retry; verify retries load

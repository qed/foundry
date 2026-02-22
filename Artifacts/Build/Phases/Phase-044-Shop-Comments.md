# Phase 044 - Pattern Shop Comments

## Objective
Implement inline commenting on Feature Requirements Documents (FRDs), allowing teams to discuss specific sections, resolve issues, and maintain threaded conversations within the context of requirements.

## Prerequisites
- Requirements Document Editor (Phase 034)
- Feature Requirements Document (Phase 033)
- Document Versioning (Phase 043)
- Agent Review (Phase 039, for comment integration)

## Context
Comments enable collaborative refinement of requirements. Teams can ask clarifying questions, raise concerns, or track decisions without leaving the document. Comments are anchored to specific text passages, making the context clear.

## Detailed Requirements

### Comment Trigger

**Gesture:**
1. Select text in FRD editor
2. "Add Comment" button appears above selection
3. Click button or press Cmd+Alt+C
4. Comment input form appears

**Selected Text Preservation:**
- Store exact text range (start offset, end offset)
- Highlight selection with light yellow background
- If text is later deleted, show comment as "orphaned" (text no longer exists)

### Comment Thread

Each comment can have replies forming a thread:

```
Comment by Sarah Chen (Feb 20, 2:30 PM):
"Should we specify the email validation rules more clearly?
 This section is vague."

Selected text: "Email validation"
[Resolve] [Reply] [Delete]

  Reply by John Smith (Feb 20, 2:35 PM):
  "Good point. Let's add regex pattern and examples."
  [Edit] [Delete]

  Reply by Sarah Chen (Feb 20, 2:40 PM):
  "Added to Acceptance Criteria. Check the new text."
  [Edit] [Delete]

[Mark as Resolved]
```

### Comment Display in Editor

**Margin Rendering:**
Comments appear in right margin with:
- Vertical line connecting comment to text
- Avatar of comment author
- Comment count badge ("3 comments")
- Hover shows comment preview

**Example:**
```
┌─ Editor ──────────────────────────┬─ Comments ────┐
│ Overview                          │               │
│ Provide a brief description of... │ 👤 Sarah Chen │
│                                   │ "What does... │
│ User Story                        │ [+2 replies]  │
│ As a user, I want to...           │               │
│ [Selection → "Email validation"]  │ 💬 2 comments │
│ Email validation                  │ [view]        │
│ Validate email format and...      │               │
└───────────────────────────────────┴───────────────┘
```

### Comment Sidebar

**Location:**
- Right sidebar (can toggle open/closed)
- Or panel below editor

**Features:**
- List all comments in document
- Sorted by section (matches document flow)
- Show author, date, snippet of text
- Filter: all, unresolved, by author
- Search comments

**Example Sidebar:**
```
┌─ Comments (5 total) ────────────┐
│ Filters: [All] [Unresolved: 2]  │
│ Authors: [All]                  │
│                                 │
│ ✓ Section: Overview             │
│   Sarah Chen (Feb 20, 2:30 PM)  │
│   "Should we specify...?"       │
│   [+1 reply] [Resolved]         │
│                                 │
│ ✕ Section: Requirements         │
│   John Smith (Feb 20, 1:15 PM)  │
│   "This is ambiguous. Define..."│
│   [+2 replies] [UNRESOLVED]     │
│                                 │
│ ✕ Section: Acceptance Criteria  │
│   Sarah Chen (Feb 20, 3:00 PM)  │
│   "Missing scenario for..."     │
│   [+0 replies] [UNRESOLVED]     │
└─────────────────────────────────┘
```

### Create Comment

**Form:**
```
┌─ Add Comment ────────────────────────────┐
│ Selected text: "Email validation"        │
│                                          │
│ [👤 Sarah Chen]                          │
│                                          │
│ Comment:                                 │
│ ┌──────────────────────────────────────┐ │
│ │ Should we clarify this further? | [A]│ │
│ │                                      │ │
│ │ Maybe include regex pattern?    [⌃⌄]│ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Mentions: [@john] [@sarah]               │
│ Assign to: [Select user]                 │
│                                          │
│ [Cancel] [Post Comment]                  │
└──────────────────────────────────────────┘
```

**Features:**
- Rich text input (basic: bold, italic, code)
- @mention autocomplete
- Assign comment to user (optional)
- Preview before posting
- Character count

### Resolve Comments

**States:**
- Open: Unresolved comment
- Resolved: Issue addressed, comment archived but visible

**Actions:**
- Click "Resolve" on comment to mark resolved
- Resolved comments shown in lighter color/opacity
- Can "Re-open" resolved comment
- Filter sidebar allows hiding resolved comments

**Use Cases:**
- Sarah raises issue: "This is vague"
- John updates requirement based on feedback
- John replies: "Updated section. Check it out."
- Sarah confirms: "Looks good!" and clicks "Resolve"

### Notifications

When someone:
- Replies to your comment
- Mentions you (@sarah)
- Assigns a comment to you

Show:
- In-app notification
- Email notification (if enabled)
- Badge on comment count in sidebar

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS frd_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_doc_id UUID NOT NULL REFERENCES requirements_documents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  selected_text VARCHAR(1000),
  text_start_offset INT,
  text_end_offset INT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frd_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES frd_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frd_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES frd_comments(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES frd_comment_replies(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_frd_comments_doc ON frd_comments(requirement_doc_id);
CREATE INDEX idx_frd_comments_resolved ON frd_comments(is_resolved);
```

## API Routes

### POST /api/requirements-documents/[docId]/comments
Create a new comment.

**Body:**
```json
{
  "content": "Should we specify the email validation rules more clearly?",
  "selectedText": "Email validation",
  "textStartOffset": 150,
  "textEndOffset": 168,
  "assignedTo": "user-uuid"
}
```

**Response (201 Created):**
```json
{
  "id": "comment-uuid",
  "requirement_doc_id": "doc-id",
  "author": {
    "id": "user-uuid",
    "name": "Sarah Chen",
    "email": "sarah@example.com"
  },
  "content": "Should we specify the email validation rules more clearly?",
  "selected_text": "Email validation",
  "text_start_offset": 150,
  "text_end_offset": 168,
  "is_resolved": false,
  "assigned_to": null,
  "replies": [],
  "created_at": "2025-02-20T14:30:00Z"
}
```

### GET /api/requirements-documents/[docId]/comments
Fetch all comments for a document.

**Query Parameters:**
- `docId` (required): Document UUID
- `filter` (optional): 'all', 'open', 'resolved'
- `authorId` (optional): Filter by author

**Response (200 OK):**
```json
{
  "total": 5,
  "comments": [
    {
      "id": "comment-uuid",
      "author": {...},
      "content": "...",
      "selected_text": "Email validation",
      "is_resolved": false,
      "replies": [
        {
          "id": "reply-uuid",
          "author": {...},
          "content": "...",
          "created_at": "2025-02-20T14:35:00Z"
        }
      ],
      "created_at": "2025-02-20T14:30:00Z"
    }
  ]
}
```

### POST /api/requirements-documents/[docId]/comments/[commentId]/replies
Add reply to comment.

**Body:**
```json
{
  "content": "Good point. Let's add regex pattern and examples.",
  "mentions": ["user-uuid"]
}
```

**Response (201 Created):**
```json
{
  "id": "reply-uuid",
  "author": {...},
  "content": "...",
  "created_at": "2025-02-20T14:35:00Z"
}
```

### PUT /api/requirements-documents/[docId]/comments/[commentId]
Update comment (mark resolved, reassign, etc.).

**Body:**
```json
{
  "is_resolved": true,
  "assigned_to": "user-uuid"
}
```

**Response (200 OK):**
```json
{
  "id": "comment-uuid",
  "is_resolved": true,
  "resolved_by": "current-user-uuid",
  "resolved_at": "2025-02-20T14:45:00Z"
}
```

### DELETE /api/requirements-documents/[docId]/comments/[commentId]
Delete comment (soft delete).

**Response (200 OK):**
```json
{
  "id": "comment-uuid",
  "deleted_at": "2025-02-20T14:50:00Z"
}
```

## UI Components

### CommentButton Component
**Path:** `/components/PatternShop/CommentButton.tsx`

Trigger for adding comment (appears on text selection).

### CommentForm Component
**Path:** `/components/PatternShop/CommentForm.tsx`

Form for creating comment with rich text, mentions, assignment.

```typescript
interface CommentFormProps {
  docId: string;
  selectedText: string;
  textRange: { start: number; end: number };
  onCommentCreated: (comment: Comment) => void;
  onCancel: () => void;
}

export default function CommentForm({
  docId,
  selectedText,
  textRange,
  onCommentCreated,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePostComment = async () => {
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const comment = await createComment(docId, {
        content,
        selectedText,
        textStartOffset: textRange.start,
        textEndOffset: textRange.end,
        assignedTo,
        mentions,
      });

      onCommentCreated(comment);
      toast.success('Comment posted');
      onCancel();
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded border border-gray-200 shadow-lg">
      <div className="text-sm text-gray-600 mb-3">
        Selected text: <span className="font-semibold">"{selectedText}"</span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add your comment..."
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
        rows={3}
      />

      <div className="mt-3 space-y-2 text-sm">
        <label className="block">
          <span className="text-gray-700">Assign to:</span>
          <UserSelect value={assignedTo} onChange={setAssignedTo} />
        </label>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handlePostComment}
          disabled={loading || !content.trim()}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}
```

### CommentThread Component
**Path:** `/components/PatternShop/CommentThread.tsx`

Display comment and replies.

### CommentsSidebar Component
**Path:** `/components/PatternShop/CommentsSidebar.tsx`

Sidebar listing all comments in document.

## File Structure
```
components/PatternShop/
  CommentButton.tsx           (trigger for adding comment)
  CommentForm.tsx             (comment input form)
  CommentThread.tsx           (comment + replies display)
  CommentsSidebar.tsx         (all comments list)
  MentionInput.tsx            (input with @mention support)

lib/
  api/
    comments.ts               (API client for comments)

app/api/requirements-documents/
  [docId]/
    comments/
      route.ts                (GET, POST comments)
      [commentId]/
        route.ts              (PUT, DELETE comment)
        replies/
          route.ts            (POST reply)
```

## Acceptance Criteria
- [ ] Selecting text in editor shows "Add Comment" button
- [ ] Clicking button opens comment form
- [ ] Comment form displays selected text
- [ ] Can type comment with basic formatting
- [ ] Can @mention users with autocomplete
- [ ] Can assign comment to user
- [ ] Posting comment creates thread
- [ ] Comment appears in editor margin with avatar
- [ ] Can reply to comment with same features
- [ ] Replies thread together under parent comment
- [ ] Can mark comment as "Resolved"
- [ ] Resolved comments styled differently
- [ ] Comments sidebar lists all comments
- [ ] Can filter comments (open/resolved)
- [ ] DELETE /api/requirements-documents/[docId]/comments/[commentId] works
- [ ] Mentions trigger notifications

## Testing Instructions

1. **Test comment creation:**
   - Select text "Email validation" in FRD
   - Click "Add Comment"
   - Type comment
   - Click "Post Comment"
   - Verify comment appears in margin

2. **Test comment thread:**
   - Click "Reply" on existing comment
   - Type reply
   - Click "Post Reply"
   - Verify reply appears under comment

3. **Test resolve:**
   - Click "Resolve" on comment
   - Verify comment status changes
   - Verify styling updates (lighter color)

4. **Test sidebar:**
   - Create 5 comments
   - Open Comments sidebar
   - Verify all 5 listed
   - Click filter "Unresolved"
   - Verify only open comments shown

5. **Test mentions:**
   - In comment, type "@john"
   - Verify autocomplete suggests "John Smith"
   - Select
   - Post comment
   - Verify John receives notification

6. **Test API:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"content": "Need clarification", "selectedText": "..."}' \
     "http://localhost:3000/api/requirements-documents/doc-id/comments"
   ```

## Dependencies
- Phase 026: Database schema
- Phase 033: Feature Requirements Document
- Phase 034: Requirements editor
- Phase 043: Document versioning

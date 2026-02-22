# Phase 105 - Comments System Foundation

## Objective
Implement polymorphic commenting system allowing users to leave comments on any entity type across all Helix Foundry modules with support for threaded replies and resolution tracking.

## Prerequisites
- Phase 002 (Project Schema & Core Tables) completed
- User authentication system functional
- Project membership validation established

## Context
Comments enable collaboration and feedback on any entity: ideas, features, requirements, blueprints, work orders, and feedback items. The polymorphic design allows a single database schema to handle comments across all entity types. Threaded replies and resolution status support rich discussions.

## Detailed Requirements

### Database Schema

#### comments table
Create polymorphic commenting table:

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  anchor_data JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (entity_type IN ('idea', 'feature_node', 'requirement_doc', 'blueprint', 'work_order', 'feedback'))
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_project ON comments(project_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
```

#### Anchor Data Structure
Anchored comments reference specific text selections for inline commenting:

```typescript
interface AnchorData {
  text: string;              // Selected text
  offset: number;            // Character offset in document
  lineNumber?: number;       // For documents with lines
  selectionStart: number;    // Selection range start
  selectionEnd: number;      // Selection range end
}
```

### Comment Features

#### Basic Comments
- Posted on entity (idea, feature, blueprint, etc.)
- Author, timestamp, content
- Edit (author or admin only)
- Delete (author or admin only)
- Mark as resolved

#### Threaded Replies
- Parent comment referenced via parent_comment_id
- Unlimited nesting depth (frontend may limit display)
- Replies appear indented under parent
- Resolved status only applies to top-level comments

#### Anchored Comments
- Comments reference specific text in document
- Anchor data stores text selection info
- Visual indicator in editor showing comment location
- Useful for requirements, blueprints with detailed text

#### Comment Resolution
- is_resolved boolean flag
- Only on root-level comments (parent_comment_id IS NULL)
- Mark resolved to close discussion
- Can be reopened if needed

### Comment UI Components

#### CommentThread Component
```typescript
interface CommentThreadProps {
  entityType: 'idea' | 'feature_node' | 'requirement_doc' | 'blueprint' | 'work_order' | 'feedback';
  entityId: string;
  projectId: string;
  editable?: boolean;
  onCommentAdded?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function CommentThread({
  entityType,
  entityId,
  projectId,
  editable = false,
  onCommentAdded,
  onCommentDeleted,
}: CommentThreadProps) {
  // Render flat list of root comments with nested replies
  // Comment input form for new comments
}
```

#### CommentItem Component
```typescript
interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  onReply: (content: string, parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  canResolve: boolean;
}

export function CommentItem({
  comment,
  replies,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  canEdit,
  canDelete,
  canResolve,
}: CommentItemProps) {
  // Comment display with actions
  // Threaded replies shown indented
  // Reply form toggle
}
```

#### CommentInput Component
```typescript
interface CommentInputProps {
  projectId: string;
  placeholder?: string;
  onSubmit: (content: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}

export function CommentInput({
  projectId,
  placeholder = 'Add a comment...',
  onSubmit,
  isLoading = false,
  autoFocus = false,
}: CommentInputProps) {
  // Text input with formatting support
  // Submit button
  // Character count
}
```

#### AnchoredComment Component
```typescript
interface AnchoredCommentProps {
  comment: Comment;
  documentContent: string;
  onNavigate?: (offset: number) => void;
}

export function AnchoredComment({
  comment,
  documentContent,
  onNavigate,
}: AnchoredCommentProps) {
  // Shows comment with link to anchor text in document
  // Clicking highlights corresponding text
}
```

## File Structure
```
src/
├── components/
│   ├── comments/
│   │   ├── CommentThread.tsx
│   │   ├── CommentItem.tsx
│   │   ├── CommentInput.tsx
│   │   ├── CommentReplyForm.tsx
│   │   ├── AnchoredComment.tsx
│   │   ├── CommentActions.tsx
│   │   ├── ResolveButton.tsx
│   │   └── CommentMention.tsx
│   └── shared/
│       └── CommentCount.tsx     (badge showing comment count)
├── lib/
│   ├── comments/
│   │   ├── queries.ts           (fetch comments)
│   │   ├── mutations.ts         (create/edit/delete)
│   │   └── validation.ts        (comment validation)
│   └── types/
│       └── comments.ts          (TypeScript types)
├── hooks/
│   └── useComments.ts           (state management)
└── app/api/
    └── comments/
        ├── route.ts             (GET/POST)
        └── [id]/
            ├── route.ts         (PATCH/DELETE)
            ├── replies/
            │   └── route.ts     (POST reply)
            └── resolve/
                └── route.ts     (PATCH resolve status)
```

## API Routes

### GET /api/comments
List comments on entity:

```
Query params:
- entity_type: string (required)
- entity_id: string (required)
- project_id: string (required)

Response:
{
  comments: [
    {
      id: string,
      project_id: string,
      entity_type: string,
      entity_id: string,
      parent_comment_id: string | null,
      content: string,
      author: { id, name, avatar },
      anchor_data: object | null,
      is_resolved: boolean,
      reply_count: number,
      replies: [ ... ] (nested),
      created_at: string,
      updated_at: string
    }
  ],
  total_count: number
}
```

### POST /api/comments
Create comment:

```
Headers: Authorization: Bearer token

Body:
{
  project_id: string,
  entity_type: string,
  entity_id: string,
  parent_comment_id?: string,
  content: string,
  anchor_data?: object
}

Response:
{
  id: string,
  created_at: string,
  author: { id, name, avatar },
  ...
}

Errors:
- 400: Invalid entity_type, missing content
- 401: Unauthorized
- 404: Entity not found
```

### PATCH /api/comments/[id]
Edit comment:

```
Body:
{
  content: string
}

Response:
{
  id: string,
  content: string,
  updated_at: string
}

Errors:
- 403: Not comment author
- 404: Comment not found
```

### DELETE /api/comments/[id]
Delete comment (soft delete):

```
Response: { success: true }

Errors:
- 403: Not comment author
- 404: Comment not found
```

### PATCH /api/comments/[id]/resolve
Toggle comment resolution:

```
Body:
{
  is_resolved: boolean
}

Response:
{
  id: string,
  is_resolved: boolean,
  updated_at: string
}

Errors:
- 400: Cannot resolve reply comments
- 403: Not authorized to resolve
- 404: Comment not found
```

## Comment Validation

### Content Rules
- Minimum: 1 character
- Maximum: 5000 characters
- Required: non-empty after trimming
- Optional: mentions, formatting (Phase 106)

### Permission Rules
```typescript
function canEditComment(comment: Comment, userId: string, userRole: string): boolean {
  // Author can edit own comments
  if (comment.author_id === userId) return true;

  // Project admin can edit any comment
  if (userRole === 'admin') return true;

  return false;
}

function canDeleteComment(comment: Comment, userId: string, userRole: string): boolean {
  // Same as edit
  return canEditComment(comment, userId, userRole);
}

function canResolveComment(comment: Comment, userId: string, userRole: string): boolean {
  // Resolve requires higher permission
  // Only project owner/admin or document owner
  return userRole === 'admin' || comment.entity_owner === userId;
}
```

## Acceptance Criteria
- [ ] comments table created with proper constraints
- [ ] Polymorphic entity_type enum validation working
- [ ] Self-referential parent_comment_id for threaded replies
- [ ] CommentThread component renders comments for any entity
- [ ] CommentItem component displays author, timestamp, content
- [ ] CommentInput component functional with submission
- [ ] API endpoints CRUD operations working
- [ ] Soft delete preserves comment history
- [ ] Edit updates content and updated_at
- [ ] Delete (soft) marks comment as deleted
- [ ] Threaded replies display nested under parent
- [ ] Resolution status toggles on root comments only
- [ ] Anchored comments store text selection data
- [ ] Permission checks prevent unauthorized edits
- [ ] All entity types supported: idea, feature, requirement, blueprint, work order, feedback
- [ ] Comments accessible from all 5 modules
- [ ] Performance: loading 100 comments < 200ms
- [ ] Comment count badge appears on entities
- [ ] Timestamps formatted user-friendly (e.g., "2 hours ago")
- [ ] Author avatars display correctly

## Testing Instructions

### Database Tests
```sql
-- Create comment
INSERT INTO comments
  (project_id, entity_type, entity_id, content, author_id)
VALUES
  ('{project-id}', 'feature_node', '{feature-id}', 'Great feature!', '{user-id}');

-- Create reply
INSERT INTO comments
  (project_id, entity_type, entity_id, parent_comment_id, content, author_id)
VALUES
  ('{project-id}', 'feature_node', '{feature-id}', '{parent-comment-id}',
   'Thanks!', '{user-id}');

-- Test entity_type constraint
INSERT INTO comments
  (project_id, entity_type, entity_id, content, author_id)
VALUES
  ('{project-id}', 'invalid_type', '{id}', 'text', '{user-id}');
-- Should fail
```

### Component Tests
```typescript
// CommentThread.test.tsx
describe('CommentThread', () => {
  it('renders comments for entity', () => {
    // Verify comments displayed
  });

  it('shows comment input form', () => {
    // Verify input field visible
  });

  it('creates new comment on submit', async () => {
    // Type and submit, verify onCommentAdded called
  });

  it('displays threaded replies', () => {
    // Verify replies nested under parent
  });
});
```

### Integration Tests
```bash
# Create comment
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "project_id": "{project-id}",
    "entity_type": "feature_node",
    "entity_id": "{feature-id}",
    "content": "Great work on this feature!"
  }'

# Get comments
curl "http://localhost:3000/api/comments?entity_type=feature_node&entity_id={feature-id}"

# Edit comment
curl -X PATCH http://localhost:3000/api/comments/{comment-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"content": "Updated comment text"}'

# Resolve comment
curl -X PATCH http://localhost:3000/api/comments/{comment-id}/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"is_resolved": true}'

# Delete comment
curl -X DELETE http://localhost:3000/api/comments/{comment-id} \
  -H "Authorization: Bearer {token}"
```

### Manual Testing
1. Navigate to any entity detail view
2. Scroll to comments section
3. Type comment and submit
4. Verify comment appears with author info
5. Reply to comment
6. Verify reply appears nested
7. Edit own comment
8. Verify updated content displays
9. Delete comment
10. Verify soft delete (comment text shown as "[deleted]")
11. Resolve comment
12. Verify "Resolved" badge appears
13. Test on all entity types: idea, feature, requirement, blueprint, work order, feedback
14. Test anchored comment in document editor (if applicable)
15. Test comment mention system (Phase 106)
16. Verify unauthorized user cannot edit others' comments

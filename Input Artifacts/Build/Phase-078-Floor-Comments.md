# Phase 078 - Assembly Floor Comments & Activity

## Objective
Implement threaded comments on work orders with @mentions, activity feed integration, and team collaboration features.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 064: Work Order Detail View
- Phase 010: Supabase Auth Integration

## Context
Comments enable asynchronous team collaboration on work orders. Developers can ask questions, discuss implementation approaches, and surface blockers without requiring real-time meetings. Activity feeds and @mentions keep conversations organized and ensure critical feedback doesn't get missed.

## Detailed Requirements

### Comments System

#### Database Schema

##### comments Table
```sql
CREATE TABLE work_order_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  mentions JSONB, -- { user_ids: ["uuid"], comment_ids: ["uuid"] }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE  -- soft delete for audit
);

CREATE INDEX idx_work_order_comments_work_order_id ON work_order_comments(work_order_id);
CREATE INDEX idx_work_order_comments_created_at ON work_order_comments(created_at DESC);

-- RLS policy: project members can read/write comments on their project's work orders
```

##### comment_threads Table (optional, for nested replies)
```sql
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES work_order_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Comment UI

#### Comments Section (in Work Order Detail)
- Positioned below Implementation Plan (Phase 076)
- Header: "Comments & Discussion" or "Activity"
- Two tabs: "Comments" | "Activity Feed"

#### Comments Tab
- **New Comment Input**:
  - Text area: "Add a comment..."
  - Rich text editor (basic: bold, italic, mentions)
  - @mention support with autocomplete
  - File attachment support (optional Phase 2)
  - Send button (or Cmd+Enter)

- **Comment Thread**:
  - Reverse chronological (newest first)
  - Each comment shows:
    - User avatar + name
    - Timestamp (relative: "2 hours ago")
    - Comment text (markdown rendering)
    - Edit button (if author)
    - Delete button (if author, soft-delete)
    - Reply button (if threaded comments supported)

- **Editing Comments**:
  - Click edit button
  - Inline edit mode
  - Save/Cancel buttons
  - Updated at timestamp: "(edited 1 hour ago)"

- **Deleting Comments**:
  - Click delete button
  - Confirmation: "Delete comment?"
  - Soft delete (mark with deletion notice)
  - Or hard delete if allowed

- **Threading** (optional for MVP):
  - Reply button below comment
  - Replies indented under parent
  - Collapse/expand thread
  - Show reply count: "(2 replies)"

#### Activity Feed Tab
- Reverse chronological list of all events:
  - Status changes: "[User] changed status to In Progress"
  - Assignments: "[User] assigned to [Member]"
  - Priority changes: "[User] changed priority to Critical"
  - Comments: "[User] commented: [snippet]"
  - Plan generation: "[Agent] generated implementation plan"
  - Created: "[User] created this work order"
- Group by date (optional: Today, Yesterday, Last week)
- Each entry shows timestamp, user avatar, description

### @Mentions

#### Detection
- Type @ in comment input
- Show autocomplete dropdown of project members
- Search by name/email
- Click or press Tab to insert

#### Mention Format
- Display: @Alice Smith
- Data: stores user_id in mentions JSON
- Notification: mentioned user receives notification (Phase 2)

#### Mention Notification (Phase 2)
- User mentioned in comment receives notification
- Email or in-app notification
- Link in notification to comment
- Mark as read when user views comment

### Notifications (Phase 2)
- Comment on work order assigned to you → notification
- Someone replies to your comment → notification
- Work order status changes → optional notification
- @mention → notification

### API Routes
```
POST /api/projects/[projectId]/work-orders/[workOrderId]/comments
  - Create comment
  - Request: { content: "text", mentions: [ { user_id: "uuid", position: 5 } ] }
  - Response: { id, content, user_id, created_at, ... }
  - Status: 201

GET /api/projects/[projectId]/work-orders/[workOrderId]/comments
  - List comments for work order
  - Query params: ?include_replies=true&sort=newest|oldest
  - Response: [ { id, content, user, created_at, replies: [] } ]
  - Status: 200

PATCH /api/projects/[projectId]/work-orders/[workOrderId]/comments/[commentId]
  - Update comment
  - Request: { content: "updated text" }
  - Response: Updated comment with updated_at
  - Status: 200

DELETE /api/projects/[projectId]/work-orders/[workOrderId]/comments/[commentId]
  - Delete comment (soft delete)
  - Status: 204

GET /api/projects/[projectId]/work-orders/[workOrderId]/activity
  - Get activity feed
  - Combines comments + status changes + assignments
  - Response: [ { type: "comment"|"status_change"|..., user, timestamp, content } ]
  - Status: 200

GET /api/projects/[projectId]/members/search
  - Search for members (for @mention autocomplete)
  - Query: ?q=name_or_email
  - Response: [ { user_id, name, email, avatar_url } ]
  - Status: 200
```

## UI Components

### New/Modified Components
1. **CommentsSection** (modify Phase 064)
   - Tabs: Comments | Activity
   - Renders CommentThread when Comments tab active
   - Renders ActivityFeed when Activity tab active

2. **CommentThread** (`app/components/Assembly/CommentThread.tsx`)
   - List of comments
   - Newest first (or oldest first based on preference)
   - Renders each comment via Comment component

3. **Comment** (`app/components/Assembly/Comment.tsx`)
   - Single comment display
   - Avatar, name, timestamp
   - Rendered content (markdown)
   - Edit/Delete buttons (if author)
   - Reply button (if threaded)

4. **CommentInput** (`app/components/Assembly/CommentInput.tsx`)
   - Text area for new comment
   - @mention autocomplete
   - Rich text toolbar (basic)
   - Send button
   - Loading state while posting

5. **MentionAutocomplete** (`app/components/Assembly/MentionAutocomplete.tsx`)
   - Dropdown for @mention suggestions
   - Shows matching project members
   - Avatar + name display
   - Click to insert

6. **ActivityFeed** (modify/reuse from Phase 064)
   - Chronological list of events
   - Format varies by event type
   - Timestamps
   - User info (avatar, name)

7. **CommentEditor** (`app/components/Assembly/CommentEditor.tsx`)
   - Inline edit mode for comment
   - Rich text editor (basic)
   - Save/Cancel buttons

### Reused Components
- UserAvatar (from Phase 066)
- Markdown renderer (from common)
- Dropdown/Autocomplete (from common)

## File Structure
```
app/
  components/
    Assembly/
      CommentsSection.tsx                 # Tabs: Comments & Activity
      CommentThread.tsx                   # List of comments
      Comment.tsx                         # Single comment
      CommentInput.tsx                    # New comment input
      MentionAutocomplete.tsx             # @mention dropdown
      CommentEditor.tsx                   # Edit comment mode
      ActivityFeed.tsx                    # Activity feed (modify)
  api/
    projects/
      [projectId]/
        work-orders/
          [workOrderId]/
            comments/
              route.ts                    # POST, GET comments
              [commentId]/
                route.ts                  # PATCH, DELETE comment
            activity/
              route.ts                    # GET activity feed
        members/
          search/
            route.ts                      # GET search for mentions
  lib/
    mentions.ts                           # @mention parsing utilities
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useComments.ts                  # React Query hook for comments
          useCreateComment.ts             # Mutation for creating comment
          useUpdateComment.ts             # Mutation for updating comment
          useDeleteComment.ts             # Mutation for deleting comment
          useMentionSearch.ts             # Hook for mention autocomplete
```

## Acceptance Criteria
- Comments section visible in work order detail below Implementation Plan
- Two tabs: "Comments" and "Activity Feed"
- Comments tab shows list of comments
- New comment input field visible with placeholder
- Type text and click Send (or Cmd+Enter) to post comment
- Comment appears immediately (optimistic update)
- Comment shows: user avatar, name, timestamp, content
- Edit button visible if user is author
- Delete button visible if user is author
- Activity Feed tab shows all events (status changes, assignments, comments)
- @mention support: type @ to see autocomplete dropdown
- Autocomplete shows project members
- Click to insert @mention
- Mentioned user name appears highlighted in comment
- Comments render markdown (bold, italic, code, lists)
- Edit comment: inline editor appears with save/cancel
- Delete comment: soft delete, shows "[deleted]" notice
- Timestamps show relative time ("2 hours ago")
- Conversation threaded and organized

## Testing Instructions

1. **Comments Display**
   - Open work order detail view
   - Scroll to Comments section
   - Verify "Comments" and "Activity Feed" tabs
   - Verify Comments tab active by default

2. **New Comment Input**
   - Verify text area visible with placeholder
   - Type "Great, let's start on this"
   - Verify text appears in input

3. **Post Comment**
   - Type comment text
   - Click Send button
   - Verify loading state (button disabled, spinner)
   - Verify comment appears immediately (optimistic)
   - Verify API called and persisted
   - Refresh page, verify comment still there

4. **Comment Display**
   - Verify comment shows:
     - User avatar (circular image)
     - User name (linked to profile, if applicable)
     - Relative timestamp ("just now", "2 hours ago")
     - Comment content (rendered text)

5. **Multiple Comments**
   - Post 3 comments (by same or different users)
   - Verify all 3 visible in thread
   - Verify newest first (reverse chronological)

6. **@Mention Autocomplete**
   - Type @ in comment input
   - Verify dropdown appears with project members
   - Type "ali" to search
   - Verify filtered to members matching "ali" (Alice, Malik, etc.)
   - Click Alice
   - Verify "@Alice" inserted in comment
   - Verify position in text correct

7. **@Mention in Saved Comment**
   - Type comment with @Alice mention
   - Post comment
   - Verify @Alice displays highlighted or specially formatted
   - Verify Alice mentioned (user_id stored in database)

8. **Edit Comment (Author)**
   - Post comment as current user
   - Click Edit button (pencil icon)
   - Verify inline edit mode activates
   - Verify text editable
   - Change text: "Great, let's start on this ASAP!"
   - Click Save
   - Verify comment updated immediately
   - Verify "(edited 1 minute ago)" shown
   - Refresh page, verify edit persisted

9. **Delete Comment (Author)**
   - Post comment
   - Click Delete button
   - Verify confirmation: "Delete comment?"
   - Click Confirm
   - Verify comment removed (or shows "[deleted]" placeholder)
   - Verify API deletes/marks deleted

10. **Non-Author Cannot Edit/Delete**
    - User A posts comment
    - View as User B (different team member)
    - Verify Edit/Delete buttons not visible
    - Verify comment still visible (readable)

11. **Activity Feed Tab**
    - Click "Activity Feed" tab
    - Verify feed shows list of events:
      - Work order creation
      - Status changes
      - Assignments
      - Comments
    - Verify each entry shows type, user, timestamp

12. **Activity Feed Comment Entry**
    - Post comment
    - Click Activity Feed tab
    - Verify comment entry appears
    - Shows: "[User] commented: [snippet of text]"
    - Click to jump to comment (optional)

13. **Markdown in Comments**
    - Type comment with markdown:
      - **bold text**
      - *italic text*
      - `code snippet`
      - - list item
    - Post
    - Verify renders correctly:
      - Bold is bold
      - Italic is italic
      - Code is monospace
      - Lists are bulleted

14. **Rich Text Toolbar** (if implemented)
    - Toolbar visible in comment input
    - Buttons: Bold, Italic, Code, List
    - Click Bold, type text, click Bold again (toggles)
    - Verify **text** markdown inserted

15. **Long Comments**
    - Type very long comment (500+ chars)
    - Post
    - Verify displays with text wrapping
    - Verify readable

16. **User Avatar in Comment**
    - Post comment
    - Verify user avatar displays
    - Hover over avatar, verify tooltip with user name
    - Click avatar, navigates to user profile (if implemented)

17. **Timestamps**
    - Post comment at current time
    - Verify "just now" or "now"
    - Wait 1 minute
    - Refresh page
    - Verify "1 minute ago"
    - Next day, verify "yesterday"

18. **Concurrent Comments**
    - Two users post comments simultaneously
    - Verify both appear without conflicts
    - Correct order (timestamp-based)

19. **Empty Comments**
    - Try to post empty comment (whitespace only)
    - Verify validation error: "Comment cannot be empty"
    - Disabled Submit button

20. **Permissions**
    - Non-member tries to post comment
    - Should get 403 error
    - Or redirect to login
    - Member posts successfully

21. **Performance**
    - Work order with 100+ comments
    - Load page
    - Verify load time reasonable (< 2s)
    - Pagination or lazy-load for many comments (optional)

22. **Mention Notification** (Phase 2)
    - User A mentions @User B in comment
    - User B receives in-app notification (if implemented)
    - User B can navigate to comment from notification

23. **Comment on Assigned Work Order**
    - Assign work order to User A
    - User B comments on it
    - User A receives notification (optional, Phase 2)

# Phase 060 - Blueprint Comments

**Objective:** Implement anchored comments on blueprint content with threaded conversations for collaborative review and feedback.

**Prerequisites:**
- Phase 046 (Database schema)
- Phase 049 (Blueprint editor)
- Phase 054 (Blueprint status tracking)
- Phase 059 (Blueprint versioning)

**Context:**
Blueprint comments enable collaborative review and discussion. Engineers can comment on specific sections of blueprints, reply to comments, and resolve discussions. Comments are anchored to specific text, making conversations contextual. Comment threads support asynchronous collaboration and create a record of design decisions.

**Detailed Requirements:**

1. **Comment Data Model**
   - New table: `blueprint_comments`
     - id (UUID PK)
     - blueprint_id (FK, NOT NULL)
     - user_id (FK, NOT NULL)
     - anchor_text (VARCHAR 500): the specific text being commented on
     - anchor_position (INTEGER): character position in content (for robustness)
     - section_title (VARCHAR 255): blueprint section (e.g., "API Endpoints")
     - content (TEXT): comment text (up to 5000 chars)
     - resolved (BOOLEAN): is discussion resolved?
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)
   - New table: `blueprint_comment_replies`
     - id (UUID PK)
     - comment_id (FK, NOT NULL)
     - user_id (FK, NOT NULL)
     - content (TEXT)
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)

2. **Creating Comments**
   - User selects text in blueprint editor
   - Right-click or keyboard shortcut (Ctrl+C for comment, alternative: button appears)
   - Comment dialog appears:
     - Text field with placeholder: "Add your comment..."
     - Character counter (show when >3000 chars)
     - "Comment" button
     - "Cancel" button
     - Optional: tag user with @ mention (typeahead)
   - On creation:
     - Comment saved to database with selected text as anchor
     - Comment badge appears on editor margin (small circle with number)
     - Comment thread opens in side panel (if not already open)
     - Success toast: "Comment added"

3. **Comment Display**
   - Side panel: "Comments" tab in right panel (alongside Agent chat)
     - Header: "Comments" with count (e.g., "3 Comments")
     - Sorted: newest first or by position in document
     - Filter: "All", "Unresolved", "Resolved"
   - Each comment shows:
     - User avatar, name, timestamp (relative, absolute on hover)
     - Anchor text in light gray quote (1 line max, truncated if long)
     - Comment content
     - "Reply" button
     - "Resolve" button (only visible if not resolved, for comment author or admin)
     - "Delete" button (only visible to author or admin)
     - Reply count (if >0): "[N] replies"
     - "Show replies" / "Hide replies" toggle

4. **Comment Threads**
   - Click comment or "Show replies" to expand thread
   - Shows replies in chronological order (oldest first)
   - Each reply shows:
     - User avatar, name, timestamp
     - Reply content
     - Delete button (for author or admin)
   - Reply input field:
     - Placeholder: "Write a reply..."
     - "Reply" button
     - Character counter (if >1000 chars)

5. **Editing Comments**
   - Click comment, reveal "Edit" button (for author only)
   - Edit dialog opens with current text
   - Edit and click "Save"
   - Changes saved, history logged (shows "Edited X hours ago")
   - Or: in-line editing (click on comment to edit, Ctrl+S to save)

6. **Resolving Comments**
   - "Resolve" button on unresolved comments
   - Click: comment marked as resolved (green checkmark, grayed out)
   - "Reopen" button if resolved (for thread participants)
   - Resolved comments stay in list but de-emphasized
   - Filter "Unresolved" hides resolved comments
   - Notification when comment resolved (for participants)

7. **Comment Anchoring & Robustness**
   - Anchor strategy:
     - Store selected text (anchor_text)
     - Store character position (anchor_position)
     - If text changes, try to find original text nearby
     - If text moved or deleted, show warning: "Original text not found. View context?"
   - Context view: shows surrounding text from version where comment was made
   - Allows viewing comment in historical context

8. **Editor Integration**
   - When comment exists for text section:
     - Comment badge appears on editor left margin
     - Badge shows: comment count (e.g., "2")
     - Badge color: yellow if unresolved, green if resolved
     - Click badge to scroll to comment in panel and highlight text
   - Text highlighting:
     - Unresolved comments: subtle yellow/light orange background
     - Resolved comments: subtle green background
     - Highlight on hover or when comment selected

9. **Mentions & Notifications** (future expansion, initial basic)
   - User can @ mention team members in comments
   - Mention typeahead shows project members
   - Mentioned user gets in-app notification: "[User] mentioned you in [Blueprint Name]"
   - Mentioned user can jump directly to comment

10. **Comment Permissions**
    - View comments: project members
    - Create comments: project members
    - Edit own comment: author only, or project admin
    - Delete own comment: author only, or project admin
    - Resolve comment: author or project admin
    - Can't comment on blueprints user doesn't have access to (RLS)

11. **Comment Activity Log**
    - Comments create activities (Phase 054):
      - "blueprint_commented" action
      - action_details: { comment_id, section, anchor_text }
    - Activity timeline shows comments with timestamp and author

12. **Comments & Status Workflow**
    - Blueprint can't move to "Approved" while unresolved comments exist (optional business rule)
    - Or: warning: "This blueprint has 3 unresolved comments. Continue to approval anyway?"
    - On approval, all comments auto-resolve (optional)
    - Or: mark comments as "Acknowledged" instead of "Resolved"

13. **Comment Export**
    - Download blueprint as markdown with comments as footnotes
    - Or: export comment thread as separate document
    - Format:
      ```
      ## Comment 1 [Section: API Endpoints]
      User: John Doe (2 hours ago)
      Text: "Consider adding pagination..."
      - Reply: Sarah: "Good idea, we'll add..."
      - Reply: John: "Thanks!"
      Status: Resolved
      ```

14. **Search Comments**
    - Search blueprints also searches comments
    - Results include: comment text and related blueprint
    - Click to jump to comment in blueprint view

15. **Threaded Comment UI**
    - Hierarchical display:
      - Top-level comment
      - ├─ Reply 1
      - ├─ Reply 2
      - └─ Reply 3
    - Indentation shows hierarchy
    - Color coding: alternating light backgrounds for replies
    - Thread count badge: shows total replies in collapsed state

16. **Mobile/Responsive**
    - Desktop: comments in right panel, highlighted in editor
    - Mobile: comments slide out from right edge, or bottom sheet

17. **Performance & Caching**
    - Load comments on blueprint view (already loaded)
    - Realtime updates: Supabase realtime subscriptions
    - Cache comments locally while viewing
    - Sync on blueprint save

18. **Accessibility**
    - Comment section has role="region" aria-label="Comments"
    - Comment badge button has aria-label="[N] comments on this section"
    - Comment thread has role="article"
    - Reply input has aria-label="Reply to comment by [User]"
    - Keyboard navigation: Tab through comments, Space to expand thread

19. **Comment Best Practices** (optional guide)
    - Show helpful comment suggestions:
      - "Be specific: reference section name"
      - "Ask questions rather than demand changes"
      - "Acknowledge good work"
    - Display in comment field as hints

**Database Schema**
```sql
CREATE TABLE blueprint_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  anchor_text VARCHAR(500) NOT NULL,
  anchor_position INTEGER NOT NULL,
  section_title VARCHAR(255),
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 5000),
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE blueprint_comment_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES blueprint_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 5000),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_blueprint_comments_blueprint_id ON blueprint_comments(blueprint_id);
CREATE INDEX idx_blueprint_comments_user_id ON blueprint_comments(user_id);
CREATE INDEX idx_blueprint_comments_resolved ON blueprint_comments(resolved);
CREATE INDEX idx_blueprint_comment_replies_comment_id ON blueprint_comment_replies(comment_id);

-- RLS
ALTER TABLE blueprint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY blueprint_comments_select ON blueprint_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blueprints b
      INNER JOIN project_members pm ON b.project_id = pm.project_id
      WHERE b.id = blueprint_comments.blueprint_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY blueprint_comments_insert ON blueprint_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM blueprints b
      INNER JOIN project_members pm ON b.project_id = pm.project_id
      WHERE b.id = blueprint_comments.blueprint_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY blueprint_comments_update_own ON blueprint_comments
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM blueprints b
      INNER JOIN project_members pm ON b.project_id = pm.project_id
      WHERE b.id = blueprint_comments.blueprint_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Similar policies for blueprint_comment_replies
```

**API Routes**
```
GET /api/projects/[projectId]/blueprints/[blueprintId]/comments
  Returns: {
    comments: [
      {
        id,
        user: { id, name, avatar_url },
        anchor_text,
        anchor_position,
        section_title,
        content,
        resolved,
        created_at,
        updated_at,
        replies: [
          { id, user, content, created_at, updated_at }
        ],
        reply_count: number
      }
    ]
  }

POST /api/projects/[projectId]/blueprints/[blueprintId]/comments
  Body: {
    anchor_text: string,
    anchor_position: number,
    section_title?: string,
    content: string
  }
  Returns: { id, created_at, ... }

PATCH /api/projects/[projectId]/blueprints/[blueprintId]/comments/[commentId]
  Body: { content?, resolved? }
  Returns: updated comment

DELETE /api/projects/[projectId]/blueprints/[blueprintId]/comments/[commentId]
  Returns: { deleted: true }

POST /api/projects/[projectId]/blueprints/[blueprintId]/comments/[commentId]/replies
  Body: { content: string }
  Returns: { id, created_at, ... }

PATCH /api/projects/[projectId]/blueprints/[blueprintId]/comments/[commentId]/replies/[replyId]
  Body: { content: string }
  Returns: updated reply

DELETE /api/projects/[projectId]/blueprints/[blueprintId]/comments/[commentId]/replies/[replyId]
  Returns: { deleted: true }
```

**UI Components**
- `BlueprintComments` (main comments panel)
- `CommentThread` (single comment with replies)
- `CommentForm` (input for new comment)
- `CommentReplyForm` (input for reply)
- `CommentBadge` (badge on editor margin)
- `EditorCommentHighlight` (highlight in editor)
- `ResolvedCommentBadge` (resolved indicator)
- `CommentFilter` (All/Unresolved/Resolved)

**File Structure**
```
app/
  api/
    projects/
      [projectId]/
        blueprints/
          [blueprintId]/
            comments/
              route.ts (GET list, POST create)
              [commentId]/
                route.ts (PATCH, DELETE)
                replies/
                  route.ts (POST reply)
                  [replyId]/
                    route.ts (PATCH, DELETE reply)
  components/
    room/
      BlueprintComments.tsx
      CommentThread.tsx
      CommentForm.tsx
      CommentReplyForm.tsx
      CommentBadge.tsx
      CommentFilter.tsx
      ResolvedCommentBadge.tsx
  lib/
    supabase/
      migrations/
        20260220_create_blueprint_comments.sql
```

**Acceptance Criteria**
- [ ] Users can select text and create comment
- [ ] Comment dialog appears with text input
- [ ] Comment saved to database and appears in comments panel
- [ ] Comments panel shows comment count
- [ ] Each comment shows user, timestamp, anchor text, content
- [ ] Comment badge appears on editor margin
- [ ] Clicking badge scrolls to comment in panel
- [ ] Text with comment highlighted in editor (unresolved=yellow, resolved=green)
- [ ] Users can reply to comments
- [ ] Reply threads show chronologically
- [ ] Resolve button marks comment as resolved
- [ ] Resolved comments de-emphasized in UI
- [ ] Filter "Unresolved" hides resolved comments
- [ ] Users can edit their own comments
- [ ] Users can delete their own comments
- [ ] Admin can delete any comment
- [ ] Comments appear in activity log (Phase 054)
- [ ] Comment count displayed in blueprint header
- [ ] RLS prevents accessing comments for other projects
- [ ] Comments survive blueprint edits (anchoring works)
- [ ] Comment threads work with realtime updates
- [ ] Typeahead mention suggestions appear on @
- [ ] Mentioned user gets notification (if implemented)
- [ ] Comment export works (download as markdown)
- [ ] Search finds comments in blueprints

**Testing Instructions**
1. Open blueprint in editor
2. Select text in middle of blueprint (e.g., in API Endpoints section)
3. Right-click and select "Add comment" (or use keyboard shortcut)
4. Verify comment dialog appears
5. Type comment: "Consider adding pagination parameter"
6. Click "Comment" and verify comment saved
7. Verify comment appears in Comments panel on right
8. Verify comment shows user avatar, name, timestamp
9. Verify anchor text displays in light gray
10. Verify comment badge (number) appears on left margin of editor
11. Click comment badge and verify highlights corresponding text
12. Verify text highlighted in yellow (unresolved color)
13. Click "Reply" and add reply: "Good idea, we'll add limit/offset"
14. Verify reply appears in thread under comment
15. Click second user's reply button and add reply
16. Verify thread shows all replies in chronological order
17. Click "Resolve" button on main comment
18. Verify comment marked as resolved (green, grayed out)
19. Verify text highlight color changes to green
20. Click "Reopen" to reopen resolved comment
21. Verify comment becomes unresolved
22. Click filter "Unresolved" and verify resolved comments hidden
23. Edit your own comment: click edit, change text, save
24. Verify updated comment shows "Edited X hours ago"
25. Delete a reply and verify it's removed from thread
26. Try to delete someone else's comment (should fail or show warning)
27. Admin user deletes comment and verify it's removed
28. Create comment on different section
29. Verify Comments panel shows both comments
30. Verify section title displays for each comment
31. Navigate away and back to blueprint
32. Verify all comments still present (persisted)
33. Open blueprint in second browser session
34. First session creates comment
35. Verify second session sees comment in real-time (realtime sync)
36. Try to move blueprint to Approved with unresolved comments
37. Verify warning appears (if business rule enabled)
38. Search blueprints and verify comments appear in search results
39. Click comment result and verify jump to that blueprint
40. Export blueprint as markdown and verify comments included
41. Test accessibility: use keyboard to navigate comments
42. Verify Tab navigates through comment elements
43. Verify screen reader reads comment content

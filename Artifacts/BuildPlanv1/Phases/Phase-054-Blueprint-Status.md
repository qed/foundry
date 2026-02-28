# Phase 054 - Blueprint Status Tracking

**Objective:** Implement blueprint status workflow with visual tracking, state transitions, and activity logging.

**Prerequisites:**
- Phase 046 (Database schema with status enum)
- Phase 047 (Control Room layout)
- Phase 048-051 (All blueprint types)

**Context:**
Blueprints progress through a lifecycle: Draft → In Review → Approved → Implemented. Status tracking helps teams coordinate blueprint review and signals when a blueprint is ready for engineering implementation. Visual badges and activity logs provide transparency into blueprint maturity and history.

**Detailed Requirements:**

1. **Blueprint Status Enum**
   - Values: 'draft', 'in_review', 'approved', 'implemented'
   - Default: 'draft' for new blueprints
   - Stored in blueprints table `status` column (enum type)

2. **Status Descriptions**
   - **Draft**: Blueprint is being written, not ready for review
   - **In Review**: Blueprint is ready for team review and feedback
   - **Approved**: Blueprint has been reviewed and approved, ready for implementation
   - **Implemented**: Feature/blueprint has been implemented in production

3. **Status Transitions**
   - Allowed transitions (one-way flow):
     - Draft → In Review
     - Draft → Approved (skip review, direct approval)
     - In Review → Approved
     - In Review → Draft (revert for more work)
     - Approved → Implemented
     - Approved → In Review (revert for changes)
     - Any status → Draft (revert to draft)
   - Transition permissions:
     - Any project member can change to Draft
     - Project members can move to In Review
     - Project admins required to move to Approved or Implemented
   - Validation: prevent invalid transitions (e.g., Implemented → Draft?)
     - Allow reverting from Implemented (for rare corrections)

4. **Status Badge Design**
   - Badge colors and styles:
     - Draft: gray background, white text "Draft"
     - In Review: yellow/amber background, dark text "In Review"
     - Approved: green background, white text "Approved"
     - Implemented: blue background, white text "Implemented"
   - Size: 14px font, 4px vertical padding, 8px horizontal padding, rounded corners
   - Located in: blueprint list item (left panel), blueprint header (center panel), blueprint tree node icon overlay
   - Hover tooltip: shows status and last changed by, when

5. **Status Dropdown/Selector**
   - In blueprint header (center panel):
     - Button/dropdown: shows current status with badge color
     - Click opens dropdown menu
     - List of allowed next statuses:
       - "Draft"
       - "In Review"
       - "Approved" (admin only, grayed if not admin)
       - "Implemented" (admin only, grayed if not admin)
     - Selecting status shows confirmation dialog (for final states):
       - Dialog: "Change blueprint status to [New Status]?"
       - Text: "This action [description of impact]"
       - "Confirm" and "Cancel" buttons
   - Keyboard shortcut: Alt+S to focus status dropdown

6. **Activity/Audit Log**
   - Table: `blueprint_activities` (new, created via trigger)
     - Columns:
       - id (UUID PK)
       - blueprint_id (FK)
       - user_id (FK)
       - action (enum: 'created', 'status_changed', 'content_updated', 'reviewed', 'commented')
       - action_details (JSONB): e.g., { from_status: 'draft', to_status: 'in_review' }
       - created_at (TIMESTAMP)
   - Triggers:
     - On blueprint created: insert activity 'created'
     - On blueprint status changed: insert activity 'status_changed'
     - On blueprint content updated: insert activity 'content_updated'
   - Activity visible in blueprint detail view (timeline or list)

7. **Activity Timeline**
   - Right sidebar or collapsed panel in blueprint header
   - Timeline of activities:
     - "Blueprint created by [user] on [date]"
     - "[User] changed status from Draft to In Review on [date]"
     - "[User] updated content on [date]"
     - "[User] added comment on [date]"
   - Each activity shows:
     - Icon (creation, status change, edit, comment)
     - Description
     - User avatar and name
     - Relative timestamp ("2 hours ago", "Yesterday")
     - Full timestamp on hover
   - Sortable: newest first (default) or oldest first
   - Filterable: filter by action type (optional)

8. **Status Metrics & Reporting**
   - Control Room dashboard (future phase):
     - Count of blueprints by status
     - Blueprint age (days since created)
     - Blueprints pending review (in_review status)
     - Blueprints ready for implementation (approved status)
   - Blueprint list filters by status (Phase 055)
   - API endpoint for status metrics:
     - `GET /api/projects/[projectId]/blueprints/stats`
     - Returns: { by_status: { draft: count, in_review: count, ... }, avg_age: days, ... }

9. **Status Change Notifications** (future: Phase TBD)
   - When blueprint status changes:
     - Notify team members in realtime (Supabase realtime)
     - Email notification (optional, configurable)
     - Activity log entry created
   - Notifications include:
     - Blueprint title
     - Old and new status
     - Changed by [user]
     - Link to blueprint

10. **Status Persistence & Conflicts**
    - Optimistic UI: show status change immediately
    - Validate on server: re-check permissions and valid transition
    - If invalid: show error toast, revert status to previous
    - Realtime sync: if status changes by another user, update UI
    - Conflict resolution: last-write-wins (timestamp-based)

11. **Review Checklist** (Phase 058: Blueprint Review)
    - When moving to In Review, optional checklist:
      - [ ] Solution overview complete
      - [ ] API endpoints documented
      - [ ] UI components specified
      - [ ] Data model defined
      - [ ] Tests specified
      - [ ] Dependencies identified
    - Checklist is informational (doesn't block status change)
    - Shows as part of review process

12. **Status in Feature-Blueprint Context**
    - Blueprint status shown on feature node in both Pattern Shop and Control Room
    - Feature node visual indicator (icon) reflects blueprint status
    - Feature cannot be marked as "Done" if blueprint not "Approved"
    - Future: block feature implementation until blueprint approved

**Database Schema**
```sql
-- Activity log table
CREATE TABLE blueprint_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'status_changed', 'content_updated', 'reviewed', 'commented'
  action_details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_blueprint_activities_blueprint_id ON blueprint_activities(blueprint_id);
CREATE INDEX idx_blueprint_activities_user_id ON blueprint_activities(user_id);
CREATE INDEX idx_blueprint_activities_created_at ON blueprint_activities(created_at DESC);

-- Enable RLS
ALTER TABLE blueprint_activities ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view activities for blueprints they can access
CREATE POLICY blueprint_activities_select ON blueprint_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blueprints b
      INNER JOIN project_members pm ON b.project_id = pm.project_id
      WHERE b.id = blueprint_activities.blueprint_id
      AND pm.user_id = auth.uid()
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION log_blueprint_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO blueprint_activities (blueprint_id, user_id, action, action_details)
  VALUES (NEW.id, NEW.created_by, 'created', jsonb_build_object('blueprint_type', NEW.blueprint_type));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprint_created_activity
AFTER INSERT ON blueprints
FOR EACH ROW
EXECUTE FUNCTION log_blueprint_created();

CREATE OR REPLACE FUNCTION log_blueprint_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO blueprint_activities (blueprint_id, user_id, action, action_details)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprint_status_change_activity
AFTER UPDATE ON blueprints
FOR EACH ROW
EXECUTE FUNCTION log_blueprint_status_change();
```

**API Routes**
```
PATCH /api/projects/[projectId]/blueprints/[blueprintId]
  Body: { status: 'draft' | 'in_review' | 'approved' | 'implemented' }
  Returns: { id, status, updated_at, ... }
  Status codes:
    - 200: Success
    - 403: Forbidden (insufficient permissions for this transition)
    - 400: Bad request (invalid transition)

GET /api/projects/[projectId]/blueprints/[blueprintId]/activities
  Returns: { activities: [...] }

GET /api/projects/[projectId]/blueprints/stats
  Returns: {
    by_status: { draft: 5, in_review: 2, approved: 8, implemented: 3 },
    avg_age_days: 14,
    pending_review: 2,
    ready_for_implementation: 8
  }
```

**UI Components**
- `BlueprintStatusBadge` (badge showing status)
- `BlueprintStatusDropdown` (dropdown selector)
- `BlueprintActivityTimeline` (activity log view)
- `BlueprintActivityItem` (single activity in timeline)
- `StatusTransitionConfirmDialog` (confirmation dialog)
- `BlueprintStatsCard` (dashboard card)

**File Structure**
```
app/
  api/
    projects/
      [projectId]/
        blueprints/
          [blueprintId]/
            route.ts (PATCH status)
            activities/
              route.ts (GET activities)
          stats/
            route.ts (GET stats)
  components/
    room/
      BlueprintStatusBadge.tsx
      BlueprintStatusDropdown.tsx
      BlueprintActivityTimeline.tsx
      BlueprintActivityItem.tsx
  lib/
    supabase/
      migrations/
        20260220_create_blueprint_activities.sql
```

**Acceptance Criteria**
- [ ] Status enum created in database with 4 values
- [ ] New blueprints default to 'draft' status
- [ ] Status badge displays in blueprint list with correct color
- [ ] Status badge displays in blueprint header with correct color
- [ ] Status dropdown shows current status
- [ ] Clicking status dropdown opens menu with allowed transitions
- [ ] Selecting status from dropdown shows confirmation dialog
- [ ] Confirming status change updates database and UI
- [ ] Status change creates activity log entry
- [ ] Activity timeline shows all blueprint activities
- [ ] Activities show user name, action, and timestamp
- [ ] Permissions enforced: admin required for Approved/Implemented
- [ ] Trigger fires on blueprint creation to log 'created' activity
- [ ] Trigger fires on status change to log 'status_changed' activity
- [ ] RLS prevents viewing activities for blueprints user cannot access
- [ ] Status badge shows on feature nodes (green if approved/implemented, yellow if in_review, gray if draft)
- [ ] API endpoint returns stats by status
- [ ] Realtime updates: if another user changes status, UI updates
- [ ] Invalid transitions blocked with error message
- [ ] Reverting from Implemented status allowed (for corrections)
- [ ] Filter by status works in blueprint list (Phase 055)

**Testing Instructions**
1. Create new blueprint and verify status defaults to 'draft'
2. Verify draft badge appears gray in blueprint list and header
3. Click status dropdown in blueprint header
4. Verify dropdown shows: Draft, In Review, Approved (grayed), Implemented (grayed)
5. Select "In Review" from dropdown
6. Verify confirmation dialog appears
7. Click confirm and verify:
    - Status updates to in_review
    - Badge updates to yellow
    - Activity log entry created
8. Navigate to activity timeline and verify "changed status from draft to in_review" entry shows
9. Change status to "Approved" and verify permission error (non-admin)
10. Login as project admin and change status to Approved
11. Verify badge updates to green
12. Change status to Implemented
13. Verify badge updates to blue
14. Try to change status from Implemented to Draft
15. Verify transition allowed (for corrections)
16. Create multiple blueprints with different statuses
17. View Control Room dashboard or blueprint stats API endpoint
18. Verify counts by status show correct numbers
19. Test feature node icon: create feature blueprint in draft, verify icon shows gray
20. Change blueprint to approved, verify feature node icon shows green (realtime)
21. Test filter by status: click "Draft" tab in status filter
22. Verify only draft blueprints display
23. Switch to "In Review" tab and verify only in_review blueprints display
24. Test activity timeline sorting: verify newest first (default)
25. Verify activity shows user avatar, name, and full timestamp on hover
26. Test permissions: non-admin tries to move blueprint to Approved (should fail)
27. Test realtime: have two browsers open same blueprint, change status in one, verify updates in other
28. Verify activity log pagination (if lots of activities)
29. Test that content updates don't change status
30. Verify status persists after page refresh

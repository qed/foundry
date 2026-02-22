# Phase 052 - Feature-Blueprint Linking

**Objective:** Enforce and visualize the 1:1 relationship between feature nodes and blueprints with visual indicators and bidirectional navigation.

**Prerequisites:**
- Phase 026 (Pattern Shop feature tree)
- Phase 029 (Feature node detail view)
- Phase 046 (Database schema)
- Phase 051 (Feature blueprints)

**Context:**
Each feature in the Pattern Shop must have exactly one corresponding blueprint in the Control Room. This phase ensures the relationship is enforced, visible, and easily navigable in both directions. Users can quickly see which features have blueprints, which are missing, and navigate seamlessly between Pattern Shop and Control Room.

**Detailed Requirements:**

1. **Unique Constraint (Database Level)**
   - Already implemented in Phase 046:
     ```sql
     UNIQUE (project_id, feature_node_id)
     WHERE feature_node_id IS NOT NULL
     ```
   - Prevents duplicate blueprints for same feature
   - Application-level validation also enforces this

2. **Visual Indicator in Feature Tree (Pattern Shop)**
   - Feature nodes in Pattern Shop tree display blueprint status icon/badge:
     - **Green checkmark** (✓): Blueprint exists and status = 'approved' or 'implemented'
     - **Yellow dot** (◆): Blueprint exists but status = 'in_review'
     - **Gray dot** (◆): Blueprint exists but status = 'draft'
     - **Red X** (✗): No blueprint exists for this feature
   - Icon position: right side of feature node name
   - Hover tooltip:
     - If blueprint exists: "Blueprint: [status]" (draft | in_review | approved | implemented)
     - If no blueprint: "No blueprint - click to create"
   - Size: 16px icon, subtle color
   - Update in real-time when blueprint status changes

3. **Visual Indicator in Control Room**
   - Feature Blueprint tree in left panel shows same icons/badges
   - Quick status glance at entire feature tree
   - Helps identify gaps (features without blueprints)

4. **Feature Node Detail View Integration (Pattern Shop)**
   - Page: `/org/[orgSlug]/project/[projectId]/features/[featureNodeId]`
   - Right side panel or header area:
     - **Blueprint Status Card**:
       - Shows blueprint status (draft/in_review/approved/implemented)
       - Shows "Last updated [date] by [user name]"
       - "View Blueprint" button (link to Control Room)
       - "Edit Blueprint" button (link to Control Room, focus on editor)
     - Or **"Create Blueprint" CTA** if no blueprint exists:
       - "No blueprint exists for this feature"
       - "Create Blueprint" button
       - "Learn why this matters" link (to documentation)
   - Blueprint card also shows:
     - Blueprint creation date
     - Author name
     - Last modified date and author

5. **Control Room Feature Detail Integration**
   - Feature Blueprint view header shows:
     - Feature name and icon
     - Breadcrumb: Feature Category > Feature Name
     - "View Feature" link (blue link icon, navigates to Pattern Shop)
     - Copy feature node ID button (if needed)
   - Banner at top if feature has been updated since blueprint last saved:
     - "Feature requirements updated since last blueprint change"
     - "Review changes" link (shows diff or feature requirements sidebar)

6. **Blueprint Status Synchronization**
   - When blueprint status changes:
     - Feature tree icon updates immediately
     - Pattern Shop feature detail card updates
     - Supabase realtime subscription updates all viewers
   - When feature node changes (name, description, requirements):
     - Feature tree reflects name change
     - Blueprint title reflects name change (auto-sync)
     - Optional: show "Feature changed" notification on blueprint

7. **Create Blueprint Workflow**
   - Pattern Shop feature detail: click "Create Blueprint" button
   - Options:
     - Option A: Inline creation
       - Show loading state
       - Create blueprint in background
       - Show success toast with "View Blueprint" link
     - Option B: Modal form
       - Confirm feature name
       - Select template override
       - "Create" button
   - After creation:
     - Feature tree icon updates to status badge
     - Feature detail card shows "View Blueprint" button
     - Optional: navigate to Control Room with blueprint open

8. **Navigation Patterns**
   - **From Pattern Shop to Control Room**:
     - Feature detail → "View Blueprint" button → opens Control Room with feature blueprint selected and editor focused
     - Feature tree → right-click feature node → "View Blueprint" → opens Control Room
   - **From Control Room to Pattern Shop**:
     - Feature Blueprint header → "View Feature" link → opens Pattern Shop feature detail
     - Feature tree → click "View Feature" icon on feature node → opens Pattern Shop
   - All navigation preserves project context and opens in new tab or same window

9. **Warning for Missing Blueprints**
   - Feature tree visual indicates missing blueprints (red X icon)
   - Pattern Shop dashboard: optional "Missing Blueprints" widget
     - Shows count of features without blueprints
     - "Create blueprints" button links to Control Room with "Features" filter showing only features without blueprints
   - Control Room dashboard: optional widget showing features without blueprints

10. **Data Consistency**
    - Cascade delete: if feature_node deleted, blueprint deleted
    - Or: soft-delete blueprint, show as archived
    - If blueprint deleted, feature node still exists (feature not deleted)
    - If feature_node renamed, blueprint title auto-updates
    - Sync happens via triggers or application logic

11. **Bidirectional Search**
    - Pattern Shop search includes blueprint status in results
      - Feature name (blueprint: [status])
    - Control Room search includes feature path in results
      - Feature name > Blueprint (in [category path])

12. **API Support**
    - `GET /api/projects/[projectId]/blueprints/missing`
      - Returns features without blueprints
      - Used by dashboard widgets
    - `GET /api/features/[featureNodeId]`
      - Returns feature node with associated blueprint (if exists)
    - `POST /api/features/[featureNodeId]/blueprints`
      - Creates blueprint for feature
      - Returns blueprint object

13. **Realtime Updates**
    - Use Supabase realtime subscriptions
    - When blueprint status changes → update feature tree icons across all clients
    - When feature renamed → update blueprint title across all clients
    - Optimistic UI updates with rollback on error

14. **Permissions**
    - Viewing feature blueprint link: same as viewing feature (project member)
    - Creating blueprint: project member (not read-only)
    - Editing blueprint: project member
    - Deleting blueprint: project admin

**UI Components**
- `BlueprintStatusIcon` (icon component: checkmark, dot, X, or placeholder)
- `BlueprintStatusBadge` (badge showing status text)
- `BlueprintStatusCard` (feature detail card showing blueprint info)
- `CreateBlueprintBanner` (in feature detail if no blueprint)
- `FeatureBlueprintLink` (link component with icon)
- `MissingBlueprintsList` (widget showing features without blueprints)
- `FeatureAndBlueprintBreadcrumb` (breadcrumb in both views)

**File Structure**
```
app/
  api/
    features/
      [featureNodeId]/
        route.ts (GET with blueprint included)
        blueprints/
          route.ts (POST create blueprint)
    projects/
      [projectId]/
        blueprints/
          missing/
            route.ts (GET features without blueprints)
  components/
    pattern-shop/
      FeatureDetail/
        BlueprintStatusCard.tsx
        CreateBlueprintBanner.tsx
      FeatureTree/
        BlueprintStatusIcon.tsx
    room/
      FeatureBlueprintHeader.tsx (shows "View Feature" link)
  lib/
    hooks/
      useBlueprintStatus.ts (realtime subscription to blueprint)
      useMissingBlueprints.ts (fetch features without blueprints)
```

**Acceptance Criteria**
- [ ] Blueprint status icon displays in Pattern Shop feature tree
- [ ] Icon colors correct: green (approved/implemented), yellow (in_review), gray (draft), red (missing)
- [ ] Hover tooltip shows blueprint status or "No blueprint"
- [ ] Feature detail card displays blueprint status if blueprint exists
- [ ] Feature detail shows "Create Blueprint" CTA if no blueprint
- [ ] "View Blueprint" link navigates to Control Room with correct blueprint
- [ ] "Create Blueprint" button creates blueprint and updates feature tree icon immediately
- [ ] Feature Blueprint header shows "View Feature" link
- [ ] "View Feature" link navigates to Pattern Shop feature detail with correct feature
- [ ] Blueprint title syncs when feature name changes
- [ ] Feature tree icon updates in real-time when blueprint status changes (realtime)
- [ ] Cascade delete works: deleting feature deletes blueprint
- [ ] Unique constraint prevents duplicate blueprints per feature
- [ ] Dashboard widget shows count of missing blueprints
- [ ] Search results include feature/blueprint context
- [ ] API returns features with associated blueprints
- [ ] Permissions enforced: non-project-members cannot view/edit blueprints
- [ ] Breadcrumbs show correct path in both Pattern Shop and Control Room
- [ ] Navigation preserves project context
- [ ] Right-click context menu on feature node includes "View Blueprint" option

**Testing Instructions**
1. Navigate to Pattern Shop and view feature tree
2. Verify features without blueprints show red X icon
3. Create blueprint for a feature and verify icon updates to gray (draft)
4. Change blueprint status to in_review and verify icon updates to yellow (realtime)
5. Change blueprint status to approved and verify icon updates to green
6. Click feature node icon and verify tooltip shows correct status
7. Navigate to feature detail view
8. Verify "Create Blueprint" banner appears if no blueprint
9. Click "Create Blueprint" button
10. Verify blueprint created in database
11. Verify feature detail card now shows blueprint status instead of banner
12. Click "View Blueprint" button and verify navigates to Control Room with blueprint open
13. In Control Room feature blueprint view, click "View Feature" link
14. Verify navigates back to Pattern Shop feature detail
15. Rename feature in Pattern Shop
16. Verify blueprint title updates automatically
17. Change blueprint status in Control Room
18. Return to Pattern Shop and verify feature tree icon reflects new status
19. Delete blueprint from Control Room
20. Verify feature tree icon returns to red X
21. Verify feature detail banner shows "Create Blueprint" again
22. Try to create two blueprints for same feature (should fail)
23. Test cascade delete: delete feature from feature tree
24. Verify blueprint also deleted from Control Room
25. Navigate to Control Room "Missing Blueprints" widget
26. Verify lists features without blueprints
27. Click feature in missing blueprints list and verify "Create Blueprint" form opens
28. Test search in Pattern Shop: search for feature name, verify blueprint status shows in result
29. Test right-click context menu on feature node, select "View Blueprint"
30. Verify realtime updates work: have two browsers open, change blueprint status in one, verify updates in other

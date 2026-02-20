# Phase 125: Control Room - Cross-Document Suggestions

## Objective
Enable the Pattern Shop Agent to suggest coordinated edits across multiple blueprints when an architectural change affects several documents. Provide a batch review workflow for applying changes across blueprints.

## Prerequisites
- Phase 057: Control Room - Blueprint Collaboration (comment/suggestion system)
- Phase 046: Control Room - Blueprint Basics (blueprint structure)
- Phase 037: Pattern Shop - Agent Integration (agent capabilities)
- Drift detection understanding (Phase 124)

## Context
When a significant architectural change is made (e.g., API schema update, data model change), multiple blueprints may need coordinated updates. Instead of making individual suggestions per blueprint, the agent can propose a set of related edits with explanations of how they interconnect, then teams can review and apply all at once.

## Detailed Requirements

### Cross-Document Suggestion Structure
```sql
CREATE TABLE cross_doc_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  created_by UUID REFERENCES auth.users(id),
  trigger_blueprint_id UUID REFERENCES blueprints(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  change_impact TEXT,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'applied')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  applied_at TIMESTAMP,
  applied_by UUID REFERENCES auth.users(id)
);

CREATE TABLE cross_doc_suggestion_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES cross_doc_suggestions(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES blueprints(id),
  suggestion_type TEXT CHECK (suggestion_type IN ('edit', 'add_section', 'remove_section')),
  target_section TEXT,
  current_content TEXT,
  proposed_content TEXT,
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_cross_doc_suggestions_project ON cross_doc_suggestions(project_id);
CREATE INDEX idx_cross_doc_suggestions_status ON cross_doc_suggestions(status);
```

### Agent Integration
- Pattern Shop Agent detects when a change affects multiple blueprints
- Agent calls API to create cross-doc suggestion:
  ```
  POST /api/projects/:projectId/blueprints/cross-doc-suggestions
  {
    "title": "API Authentication Schema Update",
    "description": "Update all blueprints to reflect new OAuth2 flow",
    "triggerBlueprintId": "...",
    "changeImpact": "High - affects all authentication-related blueprints",
    "items": [
      {
        "blueprintId": "...",
        "suggestionType": "edit",
        "targetSection": "Authentication Flow",
        "currentContent": "...",
        "proposedContent": "...",
        "reasoning": "Must align with new OAuth2 spec"
      },
      ...
    ]
  }
  ```

### Cross-Doc Suggestion UI
- **Suggestion Card in Blueprint View:**
  - "Related Changes" widget in blueprint sidebar
  - Shows pending cross-doc suggestions affecting this blueprint
  - Links to full suggestion review

- **Batch Suggestion Review Modal:**
  - Triggered from Control Room dashboard or blueprint view
  - Title and description of overall change
  - "Change Impact" explanation
  - Tabbed view of affected blueprints
  - For each blueprint:
    - Blueprint name
    - List of proposed edits:
      - Target section
      - Current content (left panel, diff-highlighted)
      - Proposed content (right panel, diff-highlighted)
      - Reasoning for change
    - Individual edit approve/reject toggles
  - Bottom action bar:
    - "Approve All" button (applies all edits)
    - "Approve Selected" button (applies only checked edits)
    - "Reject All" button
    - "Close" button

- **Approval Workflow:**
  - User reviews each proposed change
  - Can approve/reject individual items or all at once
  - When approved: automatically creates edits in each blueprint
  - Records who approved and when
  - Notification sent to blueprint owners about applied changes

### API Endpoints
- `POST /api/projects/:projectId/blueprints/cross-doc-suggestions` - Create
- `GET /api/projects/:projectId/blueprints/cross-doc-suggestions` - List
- `GET /api/projects/:projectId/blueprints/cross-doc-suggestions/:suggestionId` - Get detail with items
- `PATCH /api/projects/:projectId/blueprints/cross-doc-suggestions/:suggestionId` - Update status
- `POST /api/projects/:projectId/blueprints/cross-doc-suggestions/:suggestionId/apply` - Apply approved changes

### Notification System
- When cross-doc suggestion created: notify all affected blueprint owners
- When suggestion approved/applied: notify owners
- Notification includes: what changed, which blueprints affected, reasoning

## File Structure
```
/app/api/projects/[projectId]/blueprints/cross-doc-suggestions/route.ts
/app/api/projects/[projectId]/blueprints/cross-doc-suggestions/[suggestionId]/route.ts
/app/api/projects/[projectId]/blueprints/cross-doc-suggestions/[suggestionId]/apply/route.ts
/app/components/ControlRoom/CrossDocSuggestion/CrossDocSuggestionModal.tsx
/app/components/ControlRoom/CrossDocSuggestion/SuggestionReviewPanel.tsx
/app/components/ControlRoom/CrossDocSuggestion/SuggestionItemDiff.tsx
/app/components/ControlRoom/BlueprintView/RelatedChangesWidget.tsx
/app/lib/supabase/migrations/create-cross-doc-suggestions.sql
/app/lib/agents/crossDocSuggestionClient.ts
/app/hooks/useCrossDocSuggestions.ts
```

## Acceptance Criteria
- [ ] cross_doc_suggestions and cross_doc_suggestion_items tables created
- [ ] API endpoint to create cross-doc suggestions works
- [ ] Agent can detect multi-blueprint impacts and create suggestions
- [ ] Suggestion includes accurate title, description, and impact summary
- [ ] Batch review modal displays all affected blueprints
- [ ] Diff view shows current vs. proposed content with highlighting
- [ ] Reasoning for each change is visible
- [ ] Individual items can be approved/rejected with checkboxes
- [ ] "Approve All" button applies all changes at once
- [ ] "Approve Selected" applies only checked items
- [ ] Approved changes automatically create edits in blueprints
- [ ] Status updates to "applied" when changes are applied
- [ ] "Related Changes" widget appears on blueprints with pending suggestions
- [ ] Notifications sent to blueprint owners
- [ ] Test with 5+ blueprints affected by single suggestion
- [ ] Rejected suggestions don't create any changes
- [ ] Can view history of applied cross-doc suggestions

## Testing Instructions
1. Create feature tree with 5 interconnected blueprints (auth, API, database, frontend, integration)
2. Simulate architectural change: edit one blueprint's authentication section significantly
3. Trigger agent analysis (via button or automatic detection)
4. Agent should create cross-doc suggestion proposing updates to other blueprints
5. Navigate to Control Room and look for pending cross-doc suggestions
6. Open batch review modal
7. Verify:
   - Title and description are accurate
   - Impact summary explains the change
   - All 4 affected blueprints are listed in tabs
8. Click through each tab and verify:
   - Current content displays correctly
   - Proposed content shows the aligned change
   - Reasoning explains why this blueprint needs to change
9. Approve 3 of the 4 items individually
10. Click "Approve Selected"
11. Verify changes applied to those 3 blueprints
12. Verify the 4th blueprint wasn't modified (was unchecked)
13. Check blueprint views and confirm edits appear in each
14. Verify notification was sent to blueprint owners
15. Go back and check suggestion status is "applied"
16. Test "Reject All" on a new suggestion and verify no changes made

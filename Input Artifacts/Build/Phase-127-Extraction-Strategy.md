# Phase 127: Assembly Floor - Extraction Strategy Config

## Objective
Enable project administrators to configure how the Assembly Floor Agent extracts work orders from blueprints, choosing between feature-slice, specialist-split, or custom instruction-based strategies.

## Prerequisites
- Phase 073: Assembly Floor - Work Order Extraction (basic extraction logic)
- Phase 113: Organization Console (project settings)
- Assembly Floor Agent integration
- Blueprint and work order data structures

## Context
Different teams have different preferences for how work gets broken down. Some prefer organizing by feature (one work order per feature), others split by specialist roles (frontend/backend/database), and others have unique custom needs. Extraction strategy allows teams to tailor how blueprints are converted to work orders.

## Detailed Requirements

### Extraction Strategy Options

**Strategy 1: Feature-Slice (Default)**
- One work order per feature in blueprint
- Covers all implementation aspects (frontend, backend, database) in one WO
- Best for: small features, tight-knit teams, full-stack work
- Example: Feature "User Login" → 1 work order "Implement User Login"

**Strategy 2: Specialist Split**
- Split work by role: Frontend, Backend, Database, QA, DevOps
- Blueprint → multiple work orders organized by specialist
- Best for: large teams, specialized roles, parallel work
- Example: Feature "User Login" → 4 work orders:
  - FE: Build login form UI
  - BE: Implement auth API
  - DB: Create user_sessions table
  - QA: Test login flow

**Strategy 3: Custom Instructions**
- User provides custom extraction instructions in prose
- Agent interprets instructions and extracts accordingly
- Best for: teams with unique workflows
- Example: "Split by persistence layer: one for in-memory, one for DB, one for API calls"

### Database Changes
```sql
ALTER TABLE projects ADD COLUMN extraction_strategy TEXT
  CHECK (extraction_strategy IN ('feature-slice', 'specialist', 'custom'))
  DEFAULT 'feature-slice';

ALTER TABLE projects ADD COLUMN extraction_instructions TEXT;
ALTER TABLE projects ADD COLUMN extraction_strategy_updated_at TIMESTAMP;
```

### Project Settings UI
- New section: "Assembly Floor Configuration"
- Subtitle: "How blueprints are converted to work orders"

- **Strategy Radio Buttons:**
  - Feature-Slice (default)
    - Description: "One work order per feature. Best for small teams."
    - Icon: single box
  - Specialist Split
    - Description: "Split by role. Best for larger teams with specialized roles."
    - Icon: multiple colored boxes
  - Custom
    - Description: "Provide custom instructions for extraction."
    - Icon: customization icon

- **Conditional Field (appears if Custom selected):**
  - "Extraction Instructions" text area (max 1500 chars)
  - Placeholder: "e.g., 'Split each feature into: API layer, UI layer, and Database layer. Assign API to backend, UI to frontend, Database to DBA.'"
  - Character counter

- **Preview Section:**
  - Shows example of how extraction would work with current strategy
  - Input: sample blueprint
  - Output: expected work order breakdown

- Save button with confirmation

### Agent Integration
- When extracting work orders, agent receives `extractionStrategy` in request:
  ```
  POST /api/projects/:projectId/blueprints/:blueprintId/extract-work-orders
  {
    "blueprintId": "...",
    "extractionStrategy": "specialist",
    "extractionInstructions": null
  }
  ```

- Agent system prompt includes strategy:
  ```
  Extraction Strategy: Specialist Split

  Extract work orders by splitting each feature into:
  - Frontend: UI implementation
  - Backend: API and server logic
  - Database: schema and migrations

  Create separate work orders for each specialist area.
  ...
  ```

### API Endpoints
- `PATCH /api/projects/:projectId/settings/extraction-strategy`
  - Request: `{ strategy: string, instructions?: string }`
  - Response: `{ success: boolean, strategy: string }`
  - Validate strategy value and instruction length

### Validation Rules
- Strategy must be one of: 'feature-slice', 'specialist', 'custom'
- Custom instructions max 1500 characters
- If strategy is 'custom', instructions field is required
- Sanitize instructions (no code injection)

### Updating Work Orders from Changed Strategy
- When strategy is updated, option to re-extract work orders from existing blueprints
- Modal: "Update extraction strategy. Do you want to re-extract work orders from existing blueprints with the new strategy?"
- Options: "Re-extract All", "Re-extract New Blueprints Only", "Cancel"
- Deferred work orders (In Progress, Complete) are not re-extracted (only Draft/Proposed)

## File Structure
```
/app/api/projects/[projectId]/settings/extraction-strategy/route.ts
/app/components/Settings/ProjectSettings/ExtractionStrategyConfig.tsx
/app/components/Settings/ProjectSettings/StrategyPreview.tsx
/app/lib/supabase/migrations/add-extraction-strategy.sql
/app/lib/extraction/strategyService.ts
/app/hooks/useExtractionStrategy.ts
/app/lib/agents/extractionClient.ts (updated)
```

## Acceptance Criteria
- [ ] extraction_strategy column added to projects table
- [ ] extraction_instructions column added to projects table
- [ ] Project Settings > Assembly Floor Configuration section available
- [ ] Three strategy radio buttons display with descriptions and icons
- [ ] Feature-Slice selected by default
- [ ] Selecting Custom shows/hides instructions text area appropriately
- [ ] Instructions text area has character counter (max 1500)
- [ ] Instructions are required when Custom strategy selected
- [ ] Save button validates strategy and instructions
- [ ] Sanitization prevents XSS in instructions
- [ ] Confirmation toast shows when strategy updated
- [ ] Agent receives correct extractionStrategy in API call
- [ ] Feature-slice extraction creates one WO per feature
- [ ] Specialist extraction creates separate WOs for FE/BE/DB/QA
- [ ] Custom extraction respects user instructions
- [ ] Strategy preview shows sample work order breakdown
- [ ] Multiple projects can have different strategies
- [ ] Changing strategy doesn't affect existing completed work orders
- [ ] Re-extract option appears and works correctly

## Testing Instructions
1. Go to Project Settings > Assembly Floor Configuration
2. Verify "Feature-Slice" is selected by default
3. Create a blueprint with 3 features
4. Extract work orders and verify 3 work orders created (one per feature)
5. Go back to settings and select "Specialist Split"
6. Confirm re-extraction dialog appears
7. Click "Re-extract All"
8. Go to Assembly Floor and verify work orders now split by role:
   - ~3 Frontend work orders
   - ~3 Backend work orders
   - ~3 Database work orders
   (exact count depends on features)
9. Return to settings and select "Custom"
10. Enter instruction: "Split by persistence: in-memory operations in one WO, database operations in another"
11. Click Save
12. Go to Assembly Floor and verify new extraction strategy followed
13. Create a new blueprint
14. Extract work orders and verify custom strategy applied
15. Test that old completed work orders aren't affected by strategy change
16. Verify instructions character counter limits input to 1500 chars
17. Try entering XSS payload in instructions field: `<script>alert('xss')</script>` - verify it's sanitized
18. Test switching between strategies multiple times
19. Verify each project maintains its own strategy setting independently

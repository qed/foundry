# Phase 071 - Progress Tracking & Rollup

## Objective
Implement progress tracking at work order, phase, feature, and epic levels with automatic rollup calculations and real-time visibility.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 026: Feature Tree (assumed to exist)
- Phase 069: Phases

## Context
Progress visibility at multiple levels enables leadership to track project health and teams to understand their impact on larger goals. A work order marked "done" should automatically increment feature progress, which in turn increments epic progress. Real-time rollup maintains accuracy without manual updates.

## Detailed Requirements

### Completion States

#### Work Order Completion
- Work order status "done" = work order complete
- Other statuses (backlog, ready, in_progress, in_review) = incomplete
- Boolean metric: complete? (status === 'done')

#### Feature Node Completion
- Feature: complete when all linked work orders are done
- Epic: complete when all linked features are done
- Percentage: (completed_count / total_count) * 100
- Display: "5/10 work orders complete (50%)"

#### Phase Completion
- Phase: complete when all work orders in phase are done
- Percentage: (done_count / total_count) * 100
- Display: "3/8 complete" or progress bar

#### Project Progress
- Overall: percentage of all work orders completed
- Display: "48/100 work orders complete (48%)"
- Also phase-level breakdown

### Rollup Calculation

#### Automatic Triggers
- When work order status changes to/from "done": recalculate feature + epic progress
- When work order assigned to/from feature: recalculate feature + epic progress
- When work order assigned to/from phase: recalculate phase progress
- Changes propagate up: work order → feature → epic → project

#### Calculation Logic
```
phase_progress = {
  total: COUNT(work_orders WHERE phase_id = X),
  completed: COUNT(work_orders WHERE phase_id = X AND status = 'done'),
  percentage: (completed / total) * 100
}

feature_progress = {
  total: COUNT(work_orders WHERE feature_node_id = X),
  completed: COUNT(work_orders WHERE feature_node_id = X AND status = 'done'),
  percentage: (completed / total) * 100
}

epic_progress = {
  total: COUNT(features WHERE epic_id = X),
  completed: COUNT(features WHERE epic_id = X AND completion_percentage = 100),
  percentage: (completed / total) * 100
}

project_progress = {
  total: COUNT(work_orders WHERE project_id = X),
  completed: COUNT(work_orders WHERE project_id = X AND status = 'done'),
  percentage: (completed / total) * 100
}
```

#### Performance Optimization
- Denormalize progress fields in features table (optional):
  - feature_nodes.work_order_count (integer)
  - feature_nodes.completed_work_orders (integer)
  - feature_nodes.completion_percentage (numeric)
- Update denormalized fields on work order status change
- Trade-off: slightly stale data (eventual consistency) vs. fast reads

### Database Schema

#### New/Modified Tables

##### feature_nodes table (modify)
```sql
ALTER TABLE feature_nodes ADD COLUMN IF NOT EXISTS
  work_order_count INT DEFAULT 0,
  completed_work_orders INT DEFAULT 0,
  completion_percentage NUMERIC(5, 2) DEFAULT 0;
```

##### phases table (already has counts or will be denormalized)
```sql
ALTER TABLE phases ADD COLUMN IF NOT EXISTS
  work_order_count INT DEFAULT 0,
  completed_work_orders INT DEFAULT 0,
  completion_percentage NUMERIC(5, 2) DEFAULT 0;
```

#### Triggers (optional, for denormalization)
```sql
-- When work order status changes to done/not-done
CREATE OR REPLACE FUNCTION update_feature_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update feature_nodes denormalized counts
  IF NEW.feature_node_id IS NOT NULL THEN
    UPDATE feature_nodes SET
      completed_work_orders = (
        SELECT COUNT(*) FROM work_orders
        WHERE feature_node_id = NEW.feature_node_id
        AND status = 'done'
      ),
      work_order_count = (
        SELECT COUNT(*) FROM work_orders
        WHERE feature_node_id = NEW.feature_node_id
      )
    WHERE id = NEW.feature_node_id;
  END IF;

  IF NEW.phase_id IS NOT NULL THEN
    UPDATE phases SET
      completed_work_orders = (
        SELECT COUNT(*) FROM work_orders
        WHERE phase_id = NEW.phase_id
        AND status = 'done'
      ),
      work_order_count = (
        SELECT COUNT(*) FROM work_orders
        WHERE phase_id = NEW.phase_id
      )
    WHERE id = NEW.phase_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_status_change
AFTER UPDATE ON work_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR
      OLD.feature_node_id IS DISTINCT FROM NEW.feature_node_id OR
      OLD.phase_id IS DISTINCT FROM NEW.phase_id)
EXECUTE FUNCTION update_feature_progress();
```

## API Routes
```
GET /api/projects/[projectId]/progress
  - Get overall project progress
  - Response: {
      project: { total, completed, percentage },
      phases: [ { id, name, total, completed, percentage } ],
      epics: [ { id, name, completion_percentage } ],
      features: [ { id, name, epic_id, completion_percentage } ]
    }
  - Status: 200

GET /api/projects/[projectId]/phases/[phaseId]/progress
  - Get phase-specific progress
  - Response: { id, name, total, completed, percentage, work_orders: [] }
  - Status: 200

GET /api/features/[featureId]/progress
  - Get feature progress (cross-project)
  - Response: { id, name, total_work_orders, completed_work_orders, percentage }
  - Status: 200
```

## UI Components

### New Components
1. **ProjectProgressRing** (`app/components/Assembly/ProjectProgressRing.tsx`)
   - Circular progress ring showing overall project progress
   - Center: percentage "48%"
   - Ring: filled percentage visually
   - Color gradient: gray (0%) → yellow (50%) → green (100%)
   - Size: 120px diameter

2. **PhaseProgressBar** (`app/components/Assembly/PhaseProgressBar.tsx`)
   - Horizontal progress bar for each phase
   - Width: fills column header or tab
   - Background: light gray
   - Filled: color based on percentage (green when 100%)
   - Hover: shows "X/Y complete"
   - Used in PhaseNavigation tabs

3. **FeatureProgressMini** (`app/components/Assembly/FeatureProgressMini.tsx`)
   - Small progress indicator for features
   - Percentage: "45%"
   - Optional mini bar
   - Used in feature tree or work order detail

4. **ProgressSummary** (`app/components/Assembly/ProgressSummary.tsx`)
   - Text summary: "48/100 work orders complete (48%)"
   - Used in header (Phase 062)
   - Updates reactively

### Reused Components
- ProgressBar (from common)
- CircleProgress (from common, or create)

## File Structure
```
app/
  components/
    Assembly/
      ProjectProgressRing.tsx             # Circular progress indicator
      PhaseProgressBar.tsx                # Progress bar for phases
      FeatureProgressMini.tsx             # Feature progress display
      ProgressSummary.tsx                 # Text progress summary
  api/
    projects/
      [projectId]/
        progress/
          route.ts                        # GET project progress
        phases/
          [phaseId]/
            progress/
              route.ts                    # GET phase progress
  lib/
    progress.ts                           # Utility functions for progress calc
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useProjectProgress.ts           # React Query hook for progress
```

## Acceptance Criteria
- Project progress displayed in header: "X/Y complete (Z%)"
- Phase progress shown in phase navigation tabs
- Feature progress accessible from feature tree (or detail)
- Progress updates immediately when work order marked done
- Progress updates when work order marked incomplete
- Progress recalculates when work order assigned to/from feature
- Progress recalculates when work order assigned to/from phase
- Epic progress aggregates from feature progress
- Project progress aggregates from all work orders
- Real-time updates via Supabase Realtime (if implemented)
- Progress bar visual representation accurate
- Denormalized fields (if used) stay in sync
- API endpoints return correct progress data
- No N+1 queries (use indexes and aggregations)

## Testing Instructions

1. **Project Progress Display**
   - Create project with 0 work orders
   - Verify progress shows "0/0 (0%)"
   - Create 10 work orders
   - Verify progress shows "0/10 (0%)"
   - Mark 3 as done
   - Verify progress shows "3/10 (30%)"

2. **Phase Progress**
   - Create 2 phases: "Design" (4 WOs), "Dev" (6 WOs)
   - Design phase tab shows "0/4 (0%)"
   - Dev phase tab shows "0/6 (0%)"
   - Mark 2 Design WOs done
   - Design tab shows "2/4 (50%)"
   - Dev tab still shows "0/6 (0%)"

3. **Progress Rollup on Status Change**
   - Create feature with 2 linked work orders
   - Feature shows "0/2 (0%)"
   - Mark first WO done
   - Feature shows "1/2 (50%)"
   - Mark second done
   - Feature shows "2/2 (100%)"
   - Unmark one (revert to in_progress)
   - Feature shows "1/2 (50%)"

4. **Progress on Feature Assignment**
   - Create 2 features
   - Feature A: 2 work orders, Feature B: 0 work orders
   - Feature A: 1/2 done (50%), Feature B: 0/0 (N/A)
   - Move 1 work order from A to B
   - Feature A: 0/1 (0%), Feature B: 0/1 (0%)
   - Move it back
   - Feature A: 0/2 (0%), Feature B: 0/0 (N/A)

5. **Epic Progress Aggregation**
   - Create epic with 3 features
   - Feature 1: 1/3 done (33%), Feature 2: 2/2 done (100%), Feature 3: 0/5 done (0%)
   - Epic shows: 2/3 features complete (67%) or weighted average
   - Mark Feature 1 complete
   - Epic shows: 3/3 features complete (100%)

6. **Project Progress with Multiple Phases**
   - Create 3 phases with different work order counts
   - Phase 1: 2/5 done (40%)
   - Phase 2: 3/8 done (37.5%)
   - Phase 3: 1/2 done (50%)
   - Project total: 6/15 done (40%)
   - Verify header shows "6/15 complete (40%)"

7. **Progress Bar Visualization**
   - Create phase with 5 work orders, 0 done
   - Phase progress bar: 0% (empty)
   - Mark 2 done
   - Progress bar: 40% filled
   - Mark all done
   - Progress bar: 100% filled (green)

8. **Real-Time Updates**
   - Open progress display in two tabs
   - Tab 1: mark work order done
   - Tab 2: verify progress updates (if using Realtime)
   - Or: refresh Tab 2, verify progress updated

9. **API Endpoint**
   - GET /api/projects/[projectId]/progress
   - Verify returns object with project, phases, epics, features progress
   - Verify counts are accurate
   - Verify percentages calculated correctly

10. **Concurrent Changes**
    - Two users mark different work orders done simultaneously
    - Verify both changes reflected in progress
    - No double-counting or conflicts

11. **Edge Cases**
    - Project with 0 work orders: progress shows 0/0 or N/A
    - Feature with 0 work orders: shows N/A or "No work orders"
    - Unassigned work order: doesn't count toward any feature progress
    - Work order in multiple features (if supported): counts toward all

12. **Performance**
    - Project with 1000 work orders
    - Load progress page
    - Verify load time < 500ms
    - No slow queries in database logs

13. **Denormalized Fields Sync**
    - Verify denormalized counts in feature_nodes match calculated values
    - Update work order status 10x
    - Verify counts stay in sync
    - No stale data visible to users

# Phase 128: Assembly Floor - Phase Burndown

## Objective
Implement phase-level burndown charts showing work order completion progress over time, with velocity calculations and trend analysis.

## Prerequisites
- Phase 071: Assembly Floor - Phase Organization (phases structure)
- Phase 061: Assembly Floor - Work Order CRUD (work order data)
- Chart visualization library (Recharts or Chart.js)
- Work order status tracking

## Context
Development teams need visibility into phase progress to track velocity, forecast completion dates, and identify bottlenecks. Burndown charts provide a visual representation of work remaining versus time elapsed, enabling better planning and communication.

## Detailed Requirements

### Burndown Chart Data Model
```sql
CREATE TABLE phase_burndown_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  phase_id UUID NOT NULL REFERENCES phases(id),
  snapshot_date DATE NOT NULL,
  total_work_orders INTEGER,
  completed_work_orders INTEGER,
  in_progress_work_orders INTEGER,
  remaining_work_orders INTEGER,
  velocity_daily FLOAT,
  estimated_completion_date DATE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(phase_id, snapshot_date)
);

CREATE INDEX idx_burndown_phase ON phase_burndown_snapshots(phase_id);
CREATE INDEX idx_burndown_date ON phase_burndown_snapshots(snapshot_date);
```

### Daily Snapshot Collection
- Scheduled job (runs at end of day, e.g., 11:59 PM)
- Calculates for each phase:
  - Total work orders
  - Count by status (Draft, Proposed, In Progress, In Review, Complete)
  - Velocity: (work orders completed today / work orders total) * 100
  - Estimated completion: based on velocity trend
- Inserts snapshot into phase_burndown_snapshots

### Burndown Chart Visualization
- **Chart Type:** Line chart (Recharts or Chart.js)
- **X-Axis:** Date (from phase start to present, or 30 days)
- **Y-Axis:** Work orders remaining (descending)
- **Data Series:**
  - Actual remaining: line showing real remaining work
  - Ideal trend: reference line showing "ideal" slope to completion
  - Optional: confidence band (±5% variance)

- **Key Metrics Displayed:**
  - Phase name and status
  - Total work orders: X
  - Completed: X
  - Remaining: X
  - Daily velocity: X WOs/day (average last 7 days)
  - Estimated completion: MM/DD/YYYY (based on trend)
  - Days remaining: X

### Phase Burndown View
- Integrated into Assembly Floor Phase Details page
- Tab: "Burndown"
- Chart occupies main area
- Below chart: metrics summary
- Filters:
  - Date range picker (default: last 30 days or since phase start)
  - Granularity: daily or weekly aggregation

### Velocity Analysis
- Velocity calculated as: (work orders completed in period) / (days in period)
- Moving average: 7-day rolling average (smoother trend)
- Velocity trend indicator: arrow up/down if velocity improving/declining
- Comparison: "This week's velocity: X WOs/day vs. average: Y WOs/day"

### Completion Estimation
- Linear extrapolation: if current velocity continues, when will phase complete?
- Formula: remaining_work_orders / daily_velocity = days_to_completion
- Confidence: only estimate if velocity stable (standard deviation <20%)
- Display: "Est. completion: MM/DD/YYYY ±3 days" with confidence indicator

### Edge Cases
- Phase just started (no historical data): show placeholder "Collecting data..."
- Zero velocity: show "On hold" indicator
- Variable velocity: widen confidence band
- Phase complete: show completion date and final statistics

## File Structure
```
/app/api/projects/[projectId]/phases/[phaseId]/burndown/route.ts
/app/api/projects/[projectId]/phases/[phaseId]/burndown/snapshots/route.ts
/app/components/AssemblyFloor/PhaseDetails/BurndownChart.tsx
/app/components/AssemblyFloor/PhaseDetails/BurndownMetrics.tsx
/app/components/AssemblyFloor/PhaseDetails/VelocityAnalysis.tsx
/app/lib/supabase/migrations/create-burndown-snapshots.sql
/app/lib/burndown/burndownService.ts
/app/lib/jobs/dailyBurndownSnapshot.ts
/app/hooks/useBurndownData.ts
```

## Acceptance Criteria
- [ ] phase_burndown_snapshots table created with correct schema
- [ ] Daily scheduled job executes and creates snapshots
- [ ] Snapshots accurately count work orders by status
- [ ] Burndown chart renders correctly with data
- [ ] X-axis shows dates (last 30 days or phase duration)
- [ ] Y-axis shows work orders remaining (descending)
- [ ] Actual remaining line tracks correctly
- [ ] Ideal trend reference line displays
- [ ] Velocity calculation correct (avg last 7 days)
- [ ] Estimated completion date calculated accurately
- [ ] Velocity trend indicator (up/down arrow) works
- [ ] Date range picker filters chart data
- [ ] Weekly granularity option aggregates data correctly
- [ ] Phase with no data shows "Collecting data..." placeholder
- [ ] Metrics summary displays below chart
- [ ] Multiple phases can be compared (different phases have different charts)
- [ ] Completed phases show final completion date and statistics
- [ ] Edge cases handled: zero velocity, variable velocity, early phases

## Testing Instructions
1. Create a phase with 10 work orders
2. Set work orders to various statuses (In Progress, Complete, Draft)
3. Navigate to Assembly Floor > Phase Details > Burndown tab
4. Verify "Collecting data..." message appears (no snapshots yet)
5. Manually trigger daily snapshot job (or wait until end of day)
6. Refresh page and verify burndown chart appears
7. Chart should show:
   - One data point (today's date)
   - Y-axis showing remaining work orders count
8. Create another phase and work on it for 7 days:
   - Day 1: 10 work orders total, 9 remaining
   - Day 2: 9 remaining
   - Day 3: 8 remaining
   - Day 4: 7 remaining
   - Day 5: 6 remaining
   - Day 6: 5 remaining
   - Day 7: 4 remaining
9. After 7 days, view burndown chart
10. Verify line chart shows downward trend
11. Verify velocity calculated: ~1.4 WOs/day
12. Verify estimated completion shows reasonable date
13. Test date range picker: select last 14 days
14. Verify chart updates to show more data points
15. Test weekly granularity: should average multiple days per point
16. Complete all remaining work orders
17. Verify estimated completion date is today or very soon
18. Complete phase and verify final stats display

## Performance Considerations
- Snapshot table should have index on (phase_id, snapshot_date) for fast queries
- Chart queries limited to 30-90 days by default
- Aggregate queries (velocity) use pre-calculated snapshots, not real-time WO queries
- Lazy load chart data (fetch only when Burndown tab activated)

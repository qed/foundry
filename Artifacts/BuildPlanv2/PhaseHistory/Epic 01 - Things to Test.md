# Epic 1: Foundation & Mode Infrastructure — Things to Test

> Comprehensive testing checklist for Phases 001–008.
> Use this to verify the full Epic 1 build before moving to Epic 2.

---

## Phase 001 — Helix Mode Database Migration

### Database Schema

- [ ] `projects` table has `mode` column with enum type `project_mode` ('open'|'helix'), defaulting to 'open'
- [ ] `helix_steps` table exists with columns: id, project_id, stage_number, step_number, step_key, status, evidence_type, evidence_data, completed_at, completed_by, created_at, updated_at
- [ ] `helix_stage_gates` table exists with columns: id, project_id, stage_number, status, passed_at, passed_by, created_at, updated_at
- [ ] Migration files exist: `042_add_helix_mode.sql`, `043_create_helix_steps.sql`, `044_create_helix_stage_gates.sql`

### Constraints & Indexes

- [ ] `helix_steps` has unique constraint on (project_id, step_key) — inserting a duplicate returns error
- [ ] `helix_stage_gates` has unique constraint on (project_id, stage_number) — inserting a duplicate returns error
- [ ] Check constraint on `helix_steps.status`: only 'locked', 'active', 'complete' allowed — invalid value returns error
- [ ] Check constraint on `helix_stage_gates.status`: only 'locked', 'active', 'passed' allowed
- [ ] Check constraint on `helix_steps.evidence_type`: only 'text', 'file', 'url', 'checklist' allowed
- [ ] Check constraint: `stage_number >= 1 AND stage_number <= 8`
- [ ] Check constraint: `step_number >= 1`
- [ ] Indexes exist: idx_projects_mode, idx_helix_steps_project_id, idx_helix_steps_step_key, idx_helix_steps_status, idx_helix_steps_stage_number, idx_helix_steps_project_stage, idx_helix_stage_gates_project_id, idx_helix_stage_gates_stage_number, idx_helix_stage_gates_status, idx_helix_stage_gates_project_stage

### RLS & Security

- [ ] Query `helix_steps` as a non-project-member user — should return 0 rows
- [ ] Query `helix_steps` as a project-member user — should return rows
- [ ] Same RLS behavior for `helix_stage_gates`

### Foreign Keys & Cascading

- [ ] Delete a project — all related `helix_steps` and `helix_stage_gates` rows are cascade-deleted

### Utility Functions (`lib/db/helix.ts`)

- [ ] `getProjectSteps(projectId)` returns all steps ordered by stage_number, step_number
- [ ] `getStepByKey(projectId, '1.1')` returns the correct step
- [ ] `getStepByKey(projectId, 'nonexistent')` returns null
- [ ] `getProjectStageGates(projectId)` returns all 8 gates ordered by stage_number
- [ ] `getStageGate(projectId, 1)` returns the correct gate
- [ ] `updateStep(projectId, '1.1', { status: 'active' })` updates and returns the step
- [ ] `initializeHelixSteps(projectId, steps)` creates all rows with 'locked' status
- [ ] `initializeStageGates(projectId)` creates 8 gate rows with 'locked' status

### SQL Verification Queries

```sql
-- Verify mode column exists
SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='mode';

-- Verify table schemas
\d helix_steps
\d helix_stage_gates
```

---

## Phase 002 — Mode Context Provider & Toggle

### Context & Hook

- [ ] `useHelixMode()` returns: isHelixMode, toggleMode, currentStage, currentStep, allSteps, stageGates
- [ ] `useHelixMode()` throws if used outside HelixModeProvider
- [ ] HelixModeProvider loads mode + Helix data on mount

### Toggle UI

- [ ] HelixModeToggle appears in project header
- [ ] Toggle shows "Open Mode" with gray indicator when mode is 'open'
- [ ] Toggle shows "Helix Mode" with cyan indicator when mode is 'helix'
- [ ] Clicking toggle in Open Mode switches immediately to Helix Mode
- [ ] Clicking toggle in Helix Mode shows confirmation dialog
- [ ] Cancel in confirmation dialog — mode does NOT change
- [ ] Confirm in confirmation dialog — mode switches back to Open
- [ ] Toggle button is disabled during async operations (loading state)
- [ ] Error message displays when mode toggle fails

### API Endpoints

- [ ] `GET /api/projects/[projectId]/mode` returns `{ mode: 'open' | 'helix' }`
- [ ] `POST /api/projects/[projectId]/mode` with `{ mode: 'helix' }` persists mode change
- [ ] POST returns 403 if user role is not 'owner' or 'admin'
- [ ] POST returns 400 if mode is not 'open' or 'helix'
- [ ] GET and POST return 403 if user is not a project member

### Data Initialization

- [ ] Switching to Helix Mode creates `helix_steps` rows (22 steps)
- [ ] Switching to Helix Mode creates `helix_stage_gates` rows (8 gates)
- [ ] Mode change persists after page refresh

### Edge Cases

- [ ] `canToggleMode` is false when Helix is active and beyond stage 1
- [ ] Error states clear on next successful toggle

---

## Phase 003 — Helix Route Structure

### Route Navigation

- [ ] Navigate to `/org/[orgSlug]/project/[projectId]/helix` with mode='open' — redirects to Open Mode
- [ ] Toggle to Helix Mode, navigate to `/helix` — Helix layout renders
- [ ] Navigate to `/helix/undefined` — shows 404 page with back link to dashboard

### Layout & Loading

- [ ] Helix layout renders with header and sidebar areas
- [ ] Loading skeleton shows while page loads (animate-pulse)
- [ ] Loading skeleton shows 8 skeleton cards in grid

### Dashboard Page

- [ ] Root Helix page displays 8 stage cards
- [ ] Overall progress percentage calculated correctly
- [ ] Current stage highlighted with cyan border

### Route Builders (`types/helix-routes.ts`)

- [ ] `helixRoutes.dashboard(orgSlug, projectId)` returns correct URL
- [ ] `helixRoutes.stage(orgSlug, projectId, stageSlug)` returns correct URL
- [ ] `helixRoutes.step(orgSlug, projectId, stepKey)` returns correct URL
- [ ] `STAGE_NUMBER_TO_SLUG` maps all 8 stage numbers to slugs

### Responsive Layout

- [ ] Stage cards: 1 column on mobile, 2 columns on tablet/desktop (lg breakpoint)

---

## Phase 004 — Helix Sidebar & Navigation Shell

### Sidebar Display

- [ ] All 8 stages appear as collapsible sections
- [ ] Stage 1 is expanded by default; stages 2-8 are collapsed
- [ ] Overall progress percentage shows at top with progress bar
- [ ] Each stage shows title, description, and step count (X/Y)

### Expand/Collapse

- [ ] Clicking stage header toggles expand/collapse with smooth animation
- [ ] Collapse/expand icon animates correctly

### Step Status Icons

- [ ] Locked steps show gray lock icon
- [ ] Active steps show cyan play icon
- [ ] Complete steps show green check icon
- [ ] Current/active step highlighted with cyan accent and left border

### Navigation

- [ ] Clicking locked step — no navigation occurs
- [ ] Clicking active/complete step — navigates to step detail page
- [ ] `useStepNavigation` hook: `goToNextStep()` navigates forward
- [ ] `useStepNavigation` hook: `goToPreviousStep()` navigates backward
- [ ] `canGoNext` and `canGoPrevious` flags are correct

### Responsive Behavior

- [ ] Mobile (375px): fixed positioning with overlay, hamburger toggle (Menu/X icons)
- [ ] Desktop (1024px+): relative, always visible, 288px wide (w-72)

---

## Phase 005 — Stage & Step Data Model

### Configuration Data (`config/helix-process.ts`)

- [ ] `HELIX_STAGES` array has exactly 8 entries
- [ ] Step count per stage: Stage 1 (3), Stage 2 (4), Stage 3 (3), Stage 4 (4), Stage 5 (1), Stage 6 (1), Stage 7 (2), Stage 8 (3) = 21 total
- [ ] Each StageConfig has: number, title, description, steps array, gateCheckDescription, gateCheckItems
- [ ] Each StepConfig has: key, title, description, instructions, actor, evidenceType, evidenceRequirements

### Helper Functions

- [ ] `getStage(1)` returns Planning stage
- [ ] `getStage(9)` returns undefined
- [ ] `getStep('1.1')` returns "Define Project Idea" step
- [ ] `getStep('99.1')` returns undefined
- [ ] `getStageBySlug('discovery')` returns Stage 1
- [ ] `getNextStep('1.3')` returns step 2.1 (crosses stage boundary)
- [ ] `getNextStep('8.3')` returns undefined (last step)
- [ ] `getPreviousStep('2.1')` returns step 1.3 (crosses stage boundary)
- [ ] `getPreviousStep('1.1')` returns undefined (first step)
- [ ] `getTotalSteps()` returns correct count
- [ ] `isValidStepKey('1.1')` returns true
- [ ] `isValidStepKey('99.1')` returns false
- [ ] `isValidStepKey('abc')` returns false
- [ ] `getStepsForStage(2)` returns 4 documentation steps

### Type Exports

- [ ] ActorType exported: 'human', 'claude', 'both'
- [ ] EvidenceType exported: 'text', 'file', 'url', 'checklist'
- [ ] StepConfig, StageConfig, EvidenceRequirement interfaces exported

---

## Phase 006 — Helix Dashboard Landing Page

### Stage Cards (`components/helix/helix-stage-card.tsx`)

- [ ] Each card shows stage title, description, progress bar, and step count
- [ ] Current stage has cyan border and accent color
- [ ] Locked stages show lock icon and reduced opacity
- [ ] Clicking stage header expands to show steps (if not locked)
- [ ] Expanded view shows steps with navigation links
- [ ] Progress bar uses `bg-gradient-to-r from-accent-cyan to-blue-500`

### Metrics (`components/helix/helix-dashboard-metrics.tsx`)

- [ ] Shows "Current Stage" (X/8 or "Not Started")
- [ ] Shows "Completed Steps" (X/Y)
- [ ] Shows "Active Step" (Yes/None)
- [ ] Shows "Locked Steps" count

### Dashboard Page

- [ ] Overall progress bar shows correct percentage
- [ ] Status message when no stage started: "Ready to begin! Click on Stage 1 below to start the Helix process."
- [ ] Status message when all complete: "Project complete! All Helix stages successfully finished."
- [ ] Overview section shows: "Linear Progression", "Quality Gates", "Evidence-Based"

### Live Data Updates

- [ ] Mark several steps complete in database, refresh dashboard — progress updates correctly
- [ ] Stage progress bars reflect per-stage completion

### Responsive

- [ ] 1 column on mobile, 2 columns on lg breakpoint

---

## Phase 007 — Hard-Block Gate Check Engine

### Step Completion Checks (`lib/helix/gate-check.ts`)

- [ ] `canCompleteStep()` returns false if previous step not complete
- [ ] `canActivateStep()` returns false if step already active/complete
- [ ] `canActivateStep()` returns false if previous stage gate not passed
- [ ] `canPassStageGate()` returns false if any step in stage incomplete
- [ ] `canPassStageGate()` returns true when all steps in stage are complete with valid evidence

### Evidence Validation

- [ ] **Text:** evidence_data.text must be a string, meets minLength, doesn't exceed maxLength
- [ ] **File:** evidence_data.file_url must exist, file extension matches validFileTypes
- [ ] **URL:** evidence_data.url must exist, passes `new URL()` validation
- [ ] **Checklist:** evidence_data.items must be array, all items have `checked: true`

### API Endpoint (`POST /api/helix/gate-check`)

- [ ] Body: `{ projectId, targetType, target }` — returns `{ canAdvance, blockers, warnings, nextAction }`
- [ ] targetType values: 'step-activate', 'step-complete', 'stage-gate'
- [ ] Returns 403 if user is not a project member
- [ ] Returns 400 if targetType is invalid

### Gate Check Alert UI (`components/helix/gate-check-alert.tsx`)

- [ ] Green success state when canAdvance=true
- [ ] Red error state with blocker list when canAdvance=false
- [ ] Warning state with warning list
- [ ] Dismiss button works (onDismiss callback)

### Client Hook (`hooks/useGateCheck.ts`)

- [ ] `checkStepCompletion()` calls API and returns result
- [ ] `checkStepActivation()` calls API and returns result
- [ ] `checkStageGate()` calls API and returns result
- [ ] `isChecking` state is true during async call
- [ ] Error state populated on failure
- [ ] `reset()` clears state

### Blocker Messages to Verify

- [ ] "Must complete step X.Y first"
- [ ] "Step is already active/complete"
- [ ] "Previous step X.Y must be complete first"
- [ ] "Stage N gate must be passed before entering Stage M"
- [ ] "Step X.Y has no evidence"
- [ ] "Step X.Y: text is too short (minimum N characters)"
- [ ] "Step X.Y: invalid file type (allowed: ...)"
- [ ] "Step X.Y: invalid URL format"
- [ ] "Step X.Y: N checklist item(s) not completed"

### Edge Cases

- [ ] `canPassStageGate` with stageNumber < 1 or > 8 returns "Invalid stage number"
- [ ] Gate checks are server-side (not bypassable from client)

---

## Phase 008 — Mode Toggle UX & Open Mode Bridge

### Enhanced Toggle

- [ ] Toggle shows progress percentage when in active Helix Mode (e.g., "(45% complete)")
- [ ] Progress info only shows when isHelixMode && currentStage exists
- [ ] Toggle is disabled when Helix Mode is mid-stage
- [ ] Disabled tooltip: "Complete or reset Helix progress to switch modes"
- [ ] Enabled tooltip: "Switch to Open/Helix Mode"

### Confirmation Dialog

- [ ] Dialog appears when switching away from active Helix Mode
- [ ] Dialog shows current stage and warning: "You're currently in Stage {N} of Helix Mode. Switching to Open Mode will pause your progress."
- [ ] Dialog shows reassurance: "Your progress will be saved and you can return to Helix Mode later."
- [ ] Dialog does NOT appear when Helix is active but nothing started (no currentStage)
- [ ] Cancel — mode doesn't change
- [ ] Confirm — mode switches to Open
- [ ] Switch back to Helix — stage progress is preserved

### Dynamic Sidebar (`components/helix/project-sidebar.tsx`)

- [ ] Renders HelixSidebar when isHelixMode=true
- [ ] Renders Open Mode sidebar when isHelixMode=false
- [ ] Shows 5 skeleton bars with animate-pulse when loading

### Deep Links (`lib/helix/deep-link.ts`)

- [ ] `buildHelixUrl({ orgSlug, projectId })` returns `/org/{orgSlug}/project/{projectId}/helix`
- [ ] `buildHelixUrl({ ..., targetType: 'step', targetId: '1.1' })` returns `.../helix/step/1.1`
- [ ] `buildHelixUrl({ ..., targetType: 'stage', targetId: '2' })` returns `.../helix/stage/2`
- [ ] `parseHelixUrl('/org/acme/project/123/helix')` returns `{ mode: 'helix' }`
- [ ] `parseHelixUrl('/org/acme/project/123/helix/step/1.1')` returns `{ mode: 'helix', targetType: 'step', targetId: '1.1' }`
- [ ] `parseHelixUrl('/some/random/path')` returns null
- [ ] `isHelixPath(pathname)` correctly identifies Helix routes

### Navigation Guard (`components/helix/deep-link-navigation-guard.tsx`)

- [ ] Navigating to a Helix URL when project is in Open Mode — guard shows prompt to switch
- [ ] Navigating to Open Mode URL when project is in Helix Mode — appropriate handling

### Breadcrumbs (`components/helix/project-breadcrumb.tsx`)

- [ ] Helix Mode breadcrumb: Projects > {project.name} > Helix > Stage {N}
- [ ] Open Mode breadcrumb: Projects > {project.name} > Open Mode
- [ ] Breadcrumb updates correctly when mode changes

### Edge Cases

- [ ] All navigation between modes is safe — user progress is never lost
- [ ] Mode toggle, sidebar, breadcrumbs, and deep links all stay in sync

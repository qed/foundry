# Epic 2: Planning Stage — Steps 1.1–1.3 (Phases 009-014)

> Step detail views, project idea input, brainstorming prompt, project brief save, evidence viewer, navigation & progress.
> Key files: `components/helix/StepDetailView.tsx`, `components/helix/EvidencePanel.tsx`, `components/helix/EvidenceViewer.tsx`, `components/helix/steps/Step1_1Content.tsx`, `components/helix/steps/Step1_2Content.tsx`, `components/helix/steps/Step1_3Content.tsx`, `lib/helix/actions.ts`, `app/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/page.tsx`

---

## Phase 009: Step Detail View Component
**Commit**: `701058b` — v2 - Phase 009: StepDetailView, EvidencePanel, and step route
**What was built**:
- `components/helix/StepDetailView.tsx` — Reusable dual-panel layout (left: instructions/custom content, right: evidence). Reads step config from `helix-process.ts`. Shows status badges (locked/active/complete). Later updated in Phase 014 to include BreadcrumbNav and StepNavigation.
- `components/helix/EvidencePanel.tsx` — Evidence submission panel supporting text (textarea, 50-char min), file (upload with metadata), URL (input with validation), and checklist (toggle checkboxes). Completed state shows read-only summary.
- `app/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]/page.tsx` — Dynamic step route. Validates step key against config, fetches step from DB, renders step-specific components for 1.1/1.2/1.3 or generic StepDetailView for all others.
- Updated `config/helix-process.ts` Stage 1 — renamed from "Discovery" to "Planning", updated step titles: "Define Project Idea", "Brainstorming Prompt", "Save Project Brief".

**Deviations from spec**:
- Route uses `/helix/step/[stepKey]` (flat) instead of `/helix/{stageSlug}/{stepKey}` (nested). Simpler and avoids redundancy since step keys are globally unique.
- No separate types/helix.ts file created — types kept in database.ts and inline interfaces.
- Evidence stored in `helix_steps.evidence_data` JSONB, not in artifacts table (schema mismatch).

---

## Phase 010: Step 1.1 — Define Project Idea
**Commit**: `653b6ca` — v2 - Phase 010: Step 1.1 — Define Project Idea
**What was built**:
- `components/helix/steps/Step1_1Content.tsx` — Full-page step component with TipTap rich text editor (bold/italic/list toolbar), structured form fields (projectName, problemStatement, targetUsers, vision), auto-save with 2s debounce, completion flow, read-only completed view with "Continue to Step 1.2" link.
- `lib/helix/actions.ts` — Server actions: `completeHelixStep` (marks step complete, unlocks next step, revalidates path) and `autoSaveStepEvidence` (saves evidence without completion).
- `lib/utils/debounce.ts` — Generic debounce utility.
- `app/api/helix/projects/[projectId]/steps/[stepKey]/auto-save/route.ts` — POST endpoint for debounced auto-save.

**Key pattern**: Step-specific components are full-page layouts that bypass StepDetailView entirely. The generic `[stepKey]` route conditionally renders the appropriate component based on step key.

---

## Phase 011: Step 1.2 — Brainstorming Prompt (Manual)
**Commit**: `5d8acf9` — v2 - Phase 011: Step 1.2 — Brainstorming Prompt (Manual)
**What was built**:
- `components/helix/steps/Step1_2Content.tsx` — Generates brainstorming prompt template with project name from Step 1.1 evidence. Copy-to-clipboard with confirmation. Paste area for output (500-char minimum). File upload for .md/.txt. Gate check: redirects to Step 1.1 if not complete.
- `lib/helix/fileProcessing.ts` — `extractTextFromFile()` utility supporting text/markdown, rejecting PDF.

**Key pattern**: Step 1.2 reads Step 1.1's evidence_data to extract the project name for prompt generation. Gate check done server-side in the route page.

---

## Phase 012: Step 1.3 — Save Project Brief
**Commit**: `7a46e10` — v2 - Phase 012: Step 1.3 — Save Project Brief
**What was built**:
- `components/helix/steps/Step1_3Content.tsx` — Paste area with Source/Preview toggle. Preview uses MarkdownRenderer. File upload for .md/.txt. 100-character minimum. Completing Step 1.3 finishes the Planning Stage.
- `components/helix/MarkdownRenderer.tsx` — react-markdown wrapper with remark-gfm. Custom styled components for h1-h4, p, ul/ol/li, blockquote, code (inline vs block), table/th/td, links. All using project CSS variables.
- Installed `react-markdown@10.1.0` and `remark-gfm@4.0.1`.

---

## Phase 013: Evidence Viewer Component
**Commit**: `1f628c8` — v2 - Phase 013: Evidence Viewer Component
**What was built**:
- `components/helix/EvidenceViewer.tsx` — Read-only evidence display with:
  - Smart normalizer: auto-detects evidence shape from raw JSONB (text with content, Step 1.1 structured data, file, URL, checklist, manual)
  - Sub-viewers: TextEvidenceView (markdown rendering + copy-to-clipboard), FileEvidenceView (metadata + download), URLEvidenceView (clickable link), ChecklistEvidenceView (disabled checkboxes + completion count), ManualEvidenceView (placeholder)
  - Metadata display: completion timestamp, submitter info
  - Audit footer: step key and evidence type
- Updated `StepDetailView.tsx` to show EvidenceViewer for completed steps instead of EvidencePanel.

---

## Phase 014: Step Navigation & Progress Tracking
**Commit**: `46d2de1` — v2 - Phase 014: Step Navigation & Progress Tracking
**What was built**:
- `components/helix/BreadcrumbNav.tsx` — Helix > Stage N: Title > Step Key — Title breadcrumb path.
- `components/helix/ProgressBar.tsx` — Stage-level progress bar (X of Y, colored fill) + OverallProgress component (percentage across all stages).
- `components/helix/StepNavigation.tsx` — Previous/Next step links with step labels, lock-awareness via Lock icon, disabled state for inaccessible steps. Uses `<a>` tags for server-side navigation.
- `hooks/useHelixProgress.ts` — Client-side hook that fetches `/api/helix/projects/[projectId]/progress` and computes totals/percentage.
- `app/api/helix/projects/[projectId]/progress/route.ts` — GET endpoint returning stage-by-stage progress from helix_steps table.
- Updated `StepDetailView.tsx` — Added BreadcrumbNav in header, replaced inline navigation buttons with StepNavigation component. Changed props: removed onNavigatePrev/onNavigateNext callbacks, added orgSlug/projectId/nextStepStatus for link-based navigation.
- Updated step route page to pass new props and fetch next step status.

**Deviation from spec**: Navigation uses `<a>` links instead of `useRouter.push()` callbacks. This is simpler and works with server components — no need for server actions just for navigation.

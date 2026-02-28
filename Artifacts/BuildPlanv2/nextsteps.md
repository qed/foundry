# Foundry v2 — Prompt Template (Living Document)

> **Purpose**: Master template used to generate phase build prompts for Claude Code sessions.
> **Updated by**: The build session after each phase completes (via alignment.md).
> **Last updated**: 2026-02-28
> **Location**: `Artifacts/BuildPlanv2/nextsteps.md` (kept in sync via alignment.md).

---

## Section 0: Session Title

> Include at the very top of every build prompt.

```
Title: Build Foundry v2 Phase XXX
```

Where XXX is the phase number (e.g., 001, 029, 059). This sets the Claude Code session title so you can identify it.

---

## Section 1: Phase History (Per-Epic Files)

> Phase history is split into per-epic files under `Artifacts/BuildPlanv2/PhaseHistory/`.
> When building a phase, read the relevant epic file(s) for context.
> Cross-epic phases appear in multiple files.
>
> **How to use**: Read the file(s) matching the epic you're working in.
> For cross-epic work, read all relevant epic files.

| Epic | File | Phases | Key Directories |
|------|------|--------|-----------------|
| Epic 1 | `PhaseHistory/epic-01-foundation.md` | 001–008 | `lib/`, `components/helix/`, `config/`, `hooks/`, `types/`, `app/api/`, `supabase/` |
| Epic 2 | `PhaseHistory/epic-02-planning.md` | 009–014 | `app/helix/`, `components/helix/` |
| Epic 3 | `PhaseHistory/epic-03-documentation.md` | 015–021 | `app/helix/`, `components/helix/` |
| Epic 4 | `PhaseHistory/epic-04-build-planning.md` | 022–032 | `app/helix/`, `components/helix/` |
| Epic 5 | `PhaseHistory/epic-05-build-test-deploy.md` | 033–044 | `app/helix/`, `components/helix/` |
| Epic 6 | `PhaseHistory/epic-06-mvp-polish.md` | 045–052 | `app/helix/`, `components/helix/` |
| Epic 7 | `PhaseHistory/epic-07-brainstorming.md` | 053–062 | `app/helix/`, `app/api/`, `components/helix/` |
| Epic 8 | `PhaseHistory/epic-08-build-planning-ai.md` | 063–074 | `app/helix/`, `app/api/`, `components/helix/` |
| Epic 9 | `PhaseHistory/epic-09-doc-intelligence.md` | 075–083 | `app/helix/`, `app/api/`, `components/helix/` |
| Epic 10 | `PhaseHistory/epic-10-repo-automation.md` | 084–091 | `app/helix/`, `app/api/`, `components/helix/` |
| Epic 11 | `PhaseHistory/epic-11-build-management.md` | 092–101 | `app/helix/`, `app/api/`, `components/helix/` |
| Epic 12 | `PhaseHistory/epic-12-testing-intelligence.md` | 102–108 | `app/helix/`, `components/helix/` |
| Epic 13 | `PhaseHistory/epic-13-deployment-pipeline.md` | 109–114 | `app/helix/`, `components/helix/` |
| Epic 14 | `PhaseHistory/epic-14-v1-sync.md` | 115–124 | `lib/`, `app/`, `components/` |
| Epic 15 | `PhaseHistory/epic-15-knowledge-graph.md` | 125–129 | `lib/`, `app/`, `components/` |
| Epic 16 | `PhaseHistory/epic-16-collaboration.md` | 130–135 | `app/helix/`, `components/helix/`, `lib/` |
| Epic 17 | `PhaseHistory/epic-17-analytics.md` | 136–141 | `app/helix/`, `app/api/`, `components/helix/` |
| Epic 18 | `PhaseHistory/epic-18-mcp-integration.md` | 142–148 | `app/api/`, `lib/` |
| Epic 19 | `PhaseHistory/epic-19-customization.md` | 149–157 | `app/helix/`, `components/helix/`, `lib/` |

**8 phases complete (Epic 1 done).** Update this count after each phase via alignment.

---

## Section 2: Key Files to Read

> Customize per phase. Include the files relevant to the phase being built, plus the universal files every session should read.

### Universal (include in every prompt)
- `types/database.ts` — All Supabase table types (Row/Insert/Update) and convenience aliases
- `lib/supabase/client.ts` — Browser-side Supabase client (uses `createBrowserClient`)
- `lib/supabase/server.ts` — Server-side Supabase client (`createClient`, `createServiceClient`, `getUser`)
- `lib/db/helix.ts` — Helix step/gate query utilities (client-side)

### Helix Foundation (from Epic 1 — read for any Helix phase)
- `lib/context/helix-mode-context.tsx` — HelixModeProvider context + useHelixMode() hook
- `config/helix-process.ts` — Complete 8-stage/22-step process config, helpers (getStage, getStep, getNextStep, etc.)
- `types/helix-routes.ts` — Helix route types and URL builder functions (helixRoutes, STAGE_NUMBER_TO_SLUG)
- `lib/helix/gate-check.ts` — Server-side gate check logic: canCompleteStep, canActivateStep, canPassStageGate, validateEvidence
- `lib/helix/deep-link.ts` — Deep link URL builder, parser, mode detection, and cross-mode translation utilities
- `components/helix/helix-mode-toggle.tsx` — Mode toggle with progress info and confirmation dialog
- `components/helix/helix-sidebar.tsx` — 8-stage collapsible sidebar with step navigation
- `components/helix/helix-sidebar-wrapper.tsx` — Responsive sidebar wrapper (mobile overlay + desktop static)
- `components/helix/helix-stage-card.tsx` — Stage card component with progress bar and step list
- `components/helix/helix-dashboard-metrics.tsx` — Dashboard metrics display (stages complete, current stage, overall progress)
- `components/helix/gate-check-alert.tsx` — Gate check UI (success/error/warning states)
- `components/helix/project-sidebar.tsx` — Dynamic sidebar: shows HelixSidebar or Open Mode sidebar based on mode
- `components/helix/project-breadcrumb.tsx` — Mode-aware breadcrumbs
- `components/helix/deep-link-navigation-guard.tsx` — Redirects when URL mode doesn't match project mode
- `hooks/useStepNavigation.ts` — Step navigation hook (next/previous with validation)
- `hooks/useGateCheck.ts` — Client-side gate check hook (async checking + error states)
- `app/api/projects/[projectId]/mode/route.ts` — Mode GET/POST API (reads/writes project mode, initializes Helix data)
- `app/api/helix/gate-check/route.ts` — Gate check API endpoint
- `app/org/[orgSlug]/project/[projectId]/helix/layout.tsx` — Helix layout with nav guard
- `app/org/[orgSlug]/project/[projectId]/helix/page.tsx` — Helix dashboard page
- `app/org/[orgSlug]/project/[projectId]/helix/loading.tsx` — Skeleton loader
- `app/org/[orgSlug]/project/[projectId]/helix/[...slug]/page.tsx` — Catch-all 404

---

## Section 3: Conventions & Patterns

> Include all of these in every prompt. Add new conventions as they're discovered.

1. All v2 code and docs are committed directly to the `main` branch with a `v2 - ` commit prefix
2. Artifacts/BuildPlanv2/ folder is updated via alignment.md after every phase
3. Next.js 16+ with App Router & Turbopack
4. TypeScript strict mode
5. Tailwind CSS v4 with brand CSS variables
6. Supabase Auth, PostgreSQL with RLS, Realtime, Storage
7. Helix routes under `/org/[orgSlug]/project/[projectId]/helix/` (real folder, not route group)
8. Claude AI: haiku for agents, sonnet for generation
9. Gate checks enforce step completion before proceeding

10. RLS policies use `is_project_member()` SECURITY DEFINER helper (from migration 002) — never inline subqueries
11. Service role bypass policies: `auth.role() = 'service_role'` FOR ALL on every table
12. Auto-update `updated_at` via existing `update_updated_at()` trigger function
13. Migration files numbered sequentially: `042_`, `043_`, etc. (next available: 045)
14. Database types live in `types/database.ts` with convenience aliases at the bottom
15. Helix utility functions in `lib/db/helix.ts` — re-export types from `types/database.ts`

16. All files use root-level directories (no `src/` prefix): `lib/`, `components/`, `app/`, `hooks/`, `config/`, `types/`
17. Helix UI components live under `components/helix/` with kebab-case filenames (e.g., `helix-sidebar.tsx`, `gate-check-alert.tsx`)
18. Helix context at `lib/context/helix-mode-context.tsx` (not `contexts/`)
19. Next.js 16 async params pattern: route params are accessed via `await params` in server components
20. CSS uses project theme variables: `text-accent-cyan`, `bg-bg-primary`, `border-gray-200 dark:border-gray-700`, etc.
21. Helix process config in `config/helix-process.ts` is the single source of truth for all 8 stages and 22 steps — always import from there
22. Custom hooks live in root `hooks/` directory (e.g., `useStepNavigation.ts`, `useGateCheck.ts`)
23. Server-side Helix logic in `lib/helix/` directory (e.g., `gate-check.ts`, `deep-link.ts`)

---

## Section 4: Post-Build Instructions

> Include at the end of every prompt.

After building, run the appropriate build/lint/test commands for the project being modified:

<!-- Replace with your verification commands: -->
<!-- **[Component]**: `cd [dir] && npx tsc --noEmit && npm run lint` -->

Then give me:
* What's new since the last completed phase
* What I can test (include specific commands, URLs, or test scenarios)
* Ask me if I want any changes before moving on
* Then ask: "Ready to create a commit message with bullet points and push?"
* After committing, run alignment.md to sync all project documents

---

## Section 5: Sequential Build Instructions

> Include at the top of every prompt.

**IMPORTANT**: Build on the `main` branch. All v2 code and doc commits go to `main` with a `v2 - ` commit prefix.

**Before starting**: Pull ONLY the latest BuildPlan from remote main (avoids code merge conflicts):
```bash
git fetch origin main
git checkout origin/main -- Artifacts/BuildPlanv2/
```

---

## Section 6: Sequential Execution Queue

> Updated after each phase completes. Next = first incomplete phase in the list.

**Completed**:
- Phase 001: Helix Mode Database Migration
- Phase 002: Mode Context Provider & Toggle
- Phase 003: Helix Route Structure
- Phase 004: Helix Sidebar & Navigation
- Phase 005: Stage & Step Data Model
- Phase 006: Helix Dashboard Landing Page
- Phase 007: Hard-Block Gate Check Engine
- Phase 008: Mode Toggle UX & Open Mode Bridge

**Next up** (sequential order):
- Phase 009: Step Detail View Component

---

## Section 7: Cross-Epic Dependencies

> Phases that require work from multiple epics to be complete before they can start.

| Phase | Depends On | Why |
|-------|-----------|-----|
| 019 | 017 (Epic 3) + v1 Artifacts module | Connects Helix outputs to existing v1 Artifact storage |

_(Update as cross-epic dependencies are discovered during builds)_

---

*This document is updated automatically by the alignment.md process after every phase completion.*

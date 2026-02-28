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
| Epic 1 | `PhaseHistory/epic-01-foundation.md` | 001–008 | `src/`, `supabase/` |
| Epic 2 | `PhaseHistory/epic-02-planning.md` | 009–014 | `app/helix/` |
| Epic 3 | `PhaseHistory/epic-03-documentation.md` | 015–021 | `app/helix/` |
| Epic 4 | `PhaseHistory/epic-04-build-planning.md` | 022–032 | `app/helix/` |
| Epic 5 | `PhaseHistory/epic-05-build-test-deploy.md` | 033–044 | `app/helix/` |
| Epic 6 | `PhaseHistory/epic-06-mvp-polish.md` | 045–052 | `app/helix/`, `src/` |
| Epic 7 | `PhaseHistory/epic-07-brainstorming.md` | 053–062 | `app/helix/`, `app/api/` |
| Epic 8 | `PhaseHistory/epic-08-build-planning-ai.md` | 063–074 | `app/helix/`, `app/api/` |
| Epic 9 | `PhaseHistory/epic-09-doc-intelligence.md` | 075–083 | `app/helix/`, `app/api/` |
| Epic 10 | `PhaseHistory/epic-10-repo-automation.md` | 084–091 | `app/helix/`, `app/api/` |
| Epic 11 | `PhaseHistory/epic-11-build-management.md` | 092–101 | `app/helix/`, `app/api/` |
| Epic 12 | `PhaseHistory/epic-12-testing-intelligence.md` | 102–108 | `app/helix/` |
| Epic 13 | `PhaseHistory/epic-13-deployment-pipeline.md` | 109–114 | `app/helix/` |
| Epic 14 | `PhaseHistory/epic-14-v1-sync.md` | 115–124 | `src/`, `app/` |
| Epic 15 | `PhaseHistory/epic-15-knowledge-graph.md` | 125–129 | `src/`, `app/` |
| Epic 16 | `PhaseHistory/epic-16-collaboration.md` | 130–135 | `app/helix/`, `src/` |
| Epic 17 | `PhaseHistory/epic-17-analytics.md` | 136–141 | `app/helix/`, `app/api/` |
| Epic 18 | `PhaseHistory/epic-18-mcp-integration.md` | 142–148 | `app/api/`, `src/` |
| Epic 19 | `PhaseHistory/epic-19-customization.md` | 149–157 | `app/helix/`, `src/` |

**0 phases complete.** Update this count after each phase via alignment.

---

## Section 2: Key Files to Read

> Customize per phase. Include the files relevant to the phase being built, plus the universal files every session should read.

### Universal (include in every prompt)
_(Populate after Phase 001 — these are the foundational files that every session needs)_

---

## Section 3: Conventions & Patterns

> Include all of these in every prompt. Add new conventions as they're discovered.

1. All code and docs are committed to the `dev` branch — never directly to `main`
2. Artifacts/BuildPlanv2/ folder is updated via alignment.md after every phase
3. Next.js 16+ with App Router & Turbopack
4. TypeScript strict mode
5. Tailwind CSS v4 with brand CSS variables
6. Supabase Auth, PostgreSQL with RLS, Realtime, Storage
7. Helix routes under `/org/[orgSlug]/project/[projectId]/helix/`
8. Claude AI: haiku for agents, sonnet for generation
9. Gate checks enforce step completion before proceeding

_(Add new conventions here as phases are completed)_

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

**IMPORTANT**: Build on the `dev` branch. All code and doc commits go to `dev`. The `main` branch is for production releases only.

**Before starting**: Pull ONLY the latest BuildPlan from remote dev (avoids code merge conflicts):
```bash
git checkout dev
git fetch origin dev
git checkout origin/dev -- Artifacts/BuildPlanv2/
```

---

## Section 6: Sequential Execution Queue

> Updated after each phase completes. Next = first incomplete phase in the list.

**Completed**:
_(none yet)_

**Next up** (sequential order):
- Phase 001: Helix Mode Database Migration

---

## Section 7: Cross-Epic Dependencies

> Phases that require work from multiple epics to be complete before they can start.

| Phase | Depends On | Why |
|-------|-----------|-----|
| 019 | 017 (Epic 3) + v1 Artifacts module | Connects Helix outputs to existing v1 Artifact storage |

_(Update as cross-epic dependencies are discovered during builds)_

---

*This document is updated automatically by the alignment.md process after every phase completion.*

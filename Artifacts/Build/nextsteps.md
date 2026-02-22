# Helix Foundry — Prompt Template (Living Document)

> **Purpose**: Master template used by the Conductor session to generate phase prompts.
> **Updated by**: The Conductor session after each wave merges.
> **Last updated**: 2026-02-22 (Phase 030 complete)

---

## Section 0: Session Title

> Include at the very top of every build prompt.

```
Title: Build Helix Foundry Phase XXX
```

Where XXX is the phase number (e.g., 017, 026, 113). This sets the Claude Code session title so you can identify it.

---

## Section 1: Phase History (Per-Module Files)

> Phase history is split into per-module files under `Artifacts/Build/PhaseHistory/`.
> When building a phase, load the relevant module file(s) for context. Cross-module phases appear in both files.
>
> **How to use**: Read the file(s) matching the module you're working in. For cross-module work, read both.

| Module | File | Phases | Key Directories |
|--------|------|--------|-----------------|
| Foundation | `PhaseHistory/foundation.md` | 001–010 | `lib/auth/`, `lib/supabase/`, `components/layout/`, `components/ui/` |
| The Hall | `PhaseHistory/hall.md` | 011–025 | `components/hall/`, `app/api/hall/`, `lib/agent/context.ts` |
| Pattern Shop | `PhaseHistory/shop.md` | 026–037 | `components/shop/`, `app/api/projects/*/feature-nodes/`, `lib/shop/` |
| Control Room | `PhaseHistory/room.md` | 046–056 | `components/room/`, `app/api/projects/*/blueprints/`, `lib/blueprints/` |
| Assembly Floor | `PhaseHistory/floor.md` | 061–073 | `components/floor/`, `app/api/projects/*/work-orders/`, `app/api/projects/*/phases/` |
| Insights Lab | `PhaseHistory/lab.md` | 081–085 | `components/lab/`, `app/api/projects/*/feedback/` |
| Artifacts | `PhaseHistory/artifacts.md` | 096–101 | `components/artifacts/`, `app/api/projects/*/artifacts/`, `lib/artifacts/` |
| Cross-Cutting | `PhaseHistory/cross-cutting.md` | 105–119 | `lib/activity/`, `lib/realtime/`, `components/presence/` |

**79 phases complete** (001–010, 011–020, 024–025, 019, 021–023, 026–045, 046–054, 056, 061–065, 067, 069, 073, 081, 083–085, 096–101, 105, 109, 113, 117, 119).

_Previously this was a single giant paragraph. Migrated to per-module files on 2026-02-22._

---

## Section 2: Key Files to Read

> Customize per phase. Include the files relevant to the phase being built, plus the universal files every session should read.

### Universal (include in every prompt)
* types/database.ts — full database types
* lib/supabase/server.ts — createClient, createServiceClient patterns
* lib/auth/server.ts — requireAuth, requireAuthWithProfile
* lib/auth/errors.ts — handleAuthError
* lib/auth/context.tsx — AuthProvider, useAuth, useOptionalAuth
* lib/utils.ts — cn helper, timeAgo utility
* app/globals.css — brand colors and theme variables

### Hall Track
* components/hall/hall-client.tsx — HallClient orchestrator
* components/hall/idea-detail-slide-over.tsx — Phase 016 slide-over
* components/hall/idea-action-buttons.tsx — Edit/Archive/Promote buttons
* components/hall/idea-create-modal.tsx — Phase 013 create modal with tag selection
* components/hall/idea-card.tsx — IdeaCard with glass-panel styling
* components/hall/idea-grid.tsx and idea-list.tsx — grid/list views
* components/hall/hall-header.tsx — header with search, view toggle
* components/hall/filter-bar.tsx — status/sort/tag filters
* components/hall/tag-filter.tsx — tag filter dropdown
* components/hall/types.ts — IdeaWithDetails, STATUS_CONFIG, SORT_OPTIONS
* app/org/[orgSlug]/project/[projectId]/hall/page.tsx — server component
* app/api/hall/ideas/route.ts — GET/POST endpoints
* app/api/hall/ideas/[ideaId]/route.ts — GET single idea
* app/api/hall/tags/route.ts — GET project tags

### Schema Track
* supabase/migrations/002_core_schema.sql — core schema patterns (is_project_member, RLS)
* supabase/migrations/003_hall_schema.sql — Hall schema patterns (CHECK constraints, SECURITY DEFINER helpers)

### Admin Track
* lib/permissions/definitions.ts — permission definitions
* lib/permissions/hooks.ts — usePermission hook
* lib/permissions/server.ts — requireOrgPermission, requireProjectPermission
* components/layout/app-layout.tsx — AppLayout shell
* components/layout/sidebar.tsx — sidebar component
* components/layout/header.tsx — header with breadcrumbs
* components/layout/user-menu.tsx — UserMenu with role badges
* app/org/[orgSlug]/layout.tsx — org-level layout

### UI Components (include when building UI-heavy phases)
* components/ui/dialog.tsx — Dialog modal
* components/ui/toast-container.tsx — ToastProvider, useToast
* components/ui/button.tsx — Button with variants, sizes, isLoading
* components/ui/input.tsx — Input with labels, error
* components/ui/select.tsx — Select dropdown
* components/ui/badge.tsx — Badge with 7 variants
* components/ui/card.tsx — Card composable
* components/ui/avatar.tsx — Avatar with gradient fallback
* components/ui/empty-state.tsx — EmptyState component

---

## Section 3: Conventions & Patterns

> Include all of these in every prompt. Add new conventions as they're discovered.

1. Next.js 16.1.6 with App Router, Turbopack, React 19, TypeScript strict mode
2. Tailwind CSS v4 with CSS-first config via @theme in globals.css (NOT tailwind.config.ts)
3. Brand colors are CSS custom properties: bg-primary #0f1117, bg-secondary #1a1d27, bg-tertiary #252830, text-primary #e4e7ec, text-secondary #8b8fa3, text-tertiary #5a5f73, accent-cyan #00d4ff, accent-purple #8b5cf6, accent-success/warning/error
4. Supabase for auth + PostgreSQL with RLS; service role client bypasses RLS for API routes
5. API routes use requireAuth() from lib/auth/server.ts and createServiceClient() from lib/supabase/server.ts
6. cn() helper in lib/utils.ts combines clsx + tailwind-merge
7. Database types in types/database.ts with convenience aliases (Idea, Tag, IdeaTag, etc.)
8. Glass panel styling via glass-panel CSS class for cards
9. Toast system: useToast() hook -> addToast(message, type) where type is 'success' | 'error' | 'info' | 'warning'
10. Button component supports isLoading prop with spinner, 5 variants (primary/secondary/ghost/danger/outline), 3 sizes
11. AppLayout is already wired into project layout — don't re-wrap module pages with it
12. React 19 ESLint: don't call setState directly inside useEffect body — wrap in async function instead (see doFetch pattern in hall-client.tsx). Use useSyncExternalStore for browser-only values like navigator.platform
13. Next.js ESLint rule: don't use `module` as a variable name — use activeModule or similar
14. RLS for tenant isolation only — business logic in Next.js API routes
15. Service role key bypasses RLS for admin/API route operations
16. useOptionalOrg and useOptionalProject hooks exist for components rendered outside their providers
17. useOptionalAuth hook in lib/auth/context.tsx is a non-throwing variant of useAuth for defensive rendering
18. React 19 refs rule: don't assign to ref.current during render — use useEffect to sync
19. Schema phases: use CHECK constraints for status/type columns (NOT CREATE TYPE enums). Follow Hall schema pattern.
20. Schema phases: use is_project_member() SECURITY DEFINER helper for RLS (NOT direct project_members queries). Create new SECURITY DEFINER helpers for junction/child tables.
21. Schema phases: add auto-update triggers for updated_at columns
22. Phase spec file structure may reference `src/` — this project does NOT use `src/`. Components go in `components/`, pages in `app/`, API routes in `app/api/`.
23. This project does NOT use a `tailwind.config.ts` file. All theme configuration is done via CSS @theme in globals.css.

---

## Section 4: Post-Build Instructions

> Include at the end of every prompt.

After building, run `npm run build` and `npm run lint` to verify zero errors. Then give me:
* A local link to the app
* What's new since the last completed phase
* What I can test (include full clickable URLs like http://localhost:3000/login so they're easy to click)
* Ask me if I want any changes before moving on
* Then ask: "Ready to create a commit message with bullet points and push to GitHub?"

---

## Section 5: Sequential Build Instructions

> Include at the top of every prompt.

**IMPORTANT**: Build directly on `main` branch. No feature branches or worktrees. Commit directly to main after build + lint pass.

---

## Section 6: Sequential Execution Queue

> Updated after each phase completes. Next = first incomplete phase in the list.

**Completed**:
- Phase 017: Edit & Delete Ideas (Hall) -- done
- Phase 026: Pattern Shop Database Schema (Shop) -- done
- Phase 018: Tagging & Tag Management (Hall) -- done
- Phase 027: Pattern Shop Page Layout (Shop) -- done
- Phase 061: Assembly Floor DB Schema (Floor) -- done
- Phase 081: Insights Lab DB Schema (Lab) -- done
- Phase 046: Control Room DB Schema (Room) -- done
- Phase 096: Artifacts DB & Storage (Cross) -- done
- Phase 105: Comments System Foundation (Cross) -- done
- Phase 109: Knowledge Graph Schema (Cross) -- done
- Phase 113: Organization Console (Admin) -- done
- Phase 117: Real-Time Presence (Realtime) -- done
- Phase 119: Audit Trail & Activity Log (Admin) -- done
- Phase 020: Hall Agent Infrastructure (Hall) -- done
- Phase 024: Hall Real-Time Updates (Hall) -- done
- Phase 019: Bulk Operations (Hall) -- done
- Phase 025: Hall -> Shop Promotion (Hall/Shop) -- done
- Phase 029: Feature Tree Component (Shop) -- done
- Phase 028: Product Overview Document (Shop) -- done
- Phase 030: Add Nodes to Feature Tree (Shop) -- done
- Phase 033: Feature Requirements Doc (Shop) -- done
- Phase 062: Assembly Floor Page Layout (Floor) -- done
- Phase 047: Control Room Page Layout (Room) -- done
- Phase 083: Insights Lab Page Layout (Lab) -- done
- Phase 063: Create Work Order (Floor) -- done
- Phase 064: Work Order Detail View (Floor) -- done
- Phase 065: Kanban Board with Drag-and-Drop (Floor) -- done
- Phase 031: Edit & Delete Tree Nodes (Shop) -- done
- Phase 034: Requirements Document Editor (Shop) -- done
- Phase 049: Blueprint Rich Text Editor (Room) -- done
- Phase 067: Work Order List/Table View (Floor) -- done
- Phase 069: Work Order Phases (Floor) -- done
- Phase 037: Pattern Shop Agent Infrastructure (Shop) -- done
- Phase 097: Artifact Upload UI (Artifacts) -- done
- Phase 073: Assembly Floor Agent Infrastructure (Floor) -- done
- Phase 051: Feature Blueprints (Room) -- done
- Phase 056: Control Room Agent Infrastructure (Room) -- done
- Phase 048: Foundation Blueprints (Room) -- done
- Phase 050: System Diagram Blueprints (Room) -- done
- Phase 054: Blueprint Status Tracking (Room) -- done
- Phase 084: Feedback Inbox Display (Lab) -- done
- Phase 085: Feedback Detail View (Lab) -- done
- Phase 021: Agent: Auto-Tag Suggestions (Hall) -- done
- Phase 022: Agent: Duplicate Detection (Hall) -- done
- Phase 023: Agent: Connection Discovery (Hall) -- done
- Phase 098: Artifact Browser & Management (Artifacts) -- done
- Phase 099: Artifact Linking to Entities (Artifacts) -- done
- Phase 100: Artifact Search & Indexing (Artifacts) -- done
- Phase 101: Artifact Folders & Organization (Artifacts) -- done
- Phase 032: Feature Tree Drag-and-Drop (Shop) -- done
- Phase 035: Feature Tree Status Tracking (Shop) -- done
- Phase 036: Feature Tree Search & Filter (Shop) -- done
- Phase 041: Feature Tree Statistics (Shop) -- done
- Phase 038: Agent Feature Tree Generation (Shop) -- done
- Phase 039: Agent Requirements Review (Shop) -- done
- Phase 040: Agent Gap Detection (Shop) -- done
- Phase 042: Requirements Import/Export (Shop) -- done
- Phase 043: Document Versioning (Shop) -- done
- Phase 045: Technical Requirements Documents (Shop) -- done
- Phase 044: Pattern Shop Comments (Shop) -- done
- Phase 052: Feature-Blueprint Linking (Room/Shop) -- done
- Phase 053: Blueprint Templates (Room/Admin) -- done

**Next up** (sequential order):
055, 057, 058, 059, 066, 068, 070, 071, 072, 074, 076, 077, 078, 080, 082, 086, 088, 089, 090, 102, 106, 110, 118, 120...

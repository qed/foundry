# Helix Foundry — Prompt Template (Living Document)

> **Purpose**: Master template used by the Conductor session to generate phase prompts.
> **Updated by**: The Conductor session after each wave merges.
> **Last updated**: 2026-02-21 (post-Wave 1: Phase 017 + 026 complete)

---

## Section 0: Session Title

> Include at the very top of every build prompt.

```
Title: Build Helix Foundry Phase XXX
```

Where XXX is the phase number (e.g., 017, 026, 113). This sets the Claude Code session title so you can identify it.

---

## Section 1: Phase History Paragraph

> Copy this into every phase prompt. After each wave completes, the Conductor appends new phase descriptions.

Phases 001 (Next.js setup), 002 (Supabase database schema — organizations, org_members, projects, project_members tables with RLS policies, is_project_member() and is_org_member() SECURITY DEFINER helpers, indexes, auto-update triggers), 003 (Supabase auth — login, signup, password reset, AuthProvider context), 004 (Auth middleware — proxy.ts route protection, cached server auth helpers requireAuth/requireAuthWithProfile, logout/status/profile API routes, useRequireAuth hook, redirectTo wiring), 005 (Multi-tenancy — URL-based org/project routing, OrgProvider/ProjectProvider/CurrentUserProvider contexts, org/project layouts with membership validation, org selector + org home + project dashboard pages, 5 module placeholder pages, org/project creation API routes + forms, org-validation helpers, useOrgData/useProjectData hooks, custom module icons), 006 (Core UI Shell — collapsible sidebar with Dashboard + 5 module nav items using Lucide icons and cyan active highlights, header bar with breadcrumb navigation and user avatar dropdown, mobile bottom tab bar with custom colorful module icons, AppLayout shell combining sidebar/header/mobile-nav with responsive behavior, sidebar collapse desktop-only, simplified module pages for shell context, focus-visible styles), 007 (Global UI Components — 12 reusable components in components/ui/: Button with 5 variants + 3 sizes + loading state via class-variance-authority, Input/Textarea/Select with labels + error + helper text, Card with composable Header/Title/Body/Footer, Badge with 7 variants including purple, Dialog modal with overlay close + Escape key + scroll lock, Spinner in 3 sizes, Avatar with gradient initials fallback, Toast + ToastContainer with 4 types and auto-dismiss via useToast hook, EmptyState with icon/title/description/action, ToastProvider wired into root layout, component showcase page at /components), 008 (Registration & Onboarding — onboarding router at /onboarding that checks org membership and redirects, org-choice page with Create/Join cards, create-org page with slug preview calling /api/orgs, join-org page with base64 invite code calling /api/orgs/join, create-project page calling /api/projects then redirecting to project dashboard, /api/orgs/join endpoint using createServiceClient to bypass RLS, upgraded /org page from silent redirect into org selector hub showing all user orgs with role badges plus create/join action cards, replaced home page email display with cyan Enter button linking to /org), 009 (Roles & Permissions — RBAC permission system with typed org permissions admin/member and project permissions leader/developer, permission definitions with role-to-permission mappings, pure checker functions canOrgPermission/canProjectPermission/canAll/canAny, server-side permission guards requireOrgPermission/requireProjectPermission that throw ForbiddenError, client-side usePermission hook, example permission-aware components create-requirement-button/requirement-list-item/module-nav-item, example permission-protected API route /api/projects/[projectId]/settings, reusable context-aware UserMenu component with role badges, TopBar component for non-project pages, refactored Header to use shared UserMenu, added TopBar with avatar to all authenticated pages including home/org-selector/org-home/onboarding, useOptionalOrg and useOptionalProject hooks for context-aware rendering outside providers), 010 (Navigation & Module Switching — reusable Breadcrumb component refactored from header, Project Switcher dropdown in sidebar for switching between projects, Org Switcher dropdown in sidebar for switching between organizations, permission-aware sidebar module links showing disabled/restricted state, keyboard shortcuts hook with Cmd/Ctrl+1-5 module jumping wired into AppLayout, keyboard hint display in sidebar footer, GET /api/orgs/list endpoint returning user orgs with roles, GET /api/orgs/[orgId]/projects endpoint returning org projects with membership validation), 011 (Hall Database Schema — SQL migration 003_hall_schema.sql creating 5 tables: ideas with status tracking raw/developing/mature/promoted/archived + project scoping + audit fields + promoted_to_seed_id nullable UUID, tags with project-scoped custom colors + unique name constraint, idea_tags junction table, idea_connections for related/duplicates/extends relationships, agent_conversations with JSONB messages; RLS policies on all 5 tables using existing is_project_member() SECURITY DEFINER helper; new idea_project_member() SECURITY DEFINER function for indirect project membership checks on junction tables; 10 indexes; auto-update triggers on ideas.updated_at and agent_conversations.updated_at; updated TypeScript types with full Row/Insert/Update definitions and convenience aliases Idea/Tag/IdeaTag/IdeaConnection/AgentConversation/IdeaStatus), 012 (Hall Page Layout & UI — replaced Hall placeholder with full interactive page: HallClient orchestrator manages URL state for view/search/status/sort via useSearchParams + useRouter.replace, HallHeader with title/icon/subtitle/search input/New Idea button/Grid-List view toggle, HallEmptyState with lightbulb icon and CTA, IdeaCard with status badge/title-body preview/colored tag chips/creator avatar/relative timestamp, IdeaGrid with responsive 3/2/1 column layout and skeleton loading, IdeaList with select-all checkbox/column headers/compact rows/responsive column hiding, FilterBar with status dropdown/sort dropdown/active filter chips/clear all, ViewToggle with Grid/List icons, mobile FAB for New Idea above bottom nav, server component data fetching enriching ideas with tags and creator profiles, loading.tsx skeleton, shared types IdeaWithDetails/STATUS_CONFIG/STATUS_OPTIONS/SORT_OPTIONS, timeAgo utility in lib/utils.ts), 013 (Create Idea / Note Capture — IdeaCreateModal with title input (required, 200 char limit with live counter, autofocus), description textarea (optional, 3000 char limit with live counter, resizable), tag selection with search/filter existing project tags plus inline tag creation with custom color picker, client-side validation with error messages, submit button disabled until title has content with loading spinner, cancel with dirty-form discard confirmation, overlay click and Escape key dismiss, desktop centered 600px modal / mobile full-screen, success/error toasts via ToastProvider, POST /api/hall/ideas endpoint with server-side validation + project membership check + tag verification + new tag creation + full idea+tags+creator response, GET /api/hall/tags endpoint for fetching project tags, HallClient wired to router.refresh() on idea creation, useOptionalAuth hook fix for UserMenu HMR resilience), 014 (Idea List View — GET /api/hall/ideas endpoint with pagination (limit/offset), sorting (newest/oldest/updated/A-Z/Z-A), search (title+body ilike), status filtering, project membership validation, batch tag+profile enrichment, total count + hasMore flag; LoadMoreTrigger component with IntersectionObserver for auto-loading next page on scroll; NoResultsState component with SearchX icon and clear filters button; HallClient rewritten from client-side-only filtering to hybrid server+client pagination with initial 12 ideas from server component then API-based infinite scroll on scroll/filter/sort changes with 300ms search debounce and AbortController race condition handling; Hall page server component fetches only first 12 ideas + total count; alphabetical sort options A-Z and Z-A; loading states with opacity dimming + spinner during refetch, spinner during infinite scroll, "All N ideas loaded" end-of-list message), 015 (Hall Search & Filter — tag filter dropdown in FilterBar with multi-select checkboxes, search-within-tags input, Select all / Deselect all controls, AND-logic tag filtering; search clear (X) button in HallHeader search input; active filter chip bar below filter controls with removable chips for search term, status, and each selected tag with color dots; Clear all button resets search/status/tags/sort; filtered result count "N ideas found"; tag selections stored in URL as ?tags=uuid1,uuid2 for shareable bookmarkable filter states; GET /api/hall/ideas updated with tags param and server-side AND-logic filtering via idea_tags junction table; project tags fetched server-side and passed as initialTags to HallClient; all filters composable with URL state management), 016 (Idea Detail Slide-Over — slide-over panel from right edge on idea card click with 300ms animation, 600px desktop / 500px tablet / full-width mobile, overlay click-to-close + Escape key + body scroll lock; full idea display with status badge, creator avatar/name/timestamps, full body text, colored clickable tag pills that filter Hall on click, Related Ideas section with connection type badges and click-to-navigate between connected ideas, Idea Info panel with metadata grid; action buttons Edit/Archive/Promote as UI placeholders for future phases; Archive confirmation dialog; loading spinner + error retry state; GET /api/hall/ideas/[ideaId] endpoint with tags + creator + membership validation; GET /api/hall/ideas/[ideaId]/connections endpoint with bidirectional connection fetching + enriched details; onIdeaClick wired into IdeaGrid and IdeaList; HallClient manages selectedIdeaId state), 017 (Edit & Delete Ideas — PUT /api/hall/ideas/[ideaId] for inline editing with field-level updates supporting title/body/status changes, DELETE /api/hall/ideas/[ideaId] for soft-delete setting deleted_at timestamp, POST /api/hall/ideas/[ideaId]/undelete for undo within toast window restoring deleted_at to null; idea-edit-form.tsx with auto-save on blur and debounced title editing with 500ms delay; idea-action-buttons.tsx wired with Edit pencil icon and Archive trash icon actions; idea-detail-slide-over.tsx with edit mode toggle switching between view and inline edit; hall-client.tsx with optimistic update/archive handlers providing instant UI feedback and undo toast with 5-second window; toast system enhanced with action button support enabling undo capability on destructive operations), and 026 (Pattern Shop Database Schema — SQL migration 004_pattern_shop_schema.sql creating 3 tables: feature_nodes with hierarchical tree structure supporting epic/feature/sub_feature/task levels and not_started/in_progress/complete/blocked status tracking with position ordering and soft-delete via deleted_at, requirements_documents with product_overview/feature_requirement/technical_requirement doc types linking to feature nodes, requirement_versions for document version history with version numbers and change summaries; RLS policies on all 3 tables using is_project_member(); new requirement_doc_project_member() SECURITY DEFINER function for indirect project membership checks; indexes on project_id, parent_id, feature_node_id, requirement_doc_id; auto-update triggers on feature_nodes.updated_at and requirements_documents.updated_at; updated TypeScript types with full Row/Insert/Update definitions and convenience aliases FeatureNode/RequirementsDocument/RequirementVersion/FeatureLevel/FeatureStatus/RequirementDocType) are complete and committed.

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

**Next up** (in priority order):
1. Phase 018: Tagging & Tag Management (Hall)
2. Phase 027: Pattern Shop Page Layout (Shop)
3. Phase 061: Assembly Floor DB Schema (Floor)
4. Phase 081: Insights Lab DB Schema (Lab)
5. Phase 046: Control Room DB Schema (Room)
6. Phase 096: Artifacts DB & Storage (Cross)
7. Phase 105: Comments System Foundation (Cross)
8. Phase 109: Knowledge Graph Schema (Cross)
9. Phase 113: Organization Console (Admin)
10. Phase 117: Real-Time Presence (Realtime)
11. Phase 119: Audit Trail & Activity Log (Admin)
12. Phase 020: Hall Agent Infrastructure (Hall)
13. Phase 024: Hall Real-Time Updates (Hall)
14. Phase 019: Bulk Operations (Hall)
15. Phase 025: Hall -> Shop Promotion (Hall/Shop)
16. Phase 029: Feature Tree Component (Shop)
17. Phase 028: Product Overview Document (Shop)
18. Phase 030: Add Nodes to Feature Tree (Shop)
19. Phase 033: Feature Requirements Doc (Shop)
20. Phase 062: Assembly Floor Page Layout (Floor)

# Wave 1 — Phase 017: Edit & Delete Ideas

## 🔧 SETUP — Do this BEFORE starting the Claude Code session

1. Open a terminal and navigate to the worktree directory:
   ```
   cd C:\Users\pkupe\OneDrive\ZCode\helix-phase-017
   ```
2. Open Claude Code FROM this directory (not the main Helix Foundry directory):
   ```
   claude
   ```
3. Paste the entire BUILD PROMPT section below into the session.

---

## 📋 BUILD PROMPT — Copy everything below this line into the Claude Code session

I'm building Helix Foundry, a 150-phase project. Phases 001 (Next.js setup), 002 (Supabase database schema), 003 (Supabase auth — login, signup, password reset, AuthProvider context), 004 (Auth middleware — proxy.ts route protection, cached server auth helpers, logout/status/profile API routes, useRequireAuth hook, redirectTo wiring), 005 (Multi-tenancy — URL-based org/project routing, OrgProvider/ProjectProvider/CurrentUserProvider contexts, org/project layouts with membership validation, org selector + org home + project dashboard pages, 5 module placeholder pages, org/project creation API routes + forms, org-validation helpers, useOrgData/useProjectData hooks, custom module icons), 006 (Core UI Shell — collapsible sidebar with Dashboard + 5 module nav items using Lucide icons and cyan active highlights, header bar with breadcrumb navigation and user avatar dropdown, mobile bottom tab bar with custom colorful module icons, AppLayout shell combining sidebar/header/mobile-nav with responsive behavior, sidebar collapse desktop-only, simplified module pages for shell context, focus-visible styles), 007 (Global UI Components — 12 reusable components in components/ui/: Button with 5 variants + 3 sizes + loading state via class-variance-authority, Input/Textarea/Select with labels + error + helper text, Card with composable Header/Title/Body/Footer, Badge with 7 variants including purple, Dialog modal with overlay close + Escape key + scroll lock, Spinner in 3 sizes, Avatar with gradient initials fallback, Toast + ToastContainer with 4 types and auto-dismiss via useToast hook, EmptyState with icon/title/description/action, ToastProvider wired into root layout, component showcase page at /components), 008 (Registration & Onboarding — onboarding router at /onboarding that checks org membership and redirects, org-choice page with Create/Join cards, create-org page with slug preview calling /api/orgs, join-org page with base64 invite code calling /api/orgs/join, create-project page calling /api/projects then redirecting to project dashboard, /api/orgs/join endpoint using createServiceClient to bypass RLS, upgraded /org page from silent redirect into org selector hub showing all user orgs with role badges plus create/join action cards, replaced home page email display with cyan Enter button linking to /org), 009 (Roles & Permissions — RBAC permission system with typed org permissions admin/member and project permissions leader/developer, permission definitions with role-to-permission mappings, pure checker functions canOrgPermission/canProjectPermission/canAll/canAny, server-side permission guards requireOrgPermission/requireProjectPermission that throw ForbiddenError, client-side usePermission hook, example permission-aware components create-requirement-button/requirement-list-item/module-nav-item, example permission-protected API route /api/projects/[projectId]/settings, reusable context-aware UserMenu component with role badges, TopBar component for non-project pages, refactored Header to use shared UserMenu, added TopBar with avatar to all authenticated pages including home/org-selector/org-home/onboarding, useOptionalOrg and useOptionalProject hooks for context-aware rendering outside providers), 010 (Navigation & Module Switching — reusable Breadcrumb component refactored from header, Project Switcher dropdown in sidebar for switching between projects, Org Switcher dropdown in sidebar for switching between organizations, permission-aware sidebar module links showing disabled/restricted state, keyboard shortcuts hook with Cmd/Ctrl+1-5 module jumping wired into AppLayout, keyboard hint display in sidebar footer, GET /api/orgs/list endpoint returning user orgs with roles, GET /api/orgs/[orgId]/projects endpoint returning org projects with membership validation), 011 (Hall Database Schema — SQL migration 003_hall_schema.sql creating 5 tables: ideas with status tracking raw/developing/mature/promoted/archived + project scoping + audit fields + promoted_to_seed_id nullable UUID, tags with project-scoped custom colors + unique name constraint, idea_tags junction table, idea_connections for related/duplicates/extends relationships, agent_conversations with JSONB messages; RLS policies on all 5 tables using existing is_project_member() SECURITY DEFINER helper; new idea_project_member() SECURITY DEFINER function for indirect project membership checks on junction tables; 10 indexes; auto-update triggers on ideas.updated_at and agent_conversations.updated_at; updated TypeScript types with full Row/Insert/Update definitions and convenience aliases Idea/Tag/IdeaTag/IdeaConnection/AgentConversation/IdeaStatus), 012 (Hall Page Layout & UI — replaced Hall placeholder with full interactive page: HallClient orchestrator manages URL state for view/search/status/sort via useSearchParams + useRouter.replace, HallHeader with title/icon/subtitle/search input/New Idea button/Grid-List view toggle, HallEmptyState with lightbulb icon and CTA, IdeaCard with status badge/title-body preview/colored tag chips/creator avatar/relative timestamp, IdeaGrid with responsive 3/2/1 column layout and skeleton loading, IdeaList with select-all checkbox/column headers/compact rows/responsive column hiding, FilterBar with status dropdown/sort dropdown/active filter chips/clear all, ViewToggle with Grid/List icons, mobile FAB for New Idea above bottom nav, server component data fetching enriching ideas with tags and creator profiles, loading.tsx skeleton, shared types IdeaWithDetails/STATUS_CONFIG/STATUS_OPTIONS/SORT_OPTIONS, timeAgo utility in lib/utils.ts), 013 (Create Idea / Note Capture — IdeaCreateModal with title input (required, 200 char limit with live counter, autofocus), description textarea (optional, 3000 char limit with live counter, resizable), tag selection with search/filter existing project tags plus inline tag creation with custom color picker, client-side validation with error messages, submit button disabled until title has content with loading spinner, cancel with dirty-form discard confirmation, overlay click and Escape key dismiss, desktop centered 600px modal / mobile full-screen, success/error toasts via ToastProvider, POST /api/hall/ideas endpoint with server-side validation + project membership check + tag verification + new tag creation + full idea+tags+creator response, GET /api/hall/tags endpoint for fetching project tags, HallClient wired to router.refresh() on idea creation, useOptionalAuth hook fix for UserMenu HMR resilience), 014 (Idea List View — GET /api/hall/ideas endpoint with pagination (limit/offset), sorting (newest/oldest/updated/A-Z/Z-A), search (title+body ilike), status filtering, project membership validation, batch tag+profile enrichment, total count + hasMore flag; LoadMoreTrigger component with IntersectionObserver for auto-loading next page on scroll; NoResultsState component with SearchX icon and clear filters button; HallClient rewritten from client-side-only filtering to hybrid server+client pagination with initial 12 ideas from server component then API-based infinite scroll on scroll/filter/sort changes with 300ms search debounce and AbortController race condition handling; Hall page server component fetches only first 12 ideas + total count; alphabetical sort options A-Z and Z-A; loading states with opacity dimming + spinner during refetch, spinner during infinite scroll, "All N ideas loaded" end-of-list message), 015 (Hall Search & Filter — tag filter dropdown in FilterBar with multi-select checkboxes, search-within-tags input, Select all / Deselect all controls, AND-logic tag filtering; search clear (X) button in HallHeader search input; active filter chip bar below filter controls with removable chips for search term, status, and each selected tag with color dots; Clear all button resets search/status/tags/sort; filtered result count "N ideas found"; tag selections stored in URL as ?tags=uuid1,uuid2 for shareable bookmarkable filter states; GET /api/hall/ideas updated with tags param and server-side AND-logic filtering via idea_tags junction table; project tags fetched server-side and passed as initialTags to HallClient; all filters composable with URL state management), and 016 (Idea Detail Slide-Over — slide-over panel from right edge on idea card click with 300ms animation, 600px desktop / 500px tablet / full-width mobile, overlay click-to-close + Escape key + body scroll lock; full idea display with status badge, creator avatar/name/timestamps, full body text, colored clickable tag pills that filter Hall on click, Related Ideas section with connection type badges and click-to-navigate between connected ideas, Idea Info panel with metadata grid; action buttons Edit/Archive/Promote as UI placeholders for future phases; Archive confirmation dialog; loading spinner + error retry state; GET /api/hall/ideas/[ideaId] endpoint with tags + creator + membership validation; GET /api/hall/ideas/[ideaId]/connections endpoint with bidirectional connection fetching + enriched details; onIdeaClick wired into IdeaGrid and IdeaList; HallClient manages selectedIdeaId state) are complete and committed. I need you to build Phase 017 now.

Set this session's title to "Build Foundry Phase 017".

Read the phase spec at: Input Artifacts/Build/Phases/Phase-017-Edit-Delete-Ideas.md

Before you start coding, read these files to understand the current project state:
* components/hall/hall-client.tsx (HallClient orchestrator — manages URL state, infinite scroll, filter/sort/tag API refetching, initialTags prop, selectedIdeaId for slide-over)
* components/hall/idea-detail-slide-over.tsx (Phase 016 slide-over panel with fetch, animation, scroll lock, Escape key)
* components/hall/idea-detail-header.tsx (status badge, creator avatar/name, timestamps)
* components/hall/idea-detail-body.tsx (full body text display)
* components/hall/idea-detail-tags.tsx (clickable tag pills with onTagClick)
* components/hall/related-ideas-section.tsx (connected ideas with type badges, click-to-navigate)
* components/hall/idea-info-panel.tsx (metadata grid: status, created, updated, tag count)
* components/hall/idea-action-buttons.tsx (Edit/Archive/Promote buttons with Archive confirmation dialog — Edit and Promote currently disabled placeholders)
* components/hall/idea-create-modal.tsx (Phase 013 create modal with tag selection + inline tag creation)
* components/hall/idea-card.tsx (IdeaCard component with glass-panel styling)
* components/hall/idea-grid.tsx and components/hall/idea-list.tsx (grid/list views with onIdeaClick)
* components/hall/hall-header.tsx (header with search + X clear button, view toggle, new idea button)
* components/hall/filter-bar.tsx (status/sort/tag filters, active filter chip bar with removable chips, result count)
* components/hall/tag-filter.tsx (tag filter dropdown with search, checkboxes, select/deselect all)
* components/hall/load-more-trigger.tsx (IntersectionObserver infinite scroll trigger)
* components/hall/no-results-state.tsx (filtered empty state with SearchX icon)
* components/hall/types.ts (IdeaWithDetails, STATUS_CONFIG, SORT_OPTIONS including az/za, SortOption type)
* app/org/[orgSlug]/project/[projectId]/hall/page.tsx (server component — fetches first 12 ideas + total count + project tags)
* app/api/hall/ideas/route.ts (GET endpoint for paginated ideas with sort/search/status/tags AND-logic, POST endpoint for creating ideas)
* app/api/hall/ideas/[ideaId]/route.ts (GET endpoint for single idea with tags + creator + membership validation)
* app/api/hall/ideas/[ideaId]/connections/route.ts (GET endpoint for bidirectional connections with enriched details)
* app/api/hall/tags/route.ts (GET endpoint for fetching project tags)
* types/database.ts (full database types including ideas, tags, idea_tags, idea_connections)
* lib/supabase/server.ts (createClient, createServiceClient, getUser, getSession)
* lib/auth/server.ts (requireAuth, requireAuthWithProfile)
* lib/auth/errors.ts (handleAuthError)
* lib/auth/context.tsx (AuthProvider, useAuth, useOptionalAuth)
* components/ui/dialog.tsx (Dialog components)
* components/ui/toast-container.tsx (ToastProvider, useToast)
* components/ui/button.tsx (Button with variants, sizes, loading state)
* components/ui/badge.tsx (Badge with 7 variants)
* components/layout/app-layout.tsx (AppLayout shell)
* app/org/[orgSlug]/project/[projectId]/layout.tsx (project layout with providers)
* lib/utils.ts (cn helper, timeAgo utility)

Key things to know:
1. Next.js 16.1.6 with App Router, Turbopack, React 19, TypeScript strict mode
2. Tailwind CSS v4 with CSS-first config via @theme in globals.css (NOT tailwind.config.ts)
3. Brand colors are CSS custom properties: bg-primary #0f1117, bg-secondary #1a1d27, bg-tertiary #252830, text-primary #e4e7ec, text-secondary #8b8fa3, text-tertiary #5a5f73, accent-cyan #00d4ff, accent-purple #8b5cf6, accent-success/warning/error
4. Supabase for auth + PostgreSQL with RLS; service role client bypasses RLS for API routes
5. API routes use requireAuth() from lib/auth/server.ts and createServiceClient() from lib/supabase/server.ts
6. cn() helper in lib/utils.ts combines clsx + tailwind-merge
7. Database types in types/database.ts with convenience aliases (Idea, Tag, IdeaTag, etc.)
8. Glass panel styling via glass-panel CSS class for cards
9. All hall components are in components/hall/ directory
10. HallClient uses URL-based state management via useSearchParams + useRouter.replace
11. The existing Dialog component uses brand colors (bg-bg-secondary, border-border-default, etc.)
12. Toast system: useToast() hook → addToast(message, type) where type is 'success' | 'error' | 'info' | 'warning'
13. Button component supports isLoading prop with spinner, 5 variants (primary/secondary/ghost/danger/outline), 3 sizes
14. AppLayout is already wired into project layout — don't re-wrap module pages with it
15. Sidebar collapse is desktop-only; on mobile sidebar is always full-width overlay when open
16. React 19 ESLint: don't call setState directly inside useEffect body — wrap in async function instead (see existing pattern in hall-client.tsx doFetch pattern). Use useSyncExternalStore for browser-only values like navigator.platform
17. Next.js ESLint rule: don't use module as a variable name — use activeModule or similar
18. RLS for tenant isolation only — business logic in Next.js API routes
19. Service role key bypasses RLS for admin/API route operations
20. useOptionalOrg and useOptionalProject hooks exist for components rendered outside their providers
21. The Hall page server component fetches first 12 ideas with total count and project tags, enriches with tags and creator profiles, then passes to HallClient
22. IdeaCard shows status badge, title, body preview, colored tag chips, creator avatar, and relative timestamp
23. IdeaCreateModal creates ideas with title, description, existing tag selection, inline new tag creation with color picker, and calls POST /api/hall/ideas
24. useOptionalAuth hook in lib/auth/context.tsx is a non-throwing variant of useAuth for defensive rendering
25. HallClient manages infinite scroll: initial server data for default view, API refetch on filter/sort/search/tag changes with 300ms search debounce, LoadMoreTrigger with IntersectionObserver appends next page, AbortController handles race conditions
26. React 19 refs rule: don't assign to ref.current during render — use useEffect to sync (see load-more-trigger.tsx pattern)
27. GET /api/hall/ideas accepts projectId, limit, offset, sort (newest/oldest/updated/az/za), search, status, tags (comma-separated UUIDs with AND logic) params and returns { ideas, total, hasMore }
28. FilterBar includes TagFilter dropdown, status dropdown, sort dropdown, active filter chip bar with removable chips for search/status/tags, Clear all button, and "N ideas found" count
29. Tag filter supports multi-select with AND logic, search within tags, Select all / Deselect all, close on outside click / Escape
30. All filter state stored in URL params: ?search=term&status=developing&tags=uuid1,uuid2&sort=newest&view=grid
31. IdeaDetailSlideOver is the main slide-over component: fetches idea via GET /api/hall/ideas/[ideaId], shows loading/error/content states, animates in/out, handles Escape + overlay close + scroll lock, displays header/body/tags/related/info sections, tag click closes slide-over and filters Hall
32. IdeaActionButtons has Edit (disabled), Archive (shows confirmation dialog, disabled confirm), and Promote (disabled) — all awaiting Phase 017/025 implementation
33. RelatedIdeasSection fetches connections via GET /api/hall/ideas/[ideaId]/connections and shows connected ideas with type badges + click-to-navigate
34. GET /api/hall/ideas/[ideaId] returns full idea with tags array and creator object, validates project membership

**IMPORTANT**: This is a git worktree. You are already on branch `phase-017`. Do NOT run `git checkout` or switch branches. Just build directly on the current branch.

After building, run `npm run build` and `npm run lint` to verify zero errors. Then give me:
* A local link to the app
* What's new since Phase 016
* What I can test (include full clickable URLs like http://localhost:3000/login so they're easy to click)
* Ask me if I want any changes before moving on
* Then ask: "Ready to create a commit message with bullet points and push to GitHub?"

---

## ✅ AFTER BUILD — Do this after the session completes and you're satisfied

### 1. Commit and push (do this inside the session)
Have the session commit and push to the `phase-017` branch.

### 2. Merge to main
```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git checkout main
git pull
git merge phase-017
git push
```

### 3. Clean up the worktree
```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git worktree remove ../helix-phase-017
git branch -d phase-017
```

### 4. Return to the Conductor session
Say: **"update the roadmap"** — the conductor will mark Phase 017 as done and recalculate what's ready next.

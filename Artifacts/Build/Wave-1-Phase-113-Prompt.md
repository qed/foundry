# Wave 1 — Phase 113: Organization Console

## 🔧 SETUP — Do this BEFORE starting the Claude Code session

1. Open a terminal and navigate to the worktree directory:
   ```
   cd C:\Users\pkupe\OneDrive\ZCode\helix-phase-113
   ```
2. Open Claude Code FROM this directory (not the main Helix Foundry directory):
   ```
   claude
   ```
3. Paste the entire BUILD PROMPT section below into the session.

---

## 📋 BUILD PROMPT — Copy everything below this line into the Claude Code session

I'm building Helix Foundry, a 150-phase project. Phases 001 (Next.js setup), 002 (Supabase database schema — organizations table with id/name/slug/created_by/created_at, org_members with user_id/org_id/role, projects with id/name/org_id/created_by, project_members with user_id/project_id/role, RLS policies, is_project_member() and is_org_member() SECURITY DEFINER helpers), 003 (Supabase auth — login, signup, password reset, AuthProvider context), 004 (Auth middleware — proxy.ts route protection, cached server auth helpers requireAuth/requireAuthWithProfile, logout/status/profile API routes, useRequireAuth hook, redirectTo wiring), 005 (Multi-tenancy — URL-based org/project routing with /org/[orgSlug]/project/[projectId]/ pattern, OrgProvider/ProjectProvider/CurrentUserProvider contexts, org/project layouts with membership validation, org selector hub + org home + project dashboard pages, 5 module placeholder pages, POST /api/orgs and POST /api/projects creation endpoints, org-validation helpers, useOrgData/useProjectData hooks), 006 (Core UI Shell — collapsible sidebar with Dashboard + 5 module nav items using Lucide icons and cyan active highlights, header bar with breadcrumb navigation and user avatar dropdown, mobile bottom tab bar with custom colorful module icons, AppLayout shell combining sidebar/header/mobile-nav), 007 (Global UI Components — 12 reusable components in components/ui/: Button with 5 variants primary/secondary/ghost/danger/outline + 3 sizes sm/md/lg + isLoading prop, Input/Textarea/Select with labels + error + helper text, Card with composable Header/Title/Body/Footer, Badge with 7 variants, Dialog modal with overlay close + Escape key + scroll lock, Spinner in 3 sizes, Avatar with gradient initials fallback, Toast + ToastContainer with 4 types success/error/info/warning and auto-dismiss via useToast hook, EmptyState with icon/title/description/action), 008 (Registration & Onboarding — onboarding router, org-choice page, create-org page with slug preview, join-org page with invite code, create-project page, /api/orgs/join endpoint, org selector hub with role badges), 009 (Roles & Permissions — RBAC with typed org permissions admin/member and project permissions leader/developer, permission definitions with role-to-permission mappings, pure checker functions canOrgPermission/canProjectPermission/canAll/canAny, server-side guards requireOrgPermission/requireProjectPermission that throw ForbiddenError, client-side usePermission hook, reusable UserMenu with role badges, TopBar component, useOptionalOrg/useOptionalProject hooks), 010 (Navigation & Module Switching — reusable Breadcrumb component, Project Switcher dropdown, Org Switcher dropdown, permission-aware sidebar module links, keyboard shortcuts Cmd/Ctrl+1-5, GET /api/orgs/list and GET /api/orgs/[orgId]/projects endpoints), 011-016 (Hall module — database schema, page layout, create idea, idea list with pagination, search & filter with tag AND-logic, idea detail slide-over) are complete and committed. I need you to build Phase 113 now.

Set this session's title to "Build Foundry Phase 113".

Read the phase spec at: Input Artifacts/Build/Phases/Phase-113-Org-Console.md

Before you start coding, read these files to understand the current project state:
* types/database.ts (full database types — check organizations and org_members table structure)
* supabase/migrations/002_core_schema.sql (organizations, org_members, projects, project_members table definitions and RLS)
* lib/supabase/server.ts (createClient, createServiceClient patterns)
* lib/auth/server.ts (requireAuth, requireAuthWithProfile — study these for API route patterns)
* lib/auth/errors.ts (handleAuthError utility)
* lib/auth/context.tsx (AuthProvider, useAuth, useOptionalAuth)
* lib/permissions/definitions.ts (permission definitions, role mappings)
* lib/permissions/hooks.ts (usePermission hook)
* lib/permissions/server.ts (requireOrgPermission, requireProjectPermission guards)
* components/layout/app-layout.tsx (AppLayout shell — understand the layout structure)
* components/layout/sidebar.tsx (sidebar component for navigation)
* components/layout/header.tsx (header with breadcrumbs, UserMenu)
* components/layout/user-menu.tsx (UserMenu with role badges)
* components/layout/top-bar.tsx (TopBar for non-project pages)
* app/org/[orgSlug]/layout.tsx (org-level layout with OrgProvider)
* app/org/[orgSlug]/page.tsx (org home page — understand existing org page patterns)
* app/api/orgs/route.ts (POST org creation endpoint)
* app/api/orgs/[orgId]/projects/route.ts (GET projects endpoint)
* components/ui/dialog.tsx (Dialog components for confirmation modals)
* components/ui/toast-container.tsx (ToastProvider, useToast)
* components/ui/button.tsx (Button with variants, sizes, loading state)
* components/ui/input.tsx and components/ui/select.tsx (form components)
* components/ui/badge.tsx (Badge with 7 variants)
* components/ui/card.tsx (Card composable components)
* components/ui/empty-state.tsx (EmptyState component)
* components/ui/avatar.tsx (Avatar with gradient fallback)
* app/globals.css (brand colors and theme variables)
* lib/utils.ts (cn helper, timeAgo utility)

Key things to know:
1. Next.js 16.1.6 with App Router, Turbopack, React 19, TypeScript strict mode
2. Tailwind CSS v4 with CSS-first config via @theme in globals.css (NOT tailwind.config.ts)
3. Brand colors are CSS custom properties: bg-primary #0f1117, bg-secondary #1a1d27, bg-tertiary #252830, text-primary #e4e7ec, text-secondary #8b8fa3, text-tertiary #5a5f73, accent-cyan #00d4ff, accent-purple #8b5cf6, accent-success/warning/error
4. Supabase for auth + PostgreSQL with RLS; service role client (createServiceClient()) bypasses RLS for API routes
5. API routes use requireAuth() from lib/auth/server.ts and createServiceClient() from lib/supabase/server.ts
6. cn() helper in lib/utils.ts combines clsx + tailwind-merge
7. Glass panel styling via glass-panel CSS class for cards
8. Toast system: useToast() hook → addToast(message, type)
9. Button supports isLoading prop with spinner, 5 variants, 3 sizes
10. AppLayout is already wired into the project layout — but the Org Console is at the ORG level (/org/[orgSlug]/settings), not project level. Check how the org layout works.
11. React 19 ESLint: don't call setState directly inside useEffect body — wrap in async function. Don't use `module` as a variable name.
12. Permission system: canOrgPermission(role, permission) checks if an org role has a specific permission. requireOrgPermission() is the server-side guard.
13. The existing org_members table has a `role` column — check what values it uses (likely 'admin' and 'member' based on Phase 005/009).
14. The phase spec mentions database changes (ALTER TABLE organizations ADD COLUMN avatar_url, description, updated_at) — you may need a small migration for these columns if they don't already exist. Check the existing schema first.
15. The phase spec mentions a file structure under `src/` — this project does NOT use a `src/` directory. Components go in `components/`, pages go in `app/`, API routes go in `app/api/`. Adapt the file structure accordingly.
16. The phase spec suggests `components/org-console/` — use `components/admin/` instead to match the roadmap's File Areas column.
17. For API routes, follow the existing pattern: `app/api/orgs/[orgSlug]/...` — check how existing org API routes are structured.
18. RLS for tenant isolation only — business logic in Next.js API routes
19. The existing useOrgData hook provides org data in client components within the org layout
20. Avatar upload: the phase spec mentions Supabase Storage. If Supabase Storage isn't set up yet, implement the avatar upload UI but use a placeholder/URL input instead of actual file upload. Note this as a limitation.

**IMPORTANT**: This is a git worktree. You are already on branch `phase-113`. Do NOT run `git checkout` or switch branches. Just build directly on the current branch.

After building, run `npm run build` and `npm run lint` to verify zero errors. Then give me:
* A local link to the app (the settings page URL)
* What's new since Phase 010 (last admin-related phase)
* What I can test (include full clickable URLs like http://localhost:3000/org/my-org/settings)
* Ask me if I want any changes before moving on
* Then ask: "Ready to create a commit message with bullet points and push to GitHub?"

---

## ✅ AFTER BUILD — Do this after the session completes and you're satisfied

### 1. Commit and push (do this inside the session)
Have the session commit and push to the `phase-113` branch.

### 2. Merge to main
Phase 113 does NOT touch `types/database.ts` or `supabase/migrations/` (unless a small ALTER TABLE was needed). It can be merged in any order relative to other Wave 1 phases, but for simplicity merge it AFTER Phase 017.

```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git checkout main
git pull
git merge phase-113
git push
```

### 3. Clean up the worktree
```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git worktree remove ../helix-phase-113
git branch -d phase-113
```

### 4. Return to the Conductor session
Say: **"update the roadmap"** — the conductor will mark Phase 113 as done and recalculate what's ready next.

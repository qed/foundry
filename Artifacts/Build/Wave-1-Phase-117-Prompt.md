# Wave 1 — Phase 117: Real-Time Presence

## 🔧 SETUP — Do this BEFORE starting the Claude Code session

1. Open a terminal and navigate to the worktree directory:
   ```
   cd C:\Users\pkupe\OneDrive\ZCode\helix-phase-117
   ```
2. Open Claude Code FROM this directory (not the main Helix Foundry directory):
   ```
   claude
   ```
3. Paste the entire BUILD PROMPT section below into the session.

---

## 📋 BUILD PROMPT — Copy everything below this line into the Claude Code session

I'm building Helix Foundry, a 150-phase project. Phases 001 (Next.js setup), 002 (Supabase database schema — organizations, org_members, projects, project_members tables with RLS policies, is_project_member() and is_org_member() SECURITY DEFINER helpers), 003 (Supabase auth — login, signup, password reset, AuthProvider context providing session/user/loading state), 004 (Auth middleware — proxy.ts route protection, cached server auth helpers requireAuth/requireAuthWithProfile, logout/status/profile API routes, useRequireAuth hook), 005 (Multi-tenancy — URL-based org/project routing with /org/[orgSlug]/project/[projectId]/ pattern, OrgProvider/ProjectProvider/CurrentUserProvider contexts, org/project layouts with membership validation), 006 (Core UI Shell — collapsible sidebar with Dashboard + 5 module nav items using Lucide icons and cyan active highlights, header bar with breadcrumb navigation and user avatar dropdown, mobile bottom tab bar, AppLayout shell combining sidebar/header/mobile-nav), 007 (Global UI Components — 12 reusable components in components/ui/: Button, Input, Textarea, Select, Card, Badge, Dialog, Spinner, Avatar with gradient initials fallback, Toast + ToastContainer via useToast, EmptyState), 008 (Registration &amp; Onboarding), 009 (Roles &amp; Permissions — RBAC, permission guards, usePermission hook), 010 (Navigation &amp; Module Switching — Breadcrumb, Project/Org Switcher, keyboard shortcuts Cmd/Ctrl+1-5, permission-aware sidebar links), 011-016 (Hall module — complete with database schema, page layout, idea CRUD, list with pagination, search/filter, detail slide-over) are complete and committed. I need you to build Phase 117 now.

Set this session's title to "Build Foundry Phase 117".

Read the phase spec at: Input Artifacts/Build/Phases/Phase-117-Realtime-Presence.md

Before you start coding, read these files to understand the current project state:
* lib/supabase/server.ts (createClient, createServiceClient — server-side Supabase client patterns)
* lib/supabase/client.ts (client-side Supabase client — you'll need this for Realtime channels)
* lib/auth/context.tsx (AuthProvider, useAuth, useOptionalAuth — you need session/user info for presence)
* components/layout/app-layout.tsx (AppLayout shell — presence provider should integrate here or in the project layout)
* components/layout/sidebar.tsx (sidebar — online users list could be added here)
* components/layout/header.tsx (header — online avatars could be shown here)
* components/ui/avatar.tsx (Avatar component with gradient initials fallback — reuse for presence avatars)
* components/ui/badge.tsx (Badge component)
* app/org/[orgSlug]/project/[projectId]/layout.tsx (project layout — presence tracking should activate at this level)
* app/org/[orgSlug]/project/[projectId]/hall/page.tsx (example module page — to understand module routing for detecting current module)
* types/database.ts (database types — understand user/profile structure)
* app/globals.css (brand colors and theme variables — use these for presence indicators)
* lib/utils.ts (cn helper)

Key things to know:
1. Next.js 16.1.6 with App Router, Turbopack, React 19, TypeScript strict mode
2. Tailwind CSS v4 with CSS-first config via @theme in globals.css (NOT tailwind.config.ts)
3. Brand colors: bg-primary #0f1117, bg-secondary #1a1d27, bg-tertiary #252830, text-primary #e4e7ec, text-secondary #8b8fa3, accent-cyan #00d4ff, accent-purple #8b5cf6, accent-success #22c55e (use this green for online indicators)
4. Supabase Realtime is the backbone — use Supabase Presence channels (not database Realtime subscriptions). Presence is built into the Supabase client library.
5. The Supabase client is created via `createBrowserClient()` in lib/supabase/client.ts — use this for client-side Realtime subscriptions.
6. cn() helper in lib/utils.ts combines clsx + tailwind-merge
7. Avatar component in components/ui/avatar.tsx has gradient initials fallback — reuse this for online user avatars
8. Glass panel styling via glass-panel CSS class
9. React 19 ESLint: don't call setState directly inside useEffect body — wrap in async function. Don't use `module` as a variable name — use `activeModule` or `currentModule`.
10. AppLayout is already wired into the project layout — don't re-wrap module pages
11. The 5 modules are: hall, shop (pattern_shop), room (control_room), floor (assembly_floor), lab (insights_lab). Module detection should work from the URL path.
12. The phase spec mentions a file structure under `src/` — this project does NOT use a `src/` directory. Components go in `components/`, hooks go in `lib/` or `hooks/` (check existing patterns), pages go in `app/`.
13. The phase spec mentions `lib/supabase/realtime.ts` — you may or may not need this. The Supabase client already includes Realtime capabilities. Only create this file if there's meaningful setup to abstract.
14. For the usePresence hook: it should create a Supabase Presence channel per project, track the current user's module, and return a list of online users. Clean up subscriptions on unmount.
15. Detect current module from the URL pathname: extract the segment after `/project/[projectId]/` (e.g., "hall", "shop", "room", "floor", "lab").
16. The PresenceProvider should wrap the project layout (not the entire app) — presence is project-scoped.
17. Consider where to show presence UI: the sidebar already has a sidebar footer area with keyboard shortcuts. Online users could go above that or in the header. Keep it subtle.
18. The useToast hook is available for any error notifications.
19. useOptionalAuth in lib/auth/context.tsx provides auth state without throwing.
20. Button component supports isLoading, 5 variants, 3 sizes.

**IMPORTANT**: This is a git worktree. You are already on branch `phase-117`. Do NOT run `git checkout` or switch branches. Just build directly on the current branch.

After building, run `npm run build` and `npm run lint` to verify zero errors. Then give me:
* A local link to the app
* What's new since Phase 010 (this is a new cross-cutting feature)
* What I can test (include full clickable URLs, explain how to test with multiple browser tabs/users)
* Ask me if I want any changes before moving on
* Then ask: "Ready to create a commit message with bullet points and push to GitHub?"

---

## ✅ AFTER BUILD — Do this after the session completes and you're satisfied

### 1. Commit and push (do this inside the session)
Have the session commit and push to the `phase-117` branch.

### 2. Merge to main
Phase 117 touches `lib/realtime/` and `components/layout/` but NOT `types/database.ts`. It can be merged in any order relative to 017 and 026. For simplicity, merge it last (after 017 and 026).

```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git checkout main
git pull
git merge phase-117
git push
```

### 3. Clean up the worktree
```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git worktree remove ../helix-phase-117
git branch -d phase-117
```

### 4. Return to the Conductor session
Say: **"update the roadmap"** — the conductor will mark Phase 117 as done and recalculate what's ready next.

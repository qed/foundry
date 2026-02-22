# Wave 1 — Phase 026: Pattern Shop Database Schema

## 🔧 SETUP — Do this BEFORE starting the Claude Code session

1. Open a terminal and navigate to the worktree directory:
   ```
   cd C:\Users\pkupe\OneDrive\ZCode\helix-phase-026
   ```
2. Open Claude Code FROM this directory (not the main Helix Foundry directory):
   ```
   claude
   ```
3. Paste the entire BUILD PROMPT section below into the session.

---

## 📋 BUILD PROMPT — Copy everything below this line into the Claude Code session

I'm building Helix Foundry, a 150-phase project. Phases 001 (Next.js setup), 002 (Supabase database schema — organizations, org_members, projects, project_members tables with RLS policies, is_project_member() SECURITY DEFINER helper, is_org_member() helper, indexes, auto-update triggers), 003 (Supabase auth — login, signup, password reset, AuthProvider context), 004 (Auth middleware — proxy.ts route protection, cached server auth helpers, logout/status/profile API routes, useRequireAuth hook, redirectTo wiring), 005 (Multi-tenancy — URL-based org/project routing, OrgProvider/ProjectProvider/CurrentUserProvider contexts, org/project layouts with membership validation, org selector + org home + project dashboard pages, 5 module placeholder pages, org/project creation API routes + forms, org-validation helpers, useOrgData/useProjectData hooks, custom module icons), 006 (Core UI Shell — collapsible sidebar with Dashboard + 5 module nav items using Lucide icons and cyan active highlights, header bar with breadcrumb navigation and user avatar dropdown, mobile bottom tab bar with custom colorful module icons, AppLayout shell combining sidebar/header/mobile-nav with responsive behavior), 007 (Global UI Components — 12 reusable components in components/ui/: Button with 5 variants + 3 sizes + loading state, Input/Textarea/Select, Card, Badge with 7 variants, Dialog modal, Spinner, Avatar, Toast + ToastContainer via useToast hook, EmptyState), 008 (Registration & Onboarding), 009 (Roles & Permissions — RBAC with org admin/member and project leader/developer permissions, permission guards, usePermission hook), 010 (Navigation & Module Switching), 011 (Hall Database Schema — SQL migration 003_hall_schema.sql creating ideas, tags, idea_tags, idea_connections, agent_conversations tables with RLS using is_project_member() SECURITY DEFINER, idea_project_member() helper for junction tables, CHECK constraints for status enums, 10 indexes, updated types/database.ts), 012 (Hall Page Layout & UI), 013 (Create Idea / Note Capture), 014 (Idea List View with pagination), 015 (Hall Search & Filter with tag AND-logic), and 016 (Idea Detail Slide-Over) are complete and committed. I need you to build Phase 026 now.

Set this session's title to "Build Foundry Phase 026".

Read the phase spec at: Input Artifacts/Build/Phases/Phase-026-Pattern-Shop-Schema.md

Before you start coding, read these files to understand the current project state:
* types/database.ts (full database types — study the structure carefully, you'll be adding new table types here)
* supabase/migrations/002_core_schema.sql (core schema with is_project_member() SECURITY DEFINER pattern)
* supabase/migrations/003_hall_schema.sql (Hall schema — follow the same patterns: CHECK constraints instead of CREATE TYPE enums, SECURITY DEFINER helpers for junction table RLS, auto-update triggers)
* lib/supabase/server.ts (createClient, createServiceClient patterns)
* lib/auth/server.ts (requireAuth, requireAuthWithProfile)

Key things to know:
1. Next.js 16.1.6 with App Router, Turbopack, React 19, TypeScript strict mode
2. Tailwind CSS v4 with CSS-first config via @theme in globals.css (NOT tailwind.config.ts)
3. Supabase for auth + PostgreSQL with RLS; service role client bypasses RLS for API routes
4. **CRITICAL PATTERN**: The Hall schema (migration 003) uses CHECK constraints for status/type columns instead of CREATE TYPE enums. Follow this same pattern for feature_nodes level, status, and requirements doc_type. For example: `CHECK (status IN ('not_started', 'in_progress', 'complete', 'blocked'))` instead of `CREATE TYPE feature_status AS ENUM (...)`.
5. **CRITICAL PATTERN**: RLS policies in migration 003 use the `is_project_member()` SECURITY DEFINER helper from migration 002 to avoid recursion. Use this same helper for feature_nodes and requirements_documents. For junction/child tables that need indirect project access, create a new SECURITY DEFINER helper function (similar to idea_project_member() in migration 003).
6. Migration file naming: use the next sequence number. Check existing files in `supabase/migrations/` — if the last is 003, yours should be `004_pattern_shop_schema.sql`.
7. TypeScript types in types/database.ts follow a specific structure: table definitions inside `Database.public.Tables`, helper functions in `Database.public.Functions`, and convenience type aliases at the bottom of the file (e.g., `export type FeatureNode = Database['public']['Tables']['feature_nodes']['Row']`).
8. The phase spec mentions CREATE TYPE enums — **ignore that** and use CHECK constraints to be consistent with the Hall schema pattern.
9. The phase spec mentions RLS policies that directly query project_members — **instead** use the is_project_member() SECURITY DEFINER helper for consistency and to avoid RLS recursion.
10. The phase spec mentions roles like 'owner' and 'editor' in RLS policies — check the actual role values used in the project_members table (they may be 'leader' and 'developer' based on Phase 009). Use is_project_member() for read access (all members can read) and handle write-permission logic in API routes instead.
11. RLS for tenant isolation only — business logic (role checks, validation) in Next.js API routes
12. Add auto-update triggers for updated_at columns (same pattern as Hall schema)
13. Add appropriate indexes on foreign keys and frequently-queried columns

**IMPORTANT**: This is a git worktree. You are already on branch `phase-026`. Do NOT run `git checkout` or switch branches. Just build directly on the current branch.

After building, run `npm run build` and `npm run lint` to verify zero errors. Then give me:
* What's new (migration file created, types added)
* What I can test (SQL commands to verify tables, constraints, RLS)
* Ask me if I want any changes before moving on
* Then ask: "Ready to create a commit message with bullet points and push to GitHub?"

---

## ✅ AFTER BUILD — Do this after the session completes and you're satisfied

### 1. Commit and push (do this inside the session)
Have the session commit and push to the `phase-026` branch.

### 2. Merge to main
**IMPORTANT**: Phase 026 modifies `types/database.ts`. Merge it AFTER Phase 017 (which doesn't touch that file).

```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git checkout main
git pull
git merge phase-026
git push
```

If there's a conflict in `types/database.ts`, resolve by keeping both sets of type additions.

### 3. Clean up the worktree
```bash
cd "C:\Users\pkupe\OneDrive\ZCode\Helix Foundry"
git worktree remove ../helix-phase-026
git branch -d phase-026
```

### 4. Return to the Conductor session
Say: **"update the roadmap"** — the conductor will mark Phase 026 as done and recalculate what's ready next.

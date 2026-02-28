# Foundation (Phases 001--010)

> Core platform setup: Next.js, Supabase, auth, multi-tenancy, UI shell, permissions, navigation.
> Key files: `lib/auth/`, `lib/supabase/`, `components/layout/`, `components/ui/`, `app/globals.css`

**001** -- Next.js setup

**002** -- Supabase database schema -- organizations, org_members, projects, project_members tables with RLS policies, is_project_member() and is_org_member() SECURITY DEFINER helpers, indexes, auto-update triggers

**003** -- Supabase auth -- login, signup, password reset, AuthProvider context

**004** -- Auth middleware -- proxy.ts route protection, cached server auth helpers requireAuth/requireAuthWithProfile, logout/status/profile API routes, useRequireAuth hook, redirectTo wiring

**005** -- Multi-tenancy -- URL-based org/project routing, OrgProvider/ProjectProvider/CurrentUserProvider contexts, org/project layouts with membership validation, org selector + org home + project dashboard pages, 5 module placeholder pages, org/project creation API routes + forms, org-validation helpers, useOrgData/useProjectData hooks, custom module icons

**006** -- Core UI Shell -- collapsible sidebar with Dashboard + 5 module nav items using Lucide icons and cyan active highlights, header bar with breadcrumb navigation and user avatar dropdown, mobile bottom tab bar with custom colorful module icons, AppLayout shell combining sidebar/header/mobile-nav with responsive behavior, sidebar collapse desktop-only, simplified module pages for shell context, focus-visible styles

**007** -- Global UI Components -- 12 reusable components in components/ui/: Button with 5 variants + 3 sizes + loading state via class-variance-authority, Input/Textarea/Select with labels + error + helper text, Card with composable Header/Title/Body/Footer, Badge with 7 variants including purple, Dialog modal with overlay close + Escape key + scroll lock, Spinner in 3 sizes, Avatar with gradient initials fallback, Toast + ToastContainer with 4 types and auto-dismiss via useToast hook, EmptyState with icon/title/description/action, ToastProvider wired into root layout, component showcase page at /components

**008** -- Registration & Onboarding -- onboarding router at /onboarding that checks org membership and redirects, org-choice page with Create/Join cards, create-org page with slug preview calling /api/orgs, join-org page with base64 invite code calling /api/orgs/join, create-project page calling /api/projects then redirecting to project dashboard, /api/orgs/join endpoint using createServiceClient to bypass RLS, upgraded /org page from silent redirect into org selector hub showing all user orgs with role badges plus create/join action cards, replaced home page email display with cyan Enter button linking to /org

**009** -- Roles & Permissions -- RBAC permission system with typed org permissions admin/member and project permissions leader/developer, permission definitions with role-to-permission mappings, pure checker functions canOrgPermission/canProjectPermission/canAll/canAny, server-side permission guards requireOrgPermission/requireProjectPermission that throw ForbiddenError, client-side usePermission hook, example permission-aware components create-requirement-button/requirement-list-item/module-nav-item, example permission-protected API route /api/projects/[projectId]/settings, reusable context-aware UserMenu component with role badges, TopBar component for non-project pages, refactored Header to use shared UserMenu, added TopBar with avatar to all authenticated pages including home/org-selector/org-home/onboarding, useOptionalOrg and useOptionalProject hooks for context-aware rendering outside providers

**010** -- Navigation & Module Switching -- reusable Breadcrumb component refactored from header, Project Switcher dropdown in sidebar for switching between projects, Org Switcher dropdown in sidebar for switching between organizations, permission-aware sidebar module links showing disabled/restricted state, keyboard shortcuts hook with Cmd/Ctrl+1-5 module jumping wired into AppLayout, keyboard hint display in sidebar footer, GET /api/orgs/list endpoint returning user orgs with roles, GET /api/orgs/[orgId]/projects endpoint returning org projects with membership validation

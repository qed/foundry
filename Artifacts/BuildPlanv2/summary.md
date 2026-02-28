# Foundry v2 — Build Summary

> **Purpose**: High-level overview of the entire project: what it is, how it's structured, and what each epic delivers.
> **Location**: `Artifacts/BuildPlanv2/summary.md` (kept in sync via alignment.md).
> **Last updated**: 2026-02-28

---

## Project Overview

Foundry v2 introduces "Helix Mode" — a linear, quality-controlled software development process built into the existing Foundry application. While Foundry v1 ("Open Mode") provides five free-form modules for product development (Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab), Helix Mode adds a structured, gated workflow that guides teams through the complete Helix methodology: from ideation through documentation, build planning, repo setup, building, testing, and deployment. Users toggle between Open Mode and Helix Mode within the same project, sharing the same database. Helix Mode enforces hard-block gate checks — you cannot proceed to the next step until the current step is verified complete with evidence. The MVP is a PM tracker; subsequent epics layer in AI automation, deep v1 data sync, and external tool integrations.

---

## Repositories

| Repo | GitHub URL | Contains |
|------|-----------|----------|
| Foundry | `git@github.com:qed/foundry.git` | Full-stack Next.js app (v1 Open Mode + v2 Helix Mode) |

---

## Epic Overview

| Epic | Name | Phases | Summary |
|------|------|--------|---------|
| 1 | Foundation & Mode Infrastructure | 001–008 | Database migration, mode toggle, route structure, sidebar, gate check engine |
| 2 | Planning Stage (Steps 1.1–1.3) | 009–014 | Step detail views, project idea input, brainstorming prompt, project brief save |
| 3 | Documentation Stage (Steps 2.1–2.4) | 015–021 | Documentation inventory, knowledge capture, file upload, artifact integration |
| 4 | Build Planning & Repo Setup (Steps 3.1–4.4) | 022–032 | Build plan input, viewer, quality review, repo template, git init, pre-build review |
| 5 | Build, Testing & Deployment (Steps 6.1–8.3) | 033–044 | Phase tracker, testing matrix, deployment checklist, process completion |
| 6 | MVP Polish & Cross-Cutting | 045–052 | Timeline view, exports, error handling, loading states, responsive, permissions, tests |
| 7 | In-App Brainstorming (Step 1.2 Automation) | 053–062 | Chat UI, Claude streaming, 4-phase brainstorming engine, session persistence |
| 8 | In-App Build Planning (Steps 3.1–3.2 Automation) | 063–074 | Build planning chat, document injection, plan generation, quality validation |
| 9 | Documentation Intelligence (Steps 2.1–2.4 Automation) | 075–083 | AI inventory, gap detection, document review, knowledge extraction |
| 10 | Repo Setup Automation (Steps 4.1–4.4) | 084–091 | Template customizer, auto-replace, downloadable project folder, GitHub integration |
| 11 | Build Phase Management (Step 6.1 Enhancement) | 092–101 | Spec viewer, session tracking, automated discovery, commit tracking, MCP API |
| 12 | Testing Intelligence (Steps 7.1–7.2 Enhancement) | 102–108 | Testing dashboard, test results capture, coverage tracking, bug tracking |
| 13 | Deployment Pipeline (Steps 8.1–8.3 Enhancement) | 109–114 | Deployment checklist generator, environment manager, readiness gate, monitoring |
| 14 | Deep V1 Module Data Sync | 115–124 | Bi-directional sync with Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab |
| 15 | Knowledge Graph Integration | 125–129 | Helix artifacts as graph entities, cross-step relationships, impact analysis |
| 16 | Real-Time Collaboration | 130–135 | Multi-user steps, presence, comments, notifications, role-based assignments |
| 17 | Process Analytics & Reporting | 136–141 | Metrics dashboard, multi-project comparison, templates, executive summaries |
| 18 | MCP & External Agent Integration | 142–148 | REST API, Claude Code integration, GitHub/CI-CD webhooks, agent dashboard |
| 19 | Process Customization & Advanced | 149–157 | Custom stages/steps, conditional logic, template library, accessibility, performance |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 16+ with App Router & Turbopack |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 with brand CSS variables |
| Authentication | Supabase Auth (existing v1 system) |
| Database | PostgreSQL via Supabase with Row-Level Security |
| Real-time | Supabase Realtime |
| File Storage | Supabase Storage (existing Artifacts system) |
| Multi-tenancy | Existing org/project context with mode toggle |
| AI Integration | Anthropic Claude (haiku for agents, sonnet for complex generation) |
| Rich Text | TipTap |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Collaboration | Yjs |

---

## Application Map

```
Helix Mode — Foundry v2
  Stages (8 total):
    1. Planning (Steps 1.1–1.3) — Project idea, brainstorming, project brief
    2. Documentation (Steps 2.1–2.4) — Inventory, knowledge capture, file gather, verify
    3. Build Planning (Steps 3.1–3.3) — Build plan generation, quality review
    4. Repo Setup (Steps 4.1–4.4) — Template, placeholders, BuildPlan folder, git init
    5. Pre-Build Review (Step 5.1) — Final checkpoint before building
    6. Build (Step 6.1) — Phase-by-phase build cycle
    7. Testing (Steps 7.1–7.2) — Per-phase testing, integration testing
    8. Deployment (Steps 8.1–8.3) — Prepare, deploy, verify

  Gate Checks:
    - Hard-block enforcement between steps
    - Evidence required for completion
    - Stage-level validation before advancing

  Integration Points:
    - Mode toggle: Open Mode <-> Helix Mode (project-level)
    - Shared database with v1 modules
    - Artifact storage shared with v1
    - Route: /org/[orgSlug]/project/[projectId]/helix/...
```

---

*Updated after each phase via alignment.md.*

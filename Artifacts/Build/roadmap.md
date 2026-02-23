# Helix Foundry — Sequential Build Roadmap

> **Single source of truth** for sequential phase execution on main.
> Last updated: 2026-02-23

---

## ⮕ START HERE: Context-Optimized Build Queue

**Mode**: Sequential execution directly on `main` branch. No feature branches or worktrees.

**Strategy**: Phases grouped into **module clusters** — consecutive phases share the same files and patterns, minimizing context re-reading. Within each cluster, dependency order is respected. Between clusters, ordering maximizes downstream unblocking.

**Per-phase workflow**: Read spec -> Build on main -> `npm run build && npm run lint` -> Commit -> Push -> Update roadmap + nextsteps -> Next phase.

---

### Completed Phases (134/150)

001–010 (Foundation), 011–020 (Hall core), 024–032 (Hall realtime + Shop layout/tree/DnD), 033–035 (Shop docs + status tracking), 037 (Shop agent), 046–051 (Room schema/layout/blueprints), 054 (Blueprint status), 056 (Room agent), 059–060 (Blueprint versioning + comments), 061–070 (Floor schema/layout/WO/kanban/table/assignment/phases/priority), 073 (Floor agent), 078–080 (Floor comments + dashboard + MCP), 081–091 (Lab full stack + auto-categorization), 092 (Feedback enrichment), 094–095 (App key management + bulk ops), 096–104 (Artifacts full stack + folders + versioning complete), 105 (Comments schema), 106 (@Mentions), 107–108 (Notifications + Email), 109–111 (Knowledge schema + explorer + auto-connections), 112 (Manual entity linking), 113 (Org console), 117 (Realtime presence), 118 (Collaborative editing), 119 (Audit trail), 120 (Project archive), 121–123 (Idea maturity + agent instructions + aggregate export), 124 (Drift detection), 125 (Cross-doc suggestions), 126 (Org templates), 127 (Extraction strategy), 128 (Phase burndown), 129 (MCP implementation), 130 (WO sync alerts), 131–133 (Slack integration + feedback analytics + priority scoring), 114–116 (Team invitations + billing + user profile)

---

### Cluster 1: Hall Agents — 3 phases
> Context: `components/hall/`, agent patterns from Phase 020
> Unblocks: 121 (Idea Maturity Scoring)

| # | Phase | Name |
|---|-------|------|
| 1 | 021 | Agent: Auto-Tag Suggestions |
| 2 | 022 | Agent: Duplicate Detection |
| 3 | 023 | Agent: Connection Discovery |

### Cluster 2: Artifacts — 4 phases
> Context: `components/artifacts/`
> Unblocks: 106 (@Mentions — starts Comments chain)

| # | Phase | Name |
|---|-------|------|
| 4 | 098 | Artifact Browser & Management |
| 5 | 099 | Artifact Linking to Entities |
| 6 | 100 | Artifact Search & Indexing |
| 7 | 101 | Artifact Folders & Organization |

### Cluster 3: Shop Deep Work — 13 phases
> Context: `components/shop/`, feature tree, documents, agents
> Unblocks: 126 (Org-Level Templates), 44 phases use Shop types

| # | Phase | Name | Notes |
|---|-------|------|-------|
| 8 | 032 | Feature Tree Drag-and-Drop | |
| 9 | 035 | Feature Tree Status Tracking | unblocks 036, 041 |
| 10 | 036 | Feature Tree Search & Filter | needs 035 |
| 11 | 041 | Feature Tree Statistics | needs 035 |
| 12 | 038 | Agent: Feature Tree Generation | |
| 13 | 039 | Agent: Requirements Review | needed for 044 |
| 14 | 040 | Agent: Gap Detection | |
| 15 | 042 | Requirements Import/Export | unblocks 123 |
| 16 | 043 | Document Versioning | needed for 044 |
| 17 | 045 | Technical Requirements | |
| 18 | 044 | Pattern Shop Comments | needs 039 + 043 |
| 19 | ~~122~~ | ~~Agent Writing Instructions~~ | done |
| 20 | ~~123~~ | ~~Aggregate Export~~ | done |

### Cluster 4: Control Room — 10 phases
> Context: `components/room/`, blueprints, agents
> Unblocks: 125 (Cross-Doc Suggestions), 130 (WO Sync Alerts)

| # | Phase | Name | Notes |
|---|-------|------|-------|
| 21 | 053 | Blueprint Templates | unblocks 126 |
| 22 | 052 | Feature-Blueprint Linking | cross-module |
| 23 | 055 | Blueprint Search & Filter | |
| 24 | 057 | Agent: Blueprint Generation | needed for 125 |
| 25 | 058 | Agent: Blueprint Review | |
| 26 | 059 | Blueprint Version History | unblocks 060 |
| 27 | 060 | Blueprint Comments | needs 059 |
| 28 | 124 | Drift Detection | was mis-tracked as blocked |
| 29 | ~~126~~ | ~~Org-Level Blueprint Templates~~ | done |
| 30 | ~~125~~ | ~~Cross-Document Suggestions~~ | done |

### Cluster 5: Knowledge Graph (Part 1) — 2 phases
> Context: `components/knowledge/`
> Phase 111 deferred to after Comments cluster

| # | Phase | Name |
|---|-------|------|
| 31 | 110 | Knowledge Graph Explorer |
| 32 | ~~112~~ | ~~Manual Entity Linking~~ |

### Cluster 6: Versioning — 3 phases
> Context: `components/versioning/`, `lib/`

| # | Phase | Name |
|---|-------|------|
| 33 | 102 | Document Version History |
| 34 | 103 | Version Diff & Comparison |
| 35 | 104 | Version Restore |

### Cluster 7: Realtime — 1 phase
> Context: `components/editor/`, collaborative editing

| # | Phase | Name |
|---|-------|------|
| 36 | 118 | Collaborative Editing |

### Cluster 8: Assembly Floor — 16 phases
> Context: `components/floor/`, work orders, kanban, agents
> Largest cluster — all Floor files stay warm throughout

| # | Phase | Name | Notes |
|---|-------|------|-------|
| 37 | 066 | Kanban Card Display | |
| 38 | 068 | Work Order Assignment | |
| 39 | 070 | Priority & Sequencing | |
| 40 | 071 | Progress Tracking & Rollup | unblocks 079, 128 |
| 41 | 072 | Work Order Search & Filter | |
| 42 | 074 | Agent: WO Extraction | unblocks 075 |
| 43 | 076 | Implementation Plans | |
| 44 | 077 | Bulk Operations | |
| 45 | 078 | Floor Comments | |
| 46 | 080 | MCP Connection Schema | unblocks 129 |
| 47 | 127 | Extraction Strategy Config | was mis-tracked as blocked |
| 48 | 075 | Agent: Phase Planning | needs 074 |
| 49 | 079 | Leader Progress Dashboard | needs 071 |
| 50 | 128 | Sprint/Phase Burndown | needs 071 |
| 51 | 129 | MCP Implementation | needs 080 |
| 52 | 130 | Work Order Sync Alerts | needs 124 (Cluster 4) |

### Cluster 9: Insights Lab — 14 phases
> Context: `components/lab/`, feedback, agents, integrations
> Second-largest cluster — all Lab files stay warm throughout

| # | Phase | Name | Notes |
|---|-------|------|-------|
| 53 | 082 | Feedback Collection API | unblocks 094 |
| 54 | 090 | Insights Lab Agent Infra | unblocks 091, 133 |
| 55 | 086 | Feedback Categorization | unblocks 087, 091 |
| 56 | 087 | Feedback Search & Filter | needs 086 |
| 57 | 088 | Convert Feedback → Work Order | cross-module |
| 58 | 089 | Convert Feedback → Feature | cross-module |
| 59 | 094 | App Key Management | needs 082 |
| 60 | 091 | Agent: Auto-Categorization | needs 086 + 090 |
| 61 | 095 | Feedback Bulk Operations | needs 086 + 088 |
| 62 | 092 | Agent: Feedback Enrichment | needs 090 + 091 |
| 63 | 093 | Agent: Conversion Suggestions | needs 088–091 |
| 64 | 133 | Priority Scoring | needs 090 |
| 65 | 131 | Slack Integration | standalone |
| 66 | 132 | Feedback Analytics | standalone |

### Cluster 10: Comments & Notifications — 3 phases
> Context: `components/comments/`, `components/notifications/`
> Needs 099 from Cluster 2 (Artifacts). Unblocks: 111, 114, 115, 116

| # | Phase | Name |
|---|-------|------|
| 67 | 106 | @Mentions System |
| 68 | 107 | Notification System |
| 69 | 108 | Email Notifications |

### Cluster 11: Knowledge Graph (Part 2) — 1 phase
> Needs 106 from Cluster 10

| # | Phase | Name |
|---|-------|------|
| 70 | 111 | Auto-Connection Detection |

### Cluster 12: Admin — 4 phases
> Context: `components/admin/`, `components/settings/`
> Needs 107 + 108 from Cluster 10

| # | Phase | Name | Notes |
|---|-------|------|-------|
| 71 | 120 | Project Archive & Cleanup | ready now |
| 72 | ~~114~~ | ~~Team Invitation System~~ | done |
| 73 | ~~116~~ | ~~User Profile & Settings~~ | done |
| 74 | ~~115~~ | ~~Seat Management & Billing~~ | done |

### Cluster 13: Advanced Remainders — 3 phases
> Cross-module phases, context varies

| # | Phase | Name | Notes |
|---|-------|------|-------|
| 75 | ~~121~~ | ~~Idea Maturity Scoring~~ | done |
| 76 | 135 | Dark/Light Theme Toggle | ready now |
| 77 | 134 | Global Search | needs all 001–133 |

### Cluster 14: Polish & Deployment — 15 phases
> Sequential, each needs all prior work complete

| # | Phase | Name |
|---|-------|------|
| 78 | 136 | Error Boundaries & Fallback UI |
| 79 | 137 | Loading States & Skeletons |
| 80 | 138 | Form Validation (Zod) |
| 81 | 139 | Responsive Design Audit |
| 82 | 140 | Accessibility Audit |
| 83 | 141 | Performance Optimization |
| 84 | 142 | Database Indexing & Tuning |
| 85 | 143 | Unit Tests: Foundation & Auth |
| 86 | 144 | Unit Tests: All Modules |
| 87 | 145 | E2E Tests: Critical Workflows |
| 88 | 146 | API Documentation |
| 89 | 147 | User Guide & Onboarding |
| 90 | 148 | CI/CD Pipeline |
| 91 | 149 | Security Audit & Hardening |
| 92 | 150 | Production Launch Checklist |

---

## Per-Phase Workflow (Repeatable)

For each phase:
1. Read spec at `Artifacts/Build/Phases/Phase-XXX-*.md`
2. Build directly on `main` (no feature branches)
3. Run `npm run build && npm run lint`
4. Commit with descriptive message
5. Manual testing checkpoint: provide user with testing instructions
6. Push to origin (after user confirms)
7. Update `roadmap.md` (mark done, update ready/blocked)
8. Update `nextsteps.md` (append to phase history)
9. Proceed to next phase

---

## 🎛️ Conductor Session — Persistent Roadmap Manager

Start a **single long-lived conductor session** and return to it between waves. Copy-paste this to kick it off:

```
You are the build conductor for Helix Foundry. Your job is to manage the parallel build roadmap — NOT to write any application code. Set this session's title to "Conductor for Helix Foundry Build".

Read the full file: Input Artifacts/Build/roadmap.md

Then do the following:

1. Run "git log --oneline -30" to see recent commits and merged branches
2. For each phase that has been completed and merged to main:
   a. Update its status from "ready" or "in-progress" to "done" in the Status Table
   b. Remove its branch name if present
3. After updating done phases, recalculate which phases are now "ready":
   - A phase is "ready" if ALL of its prerequisites show "done" in the Status Table
   - Update those phases from "blocked" to "ready"
4. Update the "⮕ START HERE: Recommended Next Actions" section:
   - Pick the next wave of phases to recommend (up to 4 primary + bonus sessions)
   - Prioritize: one phase per track, favor phases that unblock the most downstream work
   - Include merge order guidance (schema phases that touch types/database.ts need sequential merging)
   - Update the wave number (Wave 2, Wave 3, etc.)
5. Update the "Progress Summary" table at the bottom with new counts
6. Update the "Last updated" date at the top
7. Show me a summary of what changed:
   - Which phases were marked done
   - Which phases became ready
   - What the new recommended wave is

After this initial update, stay in this session. I will come back to you after each wave of merges and say "update the roadmap" — repeat steps 1-7 each time. If I ask "what's the status?", give me a quick summary of: phases done, phases in progress, phases ready, and the current recommended wave.
```

**When to run it**: Once to start, then return to the same session after each wave of merges. Say "update the roadmap" and it handles everything.

---

## How This System Works

1. **Before starting a session**: Check the Status Table below. Find a phase marked `ready` (all prerequisites complete, not in progress). Update it to `in-progress` and note your branch name.
2. **Create a branch**: `git checkout -b phase-XXX` from latest `main`.
3. **Start the session**: Copy the phase prompt from the [Prompt Generator](#prompt-generator) section.
4. **When done**: Merge branch to `main`, update the phase status to `done` here.
5. **Merge order matters**: When multiple schema phases finish, merge one at a time and resolve any `types/database.ts` conflicts.

### Rules for Parallel Safety
- **Never run two phases from the same module simultaneously** unless explicitly marked safe.
- **Schema phases** (026, 046, 061, 081, 096, 105, 109) all touch `types/database.ts` — merge them one at a time.
- **Hall phases** (017-025) all touch `components/hall/` — run sequentially within the Hall track.
- **Cross-module phases** (marked with ⚠️) depend on multiple module tracks being done first.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `done` | Completed and merged to main |
| `in-progress` | Actively being built in a session (note branch name) |
| `ready` | All prerequisites are `done` — can be pulled into a new session |
| `blocked` | Has unfinished prerequisites — cannot start yet |

---

## Phase Status Table

### Section 1: Foundation (001–010) ✅ ALL COMPLETE

| Phase | Name | Status | Branch | Prerequisites |
|-------|------|--------|--------|---------------|
| 001 | Next.js Project Setup | `done` | — | — |
| 002 | Supabase Database Schema | `done` | — | 001 |
| 003 | Supabase Auth | `done` | — | 001, 002 |
| 004 | Auth Middleware | `done` | — | 003 |
| 005 | Multi-Tenancy | `done` | — | 003, 004 |
| 006 | Core UI Shell | `done` | — | 005 |
| 007 | UI Components Library | `done` | — | 006 |
| 008 | Registration & Onboarding | `done` | — | 005, 007 |
| 009 | Roles & Permissions | `done` | — | 005 |
| 010 | Navigation & Module Switching | `done` | — | 006, 009 |

### Section 2: The Hall MVP (011–025)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 011 | Hall Database Schema | `done` | — | 002 | Hall | `supabase/migrations/`, `types/database.ts` |
| 012 | Hall Page Layout & UI | `done` | — | 011 | Hall | `components/hall/`, `app/.../hall/` |
| 013 | Create Idea / Note Capture | `done` | — | 011, 012 | Hall | `components/hall/`, `app/api/hall/` |
| 014 | Idea List View | `done` | — | 012, 013 | Hall | `components/hall/`, `app/api/hall/` |
| 015 | Hall Search & Filter | `done` | — | 014 | Hall | `components/hall/`, `app/api/hall/` |
| 016 | Idea Detail View | `done` | — | 014 | Hall | `components/hall/`, `app/api/hall/ideas/[ideaId]/` |
| 017 | Edit & Delete Ideas | `done` | — | 011, 016 | Hall | `components/hall/`, `app/api/hall/ideas/[ideaId]/` |
| 018 | Tagging & Tag Management | `done` | — | 011, 013, 014 | Hall | `components/hall/`, `app/api/hall/tags/` |
| 019 | Bulk Operations | `done` | — | 014, 017, 018 | Hall | `components/hall/` |
| 020 | Hall Agent Infrastructure | `done` | — | 002, 011, 012 | Hall | `components/hall/`, `app/api/hall/agent/` |
| 021 | Agent: Auto-Tag Suggestions | `done` | — | 013, 018, 020 | Hall | `components/hall/` |
| 022 | Agent: Duplicate Detection | `done` | — | 011, 013, 020 | Hall | `components/hall/` |
| 023 | Agent: Connection Discovery | `done` | — | 011, 016, 020 | Hall | `components/hall/` |
| 024 | Hall Real-Time Updates | `done` | — | 002, 011, 012, 014 | Hall | `components/hall/`, `lib/realtime/` |
| 025 | Hall → Shop Promotion | `done` | — | 011, 016, 026 | Hall ⚠️ | `components/hall/`, `app/api/hall/` |

### Section 3: The Pattern Shop MVP (026–045)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 026 | Pattern Shop Database Schema | `done` | — | 001, 002 | Shop | `supabase/migrations/`, `types/database.ts` |
| 027 | Pattern Shop Page Layout | `done` | — | 006, 010, 026 | Shop | `components/shop/`, `app/.../shop/` |
| 028 | Product Overview Document | `done` | — | 026, 027 | Shop | `components/shop/` |
| 029 | Feature Tree Component | `done` | — | 026, 027 | Shop | `components/shop/` |
| 030 | Add Nodes to Feature Tree | `done` | — | 026, 029 | Shop | `components/shop/` |
| 031 | Edit & Delete Tree Nodes | `done` | — | 026, 029, 030 | Shop | `components/shop/` |
| 032 | Feature Tree Drag-and-Drop | `done` | — | 026, 029, 030, 031 | Shop | `components/shop/` |
| 033 | Feature Requirements Document | `done` | — | 026, 027, 029 | Shop | `components/shop/` |
| 034 | Requirements Document Editor | `done` | — | 027, 028, 033 | Shop | `components/shop/` |
| 035 | Feature Tree Status Tracking | `done` | — | 026, 029, 030, 031 | Shop | `components/shop/` |
| 036 | Feature Tree Search & Filter | `done` | — | 027, 029, 035 | Shop | `components/shop/` |
| 037 | Pattern Shop Agent Infra | `done` | — | 002, 026, 027, 029 | Shop | `components/shop/`, `app/api/shop/agent/` |
| 038 | Agent: Feature Tree Generation | `done` | — | 026, 029, 030, 037 | Shop | `components/shop/` |
| 039 | Agent: Requirements Review | `done` | — | 033, 034, 037 | Shop | `components/shop/` |
| 040 | Agent: Gap Detection | `done` | — | 028, 029, 037 | Shop | `components/shop/` |
| 041 | Feature Tree Statistics | `done` | — | 027, 029, 035 | Shop | `components/shop/` |
| 042 | Requirements Import/Export | `done` | — | 029, 033, 034 | Shop | `components/shop/` |
| 043 | Document Versioning | `done` | — | 026, 028, 033, 034 | Shop | `components/shop/` |
| 044 | Pattern Shop Comments | `done` | — | 033, 034, 039, 043 | Shop | `components/shop/` |
| 045 | Technical Requirements | `done` | — | 026, 027, 029, 034 | Shop | `components/shop/` |

### Section 4: The Control Room MVP (046–060)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 046 | Control Room Database Schema | `done` | — | 002, 026 | Room | `supabase/migrations/`, `types/database.ts` |
| 047 | Control Room Page Layout | `done` | — | 006, 010, 046 | Room | `components/room/`, `app/.../room/` |
| 048 | Foundation Blueprints | `done` | — | 046, 047, 049 | Room | `components/room/` |
| 049 | Blueprint Rich Text Editor | `done` | — | 047 | Room | `components/room/` |
| 050 | System Diagram Blueprints | `done` | — | 046, 047, 049 | Room | `components/room/` |
| 051 | Feature Blueprints | `done` | — | 026, 046, 047, 049 | Room | `components/room/` |
| 052 | Feature-Blueprint Linking | `done` | — | 026, 029, 046, 051 | Room ⚠️ | `components/room/`, `components/shop/` |
| 053 | Blueprint Templates | `done` | — | 046, 048, 050, 051 | Room | `components/room/` |
| 054 | Blueprint Status Tracking | `done` | — | 046, 047, 048, 050, 051 | Room | `components/room/` |
| 055 | Blueprint Search & Filter | `done` | — | 046, 047, 054 | Room | `components/room/` |
| 056 | Control Room Agent Infra | `done` | — | 002, 046, 047, 051 | Room | `components/room/`, `app/api/room/agent/` |
| 057 | Agent: Blueprint Generation | `done` | — | 048, 051, 056 | Room | `components/room/` |
| 058 | Agent: Blueprint Review | `done` | — | 048, 051, 054, 056 | Room | `components/room/` |
| 059 | Blueprint Version History | `done` | — | 046, 049, 054 | Room | `components/room/` |
| 060 | Blueprint Comments | `done` | — | 046, 049, 054, 059 | Room | `components/room/` |

### Section 5: The Assembly Floor MVP (061–080)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 061 | Assembly Floor Database Schema | `done` | — | 002 | Floor | `supabase/migrations/`, `types/database.ts` |
| 062 | Assembly Floor Page Layout | `done` | — | 006, 010, 061 | Floor | `components/floor/`, `app/.../floor/` |
| 063 | Create Work Order (Manual) | `done` | — | 010, 061, 062 | Floor | `components/floor/`, `app/api/floor/` |
| 064 | Work Order Detail View | `done` | — | 061, 062, 063 | Floor | `components/floor/` |
| 065 | Kanban Board View | `done` | — | 061, 062, 063, 064 | Floor | `components/floor/` |
| 066 | Kanban Card Display | `done` | — | 062, 065 | Floor | `components/floor/` |
| 067 | Work Order List/Table View | `done` | — | 061, 062, 064 | Floor | `components/floor/` |
| 068 | Work Order Assignment | `done` | — | 010, 061, 064, 065, 067 | Floor | `components/floor/` |
| 069 | Work Order Phases | `done` | — | 061, 062, 065 | Floor | `components/floor/` |
| 070 | Priority & Sequencing | `done` | — | 061, 065, 067, 069 | Floor | `components/floor/` |
| 071 | Progress Tracking & Rollup | `done` | — | 026, 061, 069 | Floor | `components/floor/` |
| 072 | Work Order Search & Filter | `done` | — | 061, 062, 067, 069 | Floor | `components/floor/` |
| 073 | Assembly Floor Agent Infra | `done` | — | 002, 061, 062 | Floor | `components/floor/`, `app/api/floor/agent/` |
| 074 | Agent: WO Extraction | `done` | — | 046, 061, 073 | Floor | `components/floor/` |
| 075 | Agent: Phase Planning | `done` | — | 061, 069, 073, 074 | Floor | `components/floor/` |
| 076 | Implementation Plans | `done` | — | 061, 064, 073 | Floor | `components/floor/` |
| 077 | Bulk Operations | `done` | — | 061, 065, 067 | Floor | `components/floor/` |
| 078 | Floor Comments | `done` | — | 010, 061, 064 | Floor | `components/floor/` |
| 079 | Leader Progress Dashboard | `done` | — | 009, 061, 069, 071 | Floor | `components/dashboard/` |
| 080 | MCP Connection Schema | `done` | — | 010, 061 | Floor | `supabase/migrations/`, `lib/mcp/`, `app/api/v1/` |

### Section 6: The Insights Lab MVP (081–095)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 081 | Insights Lab Database Schema | `done` | — | 002 | Lab | `supabase/migrations/`, `types/database.ts` |
| 082 | Feedback Collection API | `done` | — | 001, 081 | Lab | `app/api/insights/feedback/` |
| 083 | Insights Lab Page Layout | `done` | — | 006, 010, 081 | Lab | `components/lab/`, `app/.../lab/` |
| 084 | Feedback Inbox Display | `done` | — | 081, 083 | Lab | `components/lab/` |
| 085 | Feedback Detail View | `done` | — | 081, 083, 084 | Lab | `components/lab/` |
| 086 | Feedback Categorization | `done` | — | 081, 084, 085 | Lab | `components/lab/` |
| 087 | Feedback Search & Filter | `done` | — | 083, 084, 086 | Lab | `components/lab/` |
| 088 | Convert Feedback → Work Order | `done` | — | 061, 081, 085 | Lab ⚠️ | `components/lab/`, `app/api/projects/` |
| 089 | Convert Feedback → Feature | `done` | — | 026, 081, 085 | Lab ⚠️ | `components/lab/`, `app/api/lab/` |
| 090 | Insights Lab Agent Infra | `done` | — | 081, 083 | Lab | `components/lab/`, `app/api/lab/agent/` |
| 091 | Agent: Auto-Categorization | `done` | — | 081, 086, 090 | Lab | `components/lab/` |
| 092 | Agent: Feedback Enrichment | `done` | — | 026, 085, 090, 091 | Lab ⚠️ | `components/lab/` |
| 093 | Agent: Conversion Suggestions | `done` | — | 088, 089, 090, 091 | Lab ⚠️ | `components/lab/` |
| 094 | App Key Management | `done` | — | 006, 081, 082 | Lab | `components/lab/`, `app/api/lab/` |
| 095 | Feedback Bulk Operations | `done` | — | 084, 086, 088 | Lab | `components/lab/` |

### Section 7: Cross-Cutting Enhancements (096–120)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 096 | Artifacts Database & Storage | `done` | — | 002 | Artifacts | `supabase/migrations/`, `types/database.ts` |
| 097 | Artifact Upload UI | `done` | — | 096 | Artifacts | `components/artifacts/` |
| 098 | Artifact Browser & Management | `done` | — | 096, 097 | Artifacts | `components/artifacts/` |
| 099 | Artifact Linking to Entities | `done` | — | 096, 097 | Artifacts | `components/artifacts/` |
| 100 | Artifact Search & Indexing | `done` | — | 096, 097 | Artifacts | `components/artifacts/` |
| 101 | Artifact Folders & Organization | `done` | — | 096, 098 | Artifacts | `components/artifacts/` |
| 102 | Document Version History | `done` | — | 002, 034, 049 | Versioning ⚠️ | `components/versioning/`, `lib/` |
| 103 | Version Diff & Comparison | `done` | — | 102 | Versioning | `components/versioning/` |
| 104 | Version Restore | `done` | — | 102, 103 | Versioning | `components/versioning/` |
| 105 | Comments System Foundation | `done` | — | 002 | Comments | `supabase/migrations/`, `components/comments/` |
| 106 | @Mentions System | `done` | — | 099, 105 | Comments ⚠️ | `components/mentions/` |
| 107 | Notification System | `done` | — | 105, 106 | Notifications | `components/notifications/`, `app/api/notifications/` |
| 108 | Email Notifications | `done` | — | 107 | Notifications | `lib/email/`, `app/api/notifications/` |
| 109 | Knowledge Graph Schema | `done` | — | 002 | Knowledge | `supabase/migrations/`, `types/database.ts` |
| 110 | Knowledge Graph Explorer | `done` | — | 002, 109 | Knowledge | `components/knowledge-graph/` |
| 111 | Auto-Connection Detection | `done` | — | 106, 109, 110 | Knowledge | `components/knowledge-graph/`, `lib/knowledge-graph/` |
| 112 | Manual Entity Linking | `done` | — | 109, 110 | Knowledge | `components/knowledge/` |
| 113 | Organization Console | `done` | — | 005, 009 | Admin | `components/admin/`, `app/.../admin/` |
| 114 | Team Invitation System | `done` | — | 108, 113 | Admin ⚠️ | `components/admin/` |
| 115 | Seat Management & Billing | `done` | — | 005, 113, 114 | Admin | `components/admin/` |
| 116 | User Profile & Settings | `done` | — | 004, 107 | Admin | `components/settings/`, `app/.../settings/` |
| 117 | Real-Time Presence | `done` | — | 002 | Realtime | `lib/realtime/`, `components/layout/` |
| 118 | Collaborative Editing | `done` | — | 034, 049, 117 | Realtime ⚠️ | `components/editor/` |
| 119 | Audit Trail & Activity Log | `done` | — | 002 | Admin | `supabase/migrations/`, `components/admin/` |
| 120 | Project Archive & Cleanup | `done` | — | 002, 005, 113 | Admin | `components/admin/` |

### Section 8: Advanced Features (121–135)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 121 | Idea Maturity Scoring | `done` | — | 011, 023 | Hall ⚠️ | `components/hall/` |
| 122 | Agent Writing Instructions | `done` | — | 037, 113 | Shop ⚠️ | `components/settings/`, `app/api/projects/*/settings/` |
| 123 | Aggregate Export | `done` | — | 037, 042 | Shop | `components/shop/`, `lib/shop/export-utils.ts` |
| 124 | Drift Detection | `done` | — | 026, 037, 046 | Room ⚠️ | `components/room/` |
| 125 | Cross-Document Suggestions | `done` | — | 037, 046, 057, 124 | Room ⚠️ | `components/room/` |
| 126 | Org-Level Blueprint Templates | `done` | — | 053, 113 | Room | `components/room/`, `components/admin/` |
| 127 | Extraction Strategy Config | `done` | — | 073, 113 | Floor ⚠️ | `components/floor/`, `components/admin/` |
| 128 | Sprint/Phase Burndown | `done` | — | 061, 071 | Floor | `components/floor/` |
| 129 | MCP Implementation | `done` | — | 080 | Floor | `lib/mcp/`, `app/api/v1/` |
| 130 | Work Order Sync Alerts | `done` | — | 046, 061, 124 | Floor ⚠️ | `components/floor/` |
| 131 | Slack Integration | `done` | — | 081 | Lab | `lib/slack/`, `app/api/projects/` |
| 132 | Feedback Analytics | `done` | — | 081 | Lab | `components/lab/` |
| 133 | Priority Scoring | `done` | — | 081, 090 | Lab | `components/lab/` |
| 134 | Global Search | `done` | — | all 001–133 | Cross ⚠️ | `components/search/`, `app/api/search/` |
| 135 | Dark/Light Theme Toggle | `done` | — | 001, 116 | Cross | `app/globals.css`, `lib/theme/` |

### Section 9: Polish & Deployment (136–150)

| Phase | Name | Status | Branch | Prerequisites | Track | File Areas |
|-------|------|--------|--------|---------------|-------|------------|
| 136 | Error Boundaries & Fallback UI | `ready` | — | all 001–135 | Quality | `components/error/`, `app/` |
| 137 | Loading States & Skeletons | `blocked` | — | all prior | Quality | `components/`, `app/` |
| 138 | Form Validation (Zod) | `blocked` | — | all forms | Quality | `lib/schemas/`, `components/` |
| 139 | Responsive Design Audit | `blocked` | — | all 001–138 | Quality | all component dirs |
| 140 | Accessibility Audit | `blocked` | — | all 001–139 | Quality | all component dirs |
| 141 | Performance Optimization | `blocked` | — | all 001–140 | Perf | `next.config.ts`, `components/` |
| 142 | Database Indexing & Tuning | `blocked` | — | all DB tables | Perf | `supabase/migrations/` |
| 143 | Unit Tests: Foundation & Auth | `blocked` | — | 004, 005, 009 | Testing | `__tests__/`, `jest.config.*` |
| 144 | Unit Tests: All Modules | `blocked` | — | 143 | Testing | `__tests__/` |
| 145 | E2E Tests: Critical Workflows | `blocked` | — | all 001–144 | Testing | `e2e/`, `playwright.config.*` |
| 146 | API Documentation | `blocked` | — | all API routes | Docs | `app/api/docs/` |
| 147 | User Guide & Onboarding | `blocked` | — | all modules | Docs | `app/help/`, `components/onboarding/` |
| 148 | CI/CD Pipeline | `blocked` | — | GitHub repo | DevOps | `.github/workflows/`, `vercel.json` |
| 149 | Security Audit & Hardening | `blocked` | — | all 001–148 | Security | `lib/`, `app/api/` |
| 150 | Production Launch Checklist | `blocked` | — | all 001–149 | Launch | project root |

---

## Parallel Tracks & Dependency Graph

### Independent Module Tracks

These tracks can run **in parallel** with each other because they touch different directories and database tables. The only shared file risk is `types/database.ts` for schema phases — merge those one at a time.

```
TRACK: HALL (components/hall/, app/api/hall/)
017 → 018 → 019
         ↘ 020 → 021, 022, 023
024 (semi-independent, after 014)
025 (needs 026 from Shop track) ⚠️

TRACK: PATTERN SHOP (components/shop/, app/api/shop/)
026 → 027 → [028, 029] → [030, 033] → [031, 034] → [032, 035] → [036, 037, 041]
                                                              → [038, 039, 040, 042, 043, 045] → 044

TRACK: CONTROL ROOM (components/room/, app/api/room/)
046* → 047 → 049 → [048, 050] → 051* → [052*, 053, 054] → [055, 056] → [057, 058, 059] → 060
* 046 needs 026 (feature_nodes FK)
* 051, 052 need Shop feature tree

TRACK: ASSEMBLY FLOOR (components/floor/, app/api/floor/)
061 → 062 → 063 → [064, 067] → [065, 066] → [068, 069, 070] → [071*, 072, 073] → [074*, 076, 077, 078] → [075, 079] → 080
* 071 needs 026 (feature rollup)
* 074 needs 046 (blueprint reading)

TRACK: INSIGHTS LAB (components/lab/, app/api/lab/)
081 → [082, 083] → 084 → [085, 090] → [086, 094] → [087, 088*, 089*] → [091, 095] → [092*, 093*]
* 088 needs 061 (work orders)
* 089 needs 026 (features)
* 092, 093 need multiple module tracks

TRACK: ARTIFACTS (components/artifacts/)
096 → 097 → [098, 099, 100] → 101

TRACK: COMMENTS & NOTIFICATIONS (components/comments/, components/notifications/)
105 → 106* → 107 → 108
* 106 needs 099 (artifact linking)

TRACK: KNOWLEDGE GRAPH (components/knowledge/)
109 → 110 → [111*, 112]
* 111 needs 106 (@mentions)

TRACK: ADMIN (components/admin/)
113 → [114*, 120]
* 114 needs 108 (email notifications)
115 needs 113, 114

TRACK: REALTIME
117 → 118* (needs 034, 049)
```

---

## Suggested Build Waves

These waves show the **recommended parallel grouping** of phases. Run all phases in a wave simultaneously, then merge all branches to main before starting the next wave.

### Wave 1 — Module Schemas + Hall Continuation (4 parallel sessions)

| Session | Phase | Track | Notes |
|---------|-------|-------|-------|
| A | **017** Edit & Delete Ideas | Hall | Continues Hall MVP |
| B | **026** Pattern Shop Schema | Shop | New module schema |
| C | **061** Assembly Floor Schema | Floor | New module schema |
| D | **081** Insights Lab Schema | Lab | New module schema |

**Merge order**: A first (no schema conflicts), then B, C, D one at a time (all touch `types/database.ts`).

### Wave 2 — Module Layouts + Hall Continuation (4 parallel sessions)

| Session | Phase | Track | Notes |
|---------|-------|-------|-------|
| A | **018** Tagging System | Hall | |
| B | **027** Pattern Shop Layout | Shop | Needs 026✓ |
| C | **062** Assembly Floor Layout | Floor | Needs 061✓ |
| D | **083** Insights Lab Layout | Lab | Needs 081✓ |

**Also available** (run if you have extra sessions): 020 (Hall Agent Infra), 082 (Feedback API), 096 (Artifacts Schema), 105 (Comments System), 109 (Knowledge Graph Schema), 113 (Org Console), 117 (Realtime Presence), 119 (Audit Trail).

### Wave 3 — Core Features per Module (4+ parallel sessions)

| Session | Phase | Track | Notes |
|---------|-------|-------|-------|
| A | **020** Hall Agent Infrastructure | Hall | |
| B | **028** + **029** Product Overview + Feature Tree | Shop | Can combine in one session |
| C | **063** Create Work Order | Floor | |
| D | **084** Feedback Inbox | Lab | Needs 083✓ |

**Also available**: 024 (Hall Realtime), 046 (Control Room Schema, needs 026✓), 097 (Artifact Upload, needs 096✓).

### Wave 4+ — Deep Module Work

Continue the pattern: advance each track's next available phases. As module tracks mature, cross-module phases (⚠️) become unblocked. Prioritize the critical path for your most-needed features.

---

## How to Find the Next Phase to Pull

**Quickest way**: Check the [⮕ START HERE](#⮕-start-here-recommended-next-actions) section at the top. It lists the recommended next phases in priority order.

**Manual method** (when recommendations are exhausted):
1. Look at the Status Table — find phases marked `ready`
2. Verify none of the `ready` phases share the same **Track** as a phase already `in-progress`
3. Pick the lowest-numbered `ready` phase (or the one most aligned with your priorities)
4. Update its status to `in-progress` and note your branch name

### Quick "What's Ready?" Checklist

For any phase:
- [ ] All prerequisites show `done` in the Status Table?
- [ ] No other phase from the same Track is `in-progress`?
- [ ] If it's a schema phase, no other schema phase is currently being merged?

If all three: **it's ready to pull.**

---

## Phase Session Instructions

> **This section is read by Claude Code sessions.** When a session is told to "follow the instructions in roadmap.md", it reads this section.

### Step 1: Confirm the Phase

- Verify the phase you are about to build shows `ready` in the Status Table above.
- If it shows `blocked` or `in-progress`, **stop** and tell the user. Pick the next `ready` phase from the "Recommended Next Actions" section instead.

### Step 2: Read the Phase Spec

- Read the file: `Artifacts/Build/Phases/Phase-XXX-*.md` (where XXX is the phase number).
- This is your primary build specification.

### Step 3: Read Existing Code Context

- Look at the phase spec's **Prerequisites** section. For each prerequisite phase, read the key files it produced (use the **File Areas** column in the Status Table to find them).
- At minimum, read:
  - `types/database.ts` — current database types
  - `lib/supabase/server.ts` — server client patterns
  - `lib/auth/server.ts` — auth patterns (requireAuth, requireAuthWithProfile)
  - `lib/utils.ts` — utility functions (cn, timeAgo)
  - `app/globals.css` — brand colors and theme variables
  - Any components in the same module directory that the phase builds on

### Step 4: Key Conventions (must follow)

- **Framework**: Next.js 16.1.6 with App Router, Turbopack, React 19, TypeScript strict mode
- **Styling**: Tailwind CSS v4 with CSS-first config via `@theme` in `globals.css` (NOT `tailwind.config.ts`)
- **Brand colors**: bg-primary `#0f1117`, bg-secondary `#1a1d27`, bg-tertiary `#252830`, text-primary `#e4e7ec`, text-secondary `#8b8fa3`, text-tertiary `#5a5f73`, accent-cyan `#00d4ff`, accent-purple `#8b5cf6`
- **Auth/DB**: Supabase for auth + PostgreSQL with RLS; service role client (`createServiceClient()`) bypasses RLS for API routes
- **API patterns**: Use `requireAuth()` from `lib/auth/server.ts` and `createServiceClient()` from `lib/supabase/server.ts`
- **Utility**: `cn()` helper in `lib/utils.ts` combines clsx + tailwind-merge
- **UI**: Glass panel styling via `glass-panel` CSS class. Toast system: `useToast()` → `addToast(message, type)`. Button supports `isLoading` prop, 5 variants, 3 sizes.
- **ESLint rules**: Don't use `module` as a variable name. Don't call `setState` directly inside `useEffect` — use async pattern.
- **Layout**: `AppLayout` is already wired into the project layout — don't re-wrap module pages with it.
- **RLS**: For tenant isolation only — business logic in Next.js API routes.

### Step 5: Git Branching

- Create a feature branch from latest main:
  ```
  git checkout main && git pull && git checkout -b phase-XXX
  ```
- All work goes on this branch. Do NOT commit directly to main.

### Step 6: Build the Phase

- Follow the phase spec's requirements exactly.
- Run `npm run build` and `npm run lint` after building — verify zero errors.

### Step 7: Wrap Up

When the phase is built and passing lint/build, present the user with:

1. **What's new** — summary of what was built
2. **What to test** — list of things to verify, with full clickable URLs (e.g., `http://localhost:3000/org/my-org/project/abc123/hall`)
3. **Ask for changes** — "Want any modifications before we finalize?"
4. **Commit** — "Ready to create a commit message with bullet points and push to GitHub?"
5. **Next phase** — "After merging this branch to main, update the roadmap.md Status Table: mark this phase as `done`, then check the Recommended Next Actions section for what to start next."

---

## Cross-Module Dependency Map

These phases require work from **multiple module tracks** to be complete before they can start. They are natural "convergence points" in the build.

| Phase | Depends On Tracks | Why |
|-------|-------------------|-----|
| 025 | Hall + Shop | Promotes ideas to Pattern Shop seeds |
| 046 | Foundation + Shop(026) | Control Room schema FKs to feature_nodes |
| 051 | Shop + Room | Feature blueprints link to feature tree |
| 052 | Shop + Room | Feature-blueprint bidirectional linking |
| 071 | Shop + Floor | Progress rolls up to feature tree |
| 074 | Room + Floor | Agent reads blueprints to create work orders |
| 088 | Floor + Lab | Converts feedback to work orders |
| 089 | Shop + Lab | Converts feedback to features |
| 092 | Shop + Lab | Agent links feedback to features |
| 093 | Floor + Lab + Shop | Agent suggests conversions across modules |
| 102 | Shop(034) + Room(049) | Version history needs editors from both |
| 106 | Artifacts + Comments | @Mentions needs artifact linking |
| 111 | Knowledge + Comments | Auto-connections needs @mentions |
| 114 | Admin + Notifications | Invitations need email system |
| 118 | Shop(034) + Room(049) + Realtime | Collaborative editing needs editors + presence |
| 122 | Shop + Admin | Agent writing instructions in project settings |
| 124 | Shop + Room | Drift detection compares blueprints to requirements |
| 130 | Room + Floor | Sync alerts when blueprints change |

---

## Progress Summary

| Section | Total | Done | In Progress | Ready | Blocked |
|---------|-------|------|-------------|-------|---------|
| Foundation (001–010) | 10 | 10 | 0 | 0 | 0 |
| The Hall (011–025) | 15 | 15 | 0 | 0 | 0 |
| Pattern Shop (026–045) | 20 | 20 | 0 | 0 | 0 |
| Control Room (046–060) | 15 | 15 | 0 | 0 | 0 |
| Assembly Floor (061–080) | 20 | 20 | 0 | 0 | 0 |
| Insights Lab (081–095) | 15 | 15 | 0 | 0 | 0 |
| Cross-Cutting (096–120) | 25 | 25 | 0 | 0 | 0 |
| Advanced (121–135) | 15 | 15 | 0 | 0 | 0 |
| Polish (136–150) | 15 | 0 | 0 | 1 | 14 |
| **TOTAL** | **150** | **134** | **0** | **1** | **15** |

**Currently ready to start**: 136

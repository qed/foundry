# Foundry v2 — Sequential Build Roadmap

> **Single source of truth** for sequential phase execution.
> **Location**: `Artifacts/BuildPlanv2/roadmap.md` (kept in sync via alignment.md).
> Last updated: 2026-02-28

---

## START HERE: Next Phase

**Mode**: Sequential execution on the `main` branch. All v2 commits use the `v2 - ` prefix.

**Strategy**: Phases are built sequentially within each Epic. Cross-epic dependencies are noted in the Phase Status Tables.

**Per-phase workflow**: Pull dev -> Read spec -> Build -> Lint pass -> Commit to dev -> Push -> Run alignment.md -> Next phase.

**Currently ready to start**: Phase 001

---

### Progress Summary

| Epic | Name | Phases | Done | In Progress | Ready | Blocked |
|------|------|--------|------|-------------|-------|---------|
| 1 | Foundation & Mode Infrastructure | 001–008 (8) | 0 | 0 | 1 | 7 |
| 2 | Planning Stage | 009–014 (6) | 0 | 0 | 0 | 6 |
| 3 | Documentation Stage | 015–021 (7) | 0 | 0 | 0 | 7 |
| 4 | Build Planning & Repo Setup | 022–032 (11) | 0 | 0 | 0 | 11 |
| 5 | Build, Testing & Deployment | 033–044 (12) | 0 | 0 | 0 | 12 |
| 6 | MVP Polish & Cross-Cutting | 045–052 (8) | 0 | 0 | 0 | 8 |
| 7 | In-App Brainstorming | 053–062 (10) | 0 | 0 | 0 | 10 |
| 8 | In-App Build Planning | 063–074 (12) | 0 | 0 | 0 | 12 |
| 9 | Documentation Intelligence | 075–083 (9) | 0 | 0 | 0 | 9 |
| 10 | Repo Setup Automation | 084–091 (8) | 0 | 0 | 0 | 8 |
| 11 | Build Phase Management | 092–101 (10) | 0 | 0 | 0 | 10 |
| 12 | Testing Intelligence | 102–108 (7) | 0 | 0 | 0 | 7 |
| 13 | Deployment Pipeline | 109–114 (6) | 0 | 0 | 0 | 6 |
| 14 | Deep V1 Module Data Sync | 115–124 (10) | 0 | 0 | 0 | 10 |
| 15 | Knowledge Graph Integration | 125–129 (5) | 0 | 0 | 0 | 5 |
| 16 | Real-Time Collaboration | 130–135 (6) | 0 | 0 | 0 | 6 |
| 17 | Process Analytics & Reporting | 136–141 (6) | 0 | 0 | 0 | 6 |
| 18 | MCP & External Agent Integration | 142–148 (7) | 0 | 0 | 0 | 7 |
| 19 | Process Customization & Advanced | 149–157 (9) | 0 | 0 | 0 | 9 |
| **TOTAL** | | **157** | **0** | **0** | **1** | **156** |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `done` | Completed, tested, and committed to main |
| `in-progress` | Actively being built in a session |
| `ready` | All prerequisites are `done` — can start |
| `blocked` | Has unfinished prerequisites — cannot start yet |

---

## Phase Status Tables

### Epic 1: Foundation & Mode Infrastructure (001–008)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 001 | Helix Mode Database Migration | `ready` | — |
| 002 | Mode Context Provider & Toggle | `blocked` | 001 |
| 003 | Helix Route Structure | `blocked` | 002 |
| 004 | Helix Sidebar & Navigation Shell | `blocked` | 003 |
| 005 | Stage & Step Data Model | `blocked` | 004 |
| 006 | Helix Dashboard Landing Page | `blocked` | 005 |
| 007 | Hard-Block Gate Check Engine | `blocked` | 005 |
| 008 | Mode Toggle UX & Open Mode Bridge | `blocked` | 006, 007 |

### Epic 2: Planning Stage — Steps 1.1–1.3 (009–014)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 009 | Step Detail View Component | `blocked` | 008 |
| 010 | Step 1.1 — Define Project Idea | `blocked` | 009 |
| 011 | Step 1.2 — Brainstorming Prompt (Manual) | `blocked` | 010 |
| 012 | Step 1.3 — Save Project Brief | `blocked` | 011 |
| 013 | Evidence Viewer Component | `blocked` | 009 |
| 014 | Step Navigation & Progress Tracking | `blocked` | 013 |

### Epic 3: Documentation Stage — Steps 2.1–2.4 (015–021)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 015 | Step 2.1 — Identify Documentation | `blocked` | 012, 014 |
| 016 | Step 2.2 — Capture Undocumented Knowledge | `blocked` | 015 |
| 017 | Step 2.3 — Gather Docs Into Folder | `blocked` | 016 |
| 018 | Step 2.4 — Verify Documentation Complete | `blocked` | 017 |
| 019 | Artifact Storage Integration | `blocked` | 017, v1 Artifacts module |
| 020 | Step Output Summary Cards | `blocked` | 019 |
| 021 | Documentation Stage Gate Check | `blocked` | 018, 020 |

### Epic 4: Build Planning & Repo Setup — Steps 3.1–4.4 (022–032)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 022 | Step 3.1 — Building Brief Summary Prompt (Manual) | `blocked` | 021 |
| 023 | Step 3.2 — Save Build Plan Output | `blocked` | 022 |
| 024 | Build Plan Viewer | `blocked` | 023 |
| 025 | Step 3.3 — Review Build Plan Quality | `blocked` | 024 |
| 026 | Build Planning Stage Gate Check | `blocked` | 025 |
| 027 | Step 4.1 — Copy Repo Template | `blocked` | 026 |
| 028 | Step 4.2 — Find-and-Replace Placeholders | `blocked` | 027 |
| 029 | Step 4.3 — Populate BuildPlan Folder | `blocked` | 028 |
| 030 | Step 4.4 — Initialize Git Repo | `blocked` | 029 |
| 031 | Repo Setup Stage Gate Check | `blocked` | 030 |
| 032 | Step 5.1 — Pre-Build Review Checkpoint | `blocked` | 031 |

### Epic 5: Build, Testing & Deployment — Steps 6.1–8.3 (033–044)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 033 | Build Stage Overview & Phase Tracker | `blocked` | 032 |
| 034 | Individual Build Phase Card | `blocked` | 033 |
| 035 | Build Phase Completion Flow | `blocked` | 034 |
| 036 | Build Progress Dashboard | `blocked` | 035 |
| 037 | Step 7.1 — Per-Phase Testing Tracker | `blocked` | 036 |
| 038 | Step 7.2 — Integration Test Tracking | `blocked` | 037 |
| 039 | Testing Stage Gate Check | `blocked` | 038 |
| 040 | Step 8.1 — Prepare for Deployment | `blocked` | 039 |
| 041 | Step 8.2 — Deploy to Production | `blocked` | 040 |
| 042 | Step 8.3 — Post-Deploy Verification | `blocked` | 041 |
| 043 | Deployment Stage Gate Check | `blocked` | 042 |
| 044 | Process Complete State & Summary | `blocked` | 043 |

### Epic 6: MVP Polish & Cross-Cutting (045–052)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 045 | Helix Process Timeline View | `blocked` | 044 |
| 046 | Step Evidence Export | `blocked` | 045 |
| 047 | Process Summary Export | `blocked` | 046 |
| 048 | Error Handling & Edge Cases | `blocked` | 044 |
| 049 | Loading States & Skeleton Screens | `blocked` | 044 |
| 050 | Mobile Responsive Helix Mode | `blocked` | 049 |
| 051 | Helix Mode Permissions | `blocked` | 044 |
| 052 | Unit Tests for Helix MVP | `blocked` | 048, 050, 051 |

### Epic 7: In-App Brainstorming — Step 1.2 Automation (053–062)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 053 | Chat Interface Component | `blocked` | 052 |
| 054 | Claude API Streaming Integration | `blocked` | 053 |
| 055 | Helix Brainstorming Prompt Engine | `blocked` | 054 |
| 056 | Discovery Phase — AI Asks Questions | `blocked` | 055 |
| 057 | Proposal Phase — AI Proposes Approach | `blocked` | 056 |
| 058 | Review Phase — AI Self-Reviews | `blocked` | 057 |
| 059 | Final Brief Phase — AI Writes Brief | `blocked` | 058 |
| 060 | Save & Edit Generated Brief | `blocked` | 059 |
| 061 | Brainstorming Session Persistence | `blocked` | 060 |
| 062 | Replace Manual Step 1.2 With In-App | `blocked` | 061 |

### Epic 8: In-App Build Planning — Steps 3.1–3.2 Automation (063–074)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 063 | Build Planning Chat Interface | `blocked` | 062 |
| 064 | Building Brief Summary Prompt Engine | `blocked` | 063 |
| 065 | Document Context Injection | `blocked` | 064 |
| 066 | Ask User Questions Module | `blocked` | 065 |
| 067 | AI Asks About Epics & Scope | `blocked` | 066 |
| 068 | AI Asks About Phase Sizing | `blocked` | 067 |
| 069 | Build Plan Generation — Summary | `blocked` | 068 |
| 070 | Build Plan Generation — Phase Files | `blocked` | 069 |
| 071 | Build Plan In-App Viewer & Editor | `blocked` | 070 |
| 072 | Build Plan Quality Validation | `blocked` | 071 |
| 073 | Build Plan Revision Workflow | `blocked` | 072 |
| 074 | Replace Manual Steps 3.1–3.2 With In-App | `blocked` | 073 |

### Epic 9: Documentation Intelligence — Steps 2.1–2.4 Automation (075–083)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 075 | Documentation Inventory AI | `blocked` | 074 |
| 076 | Gap Detection Engine | `blocked` | 075 |
| 077 | Documentation Review AI | `blocked` | 076 |
| 078 | Auto-Categorize Uploaded Documents | `blocked` | 077 |
| 079 | Knowledge Extraction Interview | `blocked` | 078 |
| 080 | Documentation Completeness Scoring | `blocked` | 079 |
| 081 | Review Report Generation | `blocked` | 080 |
| 082 | Verification Gate With AI Assessment | `blocked` | 081 |
| 083 | Replace Manual Steps 2.1–2.4 | `blocked` | 082 |

### Epic 10: Repo Setup Automation — Steps 4.1–4.4 (084–091)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 084 | Repo Template Customization Engine | `blocked` | 083 |
| 085 | Auto Find-and-Replace Placeholders | `blocked` | 084 |
| 086 | Build Plan → Repo Structure Generator | `blocked` | 085 |
| 087 | Downloadable Ready-Made Project Folder | `blocked` | 086 |
| 088 | Git Initialization Guide Generator | `blocked` | 087 |
| 089 | GitHub Repo Creation Integration | `blocked` | 088 |
| 090 | Pre-Build Review AI Assistant | `blocked` | 089 |
| 091 | Replace Manual Steps 4.1–4.4 | `blocked` | 090 |

### Epic 11: Build Phase Management — Step 6.1 Enhancement (092–101)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 092 | Phase Spec Viewer With Syntax Highlighting | `blocked` | 091 |
| 093 | Build Session Tracking | `blocked` | 092 |
| 094 | Automated Phase Discovery | `blocked` | 093 |
| 095 | Build Progress Real-Time Updates | `blocked` | 094 |
| 096 | Commit Tracking Integration | `blocked` | 095 |
| 097 | Alignment Report Viewer | `blocked` | 096 |
| 098 | Phase Dependency Visualization | `blocked` | 097 |
| 099 | Build Velocity Analytics | `blocked` | 098 |
| 100 | Build Handoff System | `blocked` | 099 |
| 101 | MCP API for Build Phases | `blocked` | 100 |

### Epic 12: Testing Intelligence — Steps 7.1–7.2 Enhancement (102–108)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 102 | Three-Tier Testing Matrix UI | `blocked` | 101 |
| 103 | Test Results Capture & Storage | `blocked` | 102 |
| 104 | Integration Test Checklist Generator | `blocked` | 103 |
| 105 | Test Coverage Tracking Per Phase | `blocked` | 104 |
| 106 | Bug Tracking Integration | `blocked` | 105 |
| 107 | Regression Detection Alerts | `blocked` | 106 |
| 108 | Test Report Generation | `blocked` | 107 |

### Epic 13: Deployment Pipeline — Steps 8.1–8.3 Enhancement (109–114)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 109 | Deployment Checklist Generator | `blocked` | 108 |
| 110 | Environment Configuration Manager | `blocked` | 109 |
| 111 | Deployment Readiness Gate | `blocked` | 110 |
| 112 | Post-Deploy Smoke Test System | `blocked` | 111 |
| 113 | Deployment History & Rollback Tracking | `blocked` | 112 |
| 114 | Production Monitoring Setup Guide | `blocked` | 113 |

### Epic 14: Deep V1 Module Data Sync (115–124)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 115 | Sync Architecture & Strategy | `blocked` | 114 |
| 116 | Project Brief → Hall Idea | `blocked` | 115 |
| 117 | Feature Tree From Build Plan → Pattern Shop | `blocked` | 116 |
| 118 | Phase Specs → Assembly Floor Work Orders | `blocked` | 117 |
| 119 | Blueprint Generation From Features → Control Room | `blocked` | 118 |
| 120 | Feedback Integration → Insights Lab | `blocked` | 119 |
| 121 | Bi-Directional Sync — Open Mode Changes | `blocked` | 120 |
| 122 | Sync Conflict Resolution | `blocked` | 121 |
| 123 | Sync Status Dashboard | `blocked` | 122 |
| 124 | Sync Audit Trail | `blocked` | 123 |

### Epic 15: Knowledge Graph Integration (125–129)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 125 | Helix Step Outputs → Knowledge Graph Entities | `blocked` | 124 |
| 126 | Cross-Step Relationship Mapping | `blocked` | 125 |
| 127 | Dependency Chain Visualization | `blocked` | 126 |
| 128 | Impact Analysis Engine | `blocked` | 127 |
| 129 | Process-to-Product Traceability | `blocked` | 128 |

### Epic 16: Real-Time Collaboration (130–135)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 130 | Multi-User Helix Process | `blocked` | 129 |
| 131 | Real-Time Presence In Helix Mode | `blocked` | 130 |
| 132 | Step-Level Comments & Discussions | `blocked` | 131 |
| 133 | Notification System for Helix Events | `blocked` | 132 |
| 134 | Email Notifications for Helix Events | `blocked` | 133 |
| 135 | Role-Based Step Assignments | `blocked` | 134 |

### Epic 17: Process Analytics & Reporting (136–141)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 136 | Process Metrics Dashboard | `blocked` | 135 |
| 137 | Multi-Project Process Comparison | `blocked` | 136 |
| 138 | Process Template System | `blocked` | 137 |
| 139 | Historical Process Analysis | `blocked` | 138 |
| 140 | Comprehensive Project Report Export | `blocked` | 139 |
| 141 | Executive Summary Generation | `blocked` | 140 |

### Epic 18: MCP & External Agent Integration (142–148)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 142 | MCP API for Helix Process | `blocked` | 141 |
| 143 | Claude Code Direct Integration | `blocked` | 142 |
| 144 | GitHub Integration | `blocked` | 143 |
| 145 | CI/CD Pipeline Integration | `blocked` | 144 |
| 146 | Webhook System for External Tools | `blocked` | 145 |
| 147 | Agent Status Dashboard | `blocked` | 146 |
| 148 | Agent Action Audit Trail | `blocked` | 147 |

### Epic 19: Process Customization & Advanced (149–157)

| Phase | Name | Status | Prerequisites |
|-------|------|--------|---------------|
| 149 | Custom Stage & Step Definitions | `blocked` | 148 |
| 150 | Conditional Step Logic | `blocked` | 149 |
| 151 | Custom Evidence Requirements | `blocked` | 150 |
| 152 | Process Template Library | `blocked` | 151 |
| 153 | Organization-Level Process Defaults | `blocked` | 152 |
| 154 | Step-Level Prompt Customization | `blocked` | 153 |
| 155 | Process Versioning | `blocked` | 154 |
| 156 | Accessibility Audit & WCAG Compliance | `blocked` | 155 |
| 157 | Performance Optimization & Security Hardening | `blocked` | 156 |

---

## Per-Phase Workflow (Repeatable)

For each phase:
1. Sync BuildPlan only: `git fetch origin main && git checkout origin/main -- Artifacts/BuildPlanv2/`
2. Confirm the phase shows `ready` in the Status Table above
3. Read the phase spec at `Artifacts/BuildPlanv2/Phases/Phase-XXX-*.md`
4. Build on the `main` branch
5. Run appropriate build/lint commands
6. Manual testing checkpoint: provide user with testing instructions
7. Commit code with `v2 - ` prefix, push to `main`
8. **Run alignment.md** — sync all project documents and push BuildPlan
9. Proceed to next phase

---

## Cross-Epic Dependency Map

These phases have dependencies that span multiple epics:

| Phase | Depends On | Why |
|-------|-----------|-----|
| 019 | 017 (Epic 3) + v1 Artifacts module | Connects Helix outputs to existing v1 Artifact storage |

_(Update as cross-epic dependencies are discovered during builds)_

---

*This document is updated automatically by the alignment.md process after every phase completion.*

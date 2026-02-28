# Foundry v2 — Helix Mode: Build Plan Summary

## Project Overview

Foundry v2 introduces "Helix Mode" — a linear, quality-controlled software development process built into the existing Foundry application. While Foundry v1 ("Open Mode") provides five free-form modules for product development (Hall, Pattern Shop, Control Room, Assembly Floor, Insights Lab), Helix Mode adds a structured, gated workflow that guides teams through the complete Helix methodology: from ideation through documentation, build planning, repo setup, building, testing, and deployment. Users toggle between Open Mode and Helix Mode within the same project, sharing the same database. Helix Mode enforces hard-block gate checks — you cannot proceed to the next step until the current step is verified complete with evidence. The MVP is a PM tracker; subsequent epics layer in AI automation, deep v1 data sync, and external tool integrations.

## Technology Stack

- **Frontend Framework:** Next.js 16+ with App Router & Turbopack (existing v1 app)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 with existing brand CSS variables
- **Backend & Services:**
  - **Authentication:** Supabase Auth (existing v1 auth system)
  - **Database:** PostgreSQL via Supabase with Row-Level Security
  - **Real-time Features:** Supabase Realtime
  - **File Storage:** Supabase Storage (existing Artifacts system)
  - **Multi-tenancy:** Existing org/project context with mode toggle extension
- **AI Integration:** Anthropic Claude (claude-haiku-4-5-20251001 for agents, claude-sonnet-4-5-20250929 for complex generation)
- **Additional Libraries:** TipTap (rich text), Recharts (analytics), @dnd-kit (drag-and-drop), Yjs (collaboration)

## Architecture

Helix Mode is integrated into the existing Foundry v1 application:

- **Mode Toggle:** Project-level setting switching between Open Mode (v1 modules) and Helix Mode (v2 linear process)
- **Shared Database:** No v2-only content tables. MVP stores outputs as Artifacts. Later epics write to v1 module tables.
- **Gate Checks:** Hard-block enforcement — steps are locked until prerequisites pass with evidence
- **Route Structure:** `/org/[orgSlug]/project/[projectId]/helix/...` alongside existing v1 routes

---

## Phase Breakdown (157 Phases across 19 Epics)

### EPIC 1: FOUNDATION & MODE INFRASTRUCTURE (Phases 001–008)

| Phase | Title | Description |
|-------|-------|-------------|
| 001 | Helix Mode Database Migration | Add `mode` column to projects table, create `helix_steps` tracking table, RLS policies |
| 002 | Mode Context Provider & Toggle | Build HelixModeProvider context, mode toggle component, persist mode in DB |
| 003 | Helix Route Structure | Create `/helix` route group with layout, loading states, and navigation guards |
| 004 | Helix Sidebar & Navigation Shell | Build Helix-specific sidebar showing 8 stages with step counts and progress indicators |
| 005 | Stage & Step Data Model | Define all 8 stages and 22 steps as structured config with metadata, instructions, and evidence requirements |
| 006 | Helix Dashboard Landing Page | Main Helix view showing all stages as a vertical pipeline with status, progress bar, and current step highlight |
| 007 | Hard-Block Gate Check Engine | Implement gate check logic: step completion validation, evidence verification, stage-level locking |
| 008 | Mode Toggle UX & Open Mode Bridge | Polish mode switching UX, handle edge cases (incomplete steps warning), breadcrumb integration |

### EPIC 2: PLANNING STAGE — STEPS 1.1–1.3 (Phases 009–014)

| Phase | Title | Description |
|-------|-------|-------------|
| 009 | Step Detail View Component | Reusable step detail page: instructions panel, evidence panel, status controls, navigation |
| 010 | Step 1.1 — Define Project Idea | Guided text input for project idea with rich text editor, save as artifact, mark complete with evidence |
| 011 | Step 1.2 — Brainstorming Prompt (Manual) | Display Helix Brainstorming Prompt template, instructions to run in Claude Chat, paste/upload results |
| 012 | Step 1.3 — Save Project Brief | Upload or paste project brief, preview rendered markdown, store as artifact, gate check validation |
| 013 | Evidence Viewer Component | Reusable component to display stored evidence (text, files, links) for any completed step |
| 014 | Step Navigation & Progress Tracking | Next/previous step buttons, breadcrumb trail, stage-level progress percentage calculation |

### EPIC 3: DOCUMENTATION STAGE — STEPS 2.1–2.4 (Phases 015–021)

| Phase | Title | Description |
|-------|-------|-------------|
| 015 | Step 2.1 — Identify Documentation | Structured checklist form for documentation inventory (specs, mockups, notes, code, prototypes) |
| 016 | Step 2.2 — Capture Undocumented Knowledge | Guided form with structured sections for domain knowledge, business rules, edge cases, design preferences |
| 017 | Step 2.3 — Gather Docs Into Folder | Multi-file upload zone with drag-and-drop, file type detection, organize by category, store as artifacts |
| 018 | Step 2.4 — Verify Documentation Complete | Review checklist comparing inventory against uploaded docs, gap flagging, require acknowledgment of gaps |
| 019 | Artifact Storage Integration | Connect Helix step outputs to v1 Artifacts module — create artifact entries for all uploaded files and text |
| 020 | Step Output Summary Cards | Compact cards showing what was produced in each completed step (file count, text preview, timestamps) |
| 021 | Documentation Stage Gate Check | Stage-level validation: all 4 steps complete, all evidence present, no critical gaps flagged without acknowledgment |

### EPIC 4: BUILD PLANNING & REPO SETUP — STEPS 3.1–4.4 (Phases 022–032)

| Phase | Title | Description |
|-------|-------|-------------|
| 022 | Step 3.1 — Building Brief Summary Prompt (Manual) | Display prompt template, instructions to run in Claude Cowork, link to collected documentation artifacts |
| 023 | Step 3.2 — Save Build Plan Output | Upload Build Plan folder (summary + phase files), parse and validate structure, store as artifacts |
| 024 | Build Plan Viewer | Read and display uploaded Build Plan: summary overview, phase list with descriptions, phase detail view |
| 025 | Step 3.3 — Review Build Plan Quality | Quality checklist: phase sizing (~half day), logical ordering, testable acceptance criteria, completeness |
| 026 | Build Planning Stage Gate Check | Stage-level validation: build plan uploaded, quality review passed, all phase files present and parseable |
| 027 | Step 4.1 — Copy Repo Template | Display repo template instructions, provide downloadable template zip, confirmation of template copied |
| 028 | Step 4.2 — Find-and-Replace Placeholders | Show placeholder list with input fields for actual values, generate replacement instructions |
| 029 | Step 4.3 — Populate BuildPlan Folder | Instructions to copy Build Plan files into repo, verification checklist |
| 030 | Step 4.4 — Initialize Git Repo | Git init instructions, paste repo URL as evidence, verify remote connection |
| 031 | Repo Setup Stage Gate Check | Stage-level validation: all repo setup steps complete with evidence (repo URL, screenshot, confirmation) |
| 032 | Step 5.1 — Pre-Build Review Checkpoint | Final review before building: CLAUDE.md accurate, BuildPlan files consistent, phase files detailed, approval gate |

### EPIC 5: BUILD, TESTING & DEPLOYMENT STAGES — STEPS 6.1–8.3 (Phases 033–044)

| Phase | Title | Description |
|-------|-------|-------------|
| 033 | Build Stage Overview & Phase Tracker | Repeating cycle view: list of all build phases from uploaded Build Plan with individual status tracking |
| 034 | Individual Build Phase Card | Phase detail card: spec preview, status (not started/in progress/built/tested), evidence fields |
| 035 | Build Phase Completion Flow | Mark phase as built: paste commit hash, describe what was built, attach test results, advance to next phase |
| 036 | Build Progress Dashboard | Visual progress: phases completed vs total, burndown-style chart, current phase highlight, time tracking |
| 037 | Step 7.1 — Per-Phase Testing Tracker | Three-tier testing matrix: AI-tested, Human-tested, User-tested columns per phase with status toggles |
| 038 | Step 7.2 — Integration Test Tracking | Integration test checklist, bug capture form, link bugs to phases, pass/fail gate |
| 039 | Testing Stage Gate Check | Validate minimum testing thresholds met, all critical phases human-tested, integration test passed |
| 040 | Step 8.1 — Prepare for Deployment | Deployment preparation checklist: merge dev to main, final checks, configuration review |
| 041 | Step 8.2 — Deploy to Production | Deployment execution tracking: deploy command/action evidence, deployment URL, status confirmation |
| 042 | Step 8.3 — Post-Deploy Verification | Smoke test checklist, production URL verification, error monitoring setup confirmation |
| 043 | Deployment Stage Gate Check | All deployment steps complete, production URL verified, post-deploy checks passed |
| 044 | Process Complete State & Summary | Celebration/completion view, full process summary with all evidence, export capability |

### EPIC 6: MVP POLISH & CROSS-CUTTING (Phases 045–052)

| Phase | Title | Description |
|-------|-------|-------------|
| 045 | Helix Process Timeline View | Visual timeline showing all stages and steps as a vertical flow with status indicators and timestamps |
| 046 | Step Evidence Export | Export all evidence for a step or stage as a zip file (files + text summary) |
| 047 | Process Summary Export | Generate and download a complete process summary document (MD/PDF) with all steps and evidence |
| 048 | Error Handling & Edge Cases | Error boundaries for Helix pages, offline handling, save failure recovery, incomplete data guards |
| 049 | Loading States & Skeleton Screens | Skeleton loaders for stage views, step details, build phase tracker, evidence panels |
| 050 | Mobile Responsive Helix Mode | Responsive layout for Helix sidebar, stage views, step details, and evidence forms on mobile/tablet |
| 051 | Helix Mode Permissions | Extend v1 permission system: who can toggle mode, who can complete steps, who can override gates |
| 052 | Unit Tests for Helix MVP | Vitest unit tests for gate check engine, step validation, mode toggle, progress calculation |

### EPIC 7: IN-APP BRAINSTORMING — STEP 1.2 AUTOMATION (Phases 053–062)

| Phase | Title | Description |
|-------|-------|-------------|
| 053 | Chat Interface Component | Reusable chat UI: message list, input field, streaming response display, scroll management |
| 054 | Claude API Streaming Integration | Server-side Claude API route with streaming, error handling, rate limiting, token tracking |
| 055 | Helix Brainstorming Prompt Engine | Templatized brainstorming prompt with project context injection, 4-phase system (Discovery→Proposal→Review→Brief) |
| 056 | Discovery Phase — AI Asks Questions | AI asks clarifying questions one at a time, user responds, AI adapts follow-up questions based on answers |
| 057 | Proposal Phase — AI Proposes Approach | After discovery, AI synthesizes answers and proposes recommended approach with reasoning |
| 058 | Review Phase — AI Self-Reviews | AI critically reviews its own proposal, identifies weaknesses, suggests improvements |
| 059 | Final Brief Phase — AI Writes Brief | AI generates detailed project brief document from the full conversation, formatted as markdown |
| 060 | Save & Edit Generated Brief | Save AI-generated brief as step evidence, allow user to edit before finalizing, version tracking |
| 061 | Brainstorming Session Persistence | Save/resume brainstorming sessions across browser sessions, session history, restart capability |
| 062 | Replace Manual Step 1.2 With In-App | Wire automated brainstorming into Step 1.2, keep manual option as fallback, A/B evidence paths |

### EPIC 8: IN-APP BUILD PLANNING — STEPS 3.1–3.2 AUTOMATION (Phases 063–074)

| Phase | Title | Description |
|-------|-------|-------------|
| 063 | Build Planning Chat Interface | Reuse chat component for build planning conversations, larger context window for documentation |
| 064 | Building Brief Summary Prompt Engine | Templatized prompt for build planning with project context + all collected documentation injection |
| 065 | Document Context Injection | Feed all Helix artifacts (brief, documentation, knowledge capture) into AI context for build planning |
| 066 | Ask User Questions Module | Mimics Claude Cowork's AskUserQuestion — structured Q&A with multiple-choice and free-text options |
| 067 | AI Asks About Epics & Scope | AI asks clarifying questions about epic structure, phase scope, tech stack, constraints |
| 068 | AI Asks About Phase Sizing | AI proposes phase breakdown, asks user to validate sizing (~3-4 hours each), suggests splits |
| 069 | Build Plan Generation — Summary | AI generates Building Brief Summary document following the template format |
| 070 | Build Plan Generation — Phase Files | AI generates individual phase spec files following the Phase Template format |
| 071 | Build Plan In-App Viewer & Editor | View generated Build Plan in-app, edit individual phases, reorder, split/merge phases |
| 072 | Build Plan Quality Validation | AI reviews generated plan for: phase sizing, logical ordering, dependency chains, acceptance criteria quality |
| 073 | Build Plan Revision Workflow | User provides feedback on generated plan, AI revises specific phases or overall structure |
| 074 | Replace Manual Steps 3.1–3.2 With In-App | Wire automated build planning into Steps 3.1–3.2, keep manual upload as fallback |

### EPIC 9: DOCUMENTATION INTELLIGENCE — STEPS 2.1–2.4 AUTOMATION (Phases 075–083)

| Phase | Title | Description |
|-------|-------|-------------|
| 075 | Documentation Inventory AI | AI analyzes uploaded files and suggests documentation categories, identifies file types and content |
| 076 | Gap Detection Engine | Compare uploaded docs against project brief requirements, flag missing documentation |
| 077 | Documentation Review AI | AI produces structured review with action items (like v2 Sample xlsx), priority scoring |
| 078 | Auto-Categorize Uploaded Documents | AI classifies uploaded files by type (spec, mockup, wireframe, notes, code, prototype) |
| 079 | Knowledge Extraction Interview | AI conducts structured interview to capture undocumented knowledge from project champion |
| 080 | Documentation Completeness Scoring | Numeric score for documentation completeness with breakdown by category and recommendations |
| 081 | Review Report Generation | Generate documentation review report (similar to v2 Sample), exportable as xlsx or markdown |
| 082 | Verification Gate With AI Assessment | AI assists with Step 2.4 verification, provides completeness opinion, highlights critical gaps |
| 083 | Replace Manual Steps 2.1–2.4 | Wire AI-powered documentation steps into Helix flow, keep manual options as fallback |

### EPIC 10: REPO SETUP AUTOMATION — STEPS 4.1–4.4 (Phases 084–091)

| Phase | Title | Description |
|-------|-------|-------------|
| 084 | Repo Template Customization Engine | In-app template customizer: input project values, preview generated files, download customized template |
| 085 | Auto Find-and-Replace Placeholders | Automatically replace all template placeholders with project-specific values from Helix step evidence |
| 086 | Build Plan → Repo Structure Generator | Generate populated BuildPlan/ folder structure from in-app Build Plan data, ready for download |
| 087 | Downloadable Ready-Made Project Folder | Generate complete, zip-downloadable project folder with customized CLAUDE.md, BuildPlan, and config |
| 088 | Git Initialization Guide Generator | Context-aware git init instructions based on project specifics (repo name, branches, remote URL) |
| 089 | GitHub Repo Creation Integration | Optional GitHub API integration to create repo, push initial commit, set branch protection |
| 090 | Pre-Build Review AI Assistant | AI reviews entire repo setup for consistency, flags issues (missing files, stale placeholders, broken references) |
| 091 | Replace Manual Steps 4.1–4.4 | Wire automated repo setup into Helix flow, keep manual steps as fallback |

### EPIC 11: BUILD PHASE MANAGEMENT — STEP 6.1 ENHANCEMENT (Phases 092–101)

| Phase | Title | Description |
|-------|-------|-------------|
| 092 | Phase Spec Viewer With Syntax Highlighting | Rich viewer for phase spec files: markdown rendering, code block syntax highlighting, section navigation |
| 093 | Build Session Tracking | Link build phases to Claude Code sessions, track session start/end times, session notes |
| 094 | Automated Phase Discovery | Parse BuildPlan roadmap to identify next ready phase, show dependencies, suggest build order |
| 095 | Build Progress Real-Time Updates | Real-time status updates when build phases are completed, WebSocket or Supabase Realtime |
| 096 | Commit Tracking Integration | Manual commit hash entry or GitHub webhook to auto-track commits per phase |
| 097 | Alignment Report Viewer | Display post-build alignment reports (from alignment.md process), diff view for updated docs |
| 098 | Phase Dependency Visualization | Visual graph showing phase dependencies, critical path highlighting, blocked phase detection |
| 099 | Build Velocity Analytics | Time per phase tracking, burndown chart, velocity trends, estimated completion projections |
| 100 | Build Handoff System | Session-to-session context: what was built, what's next, key decisions made, carry-forward notes |
| 101 | MCP API for Build Phases | External API endpoint for Claude Code agents to read phase specs and update phase status |

### EPIC 12: TESTING INTELLIGENCE — STEPS 7.1–7.2 ENHANCEMENT (Phases 102–108)

| Phase | Title | Description |
|-------|-------|-------------|
| 102 | Three-Tier Testing Matrix UI | Rich testing dashboard: AI-tested / Human-tested / User-tested columns per phase, toggle status |
| 103 | Test Results Capture & Storage | Structured test result entry: pass/fail per acceptance criterion, notes, screenshots, store as artifacts |
| 104 | Integration Test Checklist Generator | AI generates integration test checklist based on build plan phases and cross-phase dependencies |
| 105 | Test Coverage Tracking Per Phase | Track which acceptance criteria have been tested, coverage percentage per phase and overall |
| 106 | Bug Tracking Integration | Create bugs from failed tests, link to build phases, track resolution status |
| 107 | Regression Detection Alerts | Flag when new build phases might affect previously-tested phases, suggest re-test |
| 108 | Test Report Generation | Generate comprehensive test report: coverage, results, bugs found, recommendations |

### EPIC 13: DEPLOYMENT PIPELINE — STEPS 8.1–8.3 ENHANCEMENT (Phases 109–114)

| Phase | Title | Description |
|-------|-------|-------------|
| 109 | Deployment Checklist Generator | AI generates project-specific deployment checklist based on tech stack and infrastructure |
| 110 | Environment Configuration Manager | Track environment configs (dev, staging, production), compare settings, flag discrepancies |
| 111 | Deployment Readiness Gate | Automated readiness check: all phases built, minimum testing thresholds met, no critical bugs open |
| 112 | Post-Deploy Smoke Test System | Structured smoke test runner: define critical paths, execute manually, record pass/fail |
| 113 | Deployment History & Rollback Tracking | Track all deployments with timestamps, versions, who deployed, rollback instructions |
| 114 | Production Monitoring Setup Guide | Context-aware guide for setting up monitoring, alerting, and error tracking based on tech stack |

### EPIC 14: DEEP V1 MODULE DATA SYNC (Phases 115–124)

| Phase | Title | Description |
|-------|-------|-------------|
| 115 | Sync Architecture & Strategy | Design bi-directional sync between Helix step outputs and v1 module tables, conflict resolution strategy |
| 116 | Project Brief → Hall Idea | Auto-create Hall idea from saved project brief, link back to Helix Step 1.3 |
| 117 | Feature Tree From Build Plan → Pattern Shop | Parse Build Plan phases into feature_nodes hierarchy (epics→features→tasks) in Pattern Shop |
| 118 | Phase Specs → Assembly Floor Work Orders | Create work_orders from Build Plan phase specs, map to Assembly Floor phases |
| 119 | Blueprint Generation From Features → Control Room | Auto-generate blueprint stubs in Control Room from Pattern Shop feature nodes |
| 120 | Feedback Integration → Insights Lab | Route external feedback to Insights Lab, link to Helix project context |
| 121 | Bi-Directional Sync — Open Mode Changes | When v1 module data changes, reflect status updates back in Helix step tracking |
| 122 | Sync Conflict Resolution | Handle conflicts when same data is modified in both modes, user-prompted resolution |
| 123 | Sync Status Dashboard | Visual dashboard showing sync state between Helix and Open Mode for each data type |
| 124 | Sync Audit Trail | Log all sync operations with timestamps, data before/after, conflict resolutions |

### EPIC 15: KNOWLEDGE GRAPH INTEGRATION (Phases 125–129)

| Phase | Title | Description |
|-------|-------|-------------|
| 125 | Helix Step Outputs → Knowledge Graph Entities | Register Helix artifacts as entities in the v1 knowledge graph system |
| 126 | Cross-Step Relationship Mapping | Auto-detect and create connections between related artifacts across Helix steps |
| 127 | Dependency Chain Visualization | Visual graph showing how Helix outputs connect to v1 module entities |
| 128 | Impact Analysis Engine | When a Helix artifact changes, identify all downstream entities that may be affected |
| 129 | Process-to-Product Traceability | Full traceability from initial idea through every Helix step to final deployed code |

### EPIC 16: REAL-TIME COLLABORATION (Phases 130–135)

| Phase | Title | Description |
|-------|-------|-------------|
| 130 | Multi-User Helix Process | Support multiple team members working on different steps simultaneously, step-level locking |
| 131 | Real-Time Presence In Helix Mode | Show who is viewing/working on which step, active user indicators per stage |
| 132 | Step-Level Comments & Discussions | Threaded comments on individual steps, @mentions, resolution tracking |
| 133 | Notification System for Helix Events | In-app notifications for step completions, gate check passes, comments, assignments |
| 134 | Email Notifications for Helix Events | Configurable email alerts for critical Helix events (stage completion, blockers, assignments) |
| 135 | Role-Based Step Assignments | Assign specific team members to steps, track who completed what, workload visibility |

### EPIC 17: PROCESS ANALYTICS & REPORTING (Phases 136–141)

| Phase | Title | Description |
|-------|-------|-------------|
| 136 | Process Metrics Dashboard | Time per stage, bottleneck detection, average phase build time, process health indicators |
| 137 | Multi-Project Process Comparison | Compare process metrics across projects: which stages take longest, common bottlenecks |
| 138 | Process Template System | Save completed Helix process as a template, reuse for similar projects, template library |
| 139 | Historical Process Analysis | Trends across projects over time, process improvement tracking, velocity trends |
| 140 | Comprehensive Project Report Export | Generate full project report: process summary, all artifacts, metrics, timeline — PDF or DOCX |
| 141 | Executive Summary Generation | AI-generated executive summary of project status, progress, risks, and recommendations |

### EPIC 18: MCP & EXTERNAL AGENT INTEGRATION (Phases 142–148)

| Phase | Title | Description |
|-------|-------|-------------|
| 142 | MCP API for Helix Process | RESTful API for external agents to read Helix process state, step evidence, and Build Plan data |
| 143 | Claude Code Direct Integration | Trigger /build-phase from Foundry, pass phase spec to Claude Code, receive completion status |
| 144 | GitHub Integration | Auto-track commits, PRs, and branches per build phase via GitHub webhooks or API polling |
| 145 | CI/CD Pipeline Integration | Connect to CI/CD systems, auto-update build phase status based on pipeline results |
| 146 | Webhook System for External Tools | Configurable webhooks for Helix events (phase complete, stage gate passed, deployment triggered) |
| 147 | Agent Status Dashboard | Monitor what external agents are working on, their progress, recent actions, error rates |
| 148 | Agent Action Audit Trail | Log all external agent actions with timestamps, what was read/modified, results |

### EPIC 19: PROCESS CUSTOMIZATION & ADVANCED (Phases 149–157)

| Phase | Title | Description |
|-------|-------|-------------|
| 149 | Custom Stage & Step Definitions | Allow organizations to customize the Helix process: add/remove/reorder stages and steps |
| 150 | Conditional Step Logic | Skip steps based on project type (e.g., skip Repo Setup for non-code projects) |
| 151 | Custom Evidence Requirements | Configure what evidence is required per step (file types, minimum content, required fields) |
| 152 | Process Template Library | Organization-level library of process templates, share across projects, versioned templates |
| 153 | Organization-Level Process Defaults | Set default Helix process configuration for all new projects in an organization |
| 154 | Step-Level Prompt Customization | Customize AI prompts used in each step (brainstorming, build planning, documentation review) |
| 155 | Process Versioning | Track changes to the Helix process definition over time, migrate projects to new process versions |
| 156 | Accessibility Audit & WCAG Compliance | Full accessibility review of Helix Mode, keyboard navigation, screen reader support, ARIA labels |
| 157 | Performance Optimization & Security Hardening | Code splitting, query optimization, RLS policy audit, rate limiting, input sanitization |

---

## Summary

**Total Phases:** 157
**Total Epics:** 19
**Estimated Total Effort:** ~470–630 hours (157 phases × 3–4 hours each)

**MVP (Epics 1–6):** 52 phases — Core PM tracker with gate checks, evidence, artifacts integration, polish
**AI Automation (Epics 7–10):** 39 phases — In-app brainstorming, build planning, documentation intelligence, repo automation
**Build & Test Intelligence (Epics 11–13):** 23 phases — Enhanced build tracking, testing matrix, deployment pipeline
**Deep Integration (Epics 14–16):** 16 phases — V1 data sync, knowledge graph, real-time collaboration
**Advanced (Epics 17–19):** 27 phases — Analytics, external integrations, process customization

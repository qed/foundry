# Helix Foundry: Building Brief Summary

## Project Overview

Helix Foundry is a comprehensive product development platform designed to orchestrate the entire journey from initial ideation through execution and feedback. It enables teams to capture raw ideas, evolve them into structured product requirements, translate those requirements into technical blueprints, execute work in organized phases, and continuously gather user feedback to inform future iterations. Built with modern web technologies and AI-powered agent assistance, Helix Foundry provides five interconnected modules that work together to streamline product development workflows.

## Technology Stack

- **Frontend Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend & Services:**
  - **Authentication:** Supabase Auth (email/password, JWT, role-based access)
  - **Database:** PostgreSQL via Supabase
  - **Real-time Features:** Supabase Realtime
  - **File Storage:** Supabase Storage
  - **Multi-tenancy:** Org/project context management with tenant isolation
- **AI Integration:** LLM-powered agents with context loading across modules
- **Additional Libraries:** TipTap (rich text editing), Mermaid (diagram rendering), Yjs/CRDT (collaborative editing)

## Core Modules

1. **The Hall** - Ideation and raw idea capture with AI-powered tagging and duplicate detection
2. **The Pattern Shop** - Product requirements and feature tree management with FRD generation
3. **The Control Room** - Technical architecture blueprints and system design documentation
4. **The Assembly Floor** - Work order management, Kanban boards, and phase-based execution tracking
5. **The Insights Lab** - User feedback collection, categorization, and conversion to work items

---

## Phase Breakdown (150 Total Phases)

### SECTION 1: FOUNDATION (001-010)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 001 | Next.js Project Setup | Initialize Next.js 14+ with TypeScript, Tailwind CSS, ESLint, project structure | Foundation |
| 002 | Supabase Project & Database Schema | Create Supabase project, configure PostgreSQL, design multi-tenant schema (orgs, projects, users) | Foundation |
| 003 | Supabase Auth Configuration | Set up Supabase Auth with email/password, JWT config, role-based access | Foundation |
| 004 | Next.js Auth Middleware & Sessions | Implement auth middleware, session context, protected routes, redirect logic | Foundation |
| 005 | Multi-Tenancy Foundation | Implement org/project context management, tenant isolation, context hooks | Foundation |
| 006 | Core UI Shell & Layout | Build main app layout (sidebar, header), navigation structure, routing for all 5 modules | Foundation |
| 007 | Global UI Components Library | Create reusable components (buttons, forms, cards, modals, badges, tooltips) | Foundation |
| 008 | User Registration & Onboarding | Signup page, email verification, org creation during onboarding, invite system | Foundation |
| 009 | User Roles & Permissions System | Define role types (admin, leader, developer), permission checks, role assignment | Foundation |
| 010 | Navigation & Module Switching | Build dynamic nav with module links, user menu, org/project switcher | Foundation |

### SECTION 2: THE HALL MVP (011-025)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 011 | Hall Database Schema | Create tables for ideas, notes, tags, connections, metadata | The Hall |
| 012 | Hall Page Layout & UI | Build Hall landing page with idea list, creation button, empty state | The Hall |
| 013 | Create Idea / Note Capture | Form to create ideas with title, rich text body, optional tags | The Hall |
| 014 | Hall Idea List View | Display all ideas in sortable list with timestamps, creator, tag badges | The Hall |
| 015 | Hall Search & Filter | Search by title/content, filter by tags, sort by date/creator | The Hall |
| 016 | Idea Detail View | Single idea view with full content, tags, metadata, edit/delete actions | The Hall |
| 017 | Edit & Delete Ideas | Update idea content/tags, soft-delete, undo/restore | The Hall |
| 018 | Tagging & Tag Management | Create/edit/delete tags, assign to ideas, tag cloud display | The Hall |
| 019 | Hall Bulk Operations | Multi-select ideas, bulk tag/untag, bulk delete, bulk promote to Pattern Shop | The Hall |
| 020 | Hall Agent Infrastructure | AI agent chat panel, message history, agent API route, LLM integration | The Hall |
| 021 | Hall Agent: Auto-Tag Suggestions | Agent suggests tags for new ideas, displays suggestions, accept/reject UI | The Hall |
| 022 | Hall Agent: Duplicate Detection | Agent identifies potential duplicates, surfaces for user review | The Hall |
| 023 | Hall Agent: Connection Discovery | Agent suggests connections between related ideas | The Hall |
| 024 | Hall Real-Time Updates | Configure Supabase Realtime for Hall, live idea list updates, presence | The Hall |
| 025 | Hall to Pattern Shop Promotion | Workflow to promote mature ideas into Pattern Shop as feature seeds | The Hall |

### SECTION 3: THE PATTERN SHOP MVP (026-045)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 026 | Pattern Shop Database Schema | Tables for feature tree nodes (epic/feature/sub-feature/task), requirements docs, versions | Pattern Shop |
| 027 | Pattern Shop Page Layout | Two-panel layout: feature tree (left) + document editor/agent chat (right) | Pattern Shop |
| 028 | Product Overview Document | Create/edit product overview doc with business context, goals, target users | Pattern Shop |
| 029 | Feature Tree Component | Interactive hierarchical tree (Epic→Feature→Sub-feature→Task) with expand/collapse | Pattern Shop |
| 030 | Add Nodes to Feature Tree | UI to add epic/feature/sub-feature/task nodes with inline editing | Pattern Shop |
| 031 | Edit & Delete Tree Nodes | Update node properties, delete nodes with children handling, confirmation | Pattern Shop |
| 032 | Feature Tree Drag-and-Drop | Reorder and reparent nodes via drag-drop, visual feedback, persist to DB | Pattern Shop |
| 033 | Feature Requirements Document | Auto-generated FRD per feature with template sections, rich text editor | Pattern Shop |
| 034 | Requirements Document Editor | TipTap-based rich text editor with formatting, auto-save, document outline | Pattern Shop |
| 035 | Feature Tree Status Tracking | Status field per node (not-started, in-progress, complete), visual indicators | Pattern Shop |
| 036 | Feature Tree Search & Filter | Search nodes by text, filter by status/level, highlight matches in tree | Pattern Shop |
| 037 | Pattern Shop Agent Infrastructure | Agent chat panel, context loading (artifacts, tree), LLM API route | Pattern Shop |
| 038 | Agent: Feature Tree Generation | Agent reads brief/artifacts and proposes complete feature tree, user reviews | Pattern Shop |
| 039 | Agent: Requirements Review | Agent reviews FRDs for gaps, ambiguity, conflicts; flags issues as comments | Pattern Shop |
| 040 | Agent: Gap Detection | Agent compares tree against brief, identifies missing requirements | Pattern Shop |
| 041 | Feature Tree Statistics | Display counts (epics, features, tasks), completion percentages, progress bars | Pattern Shop |
| 042 | Requirements Import/Export | Import .md/.docx files as requirements, export FRDs to .pdf/.md/.docx | Pattern Shop |
| 043 | Pattern Shop Document Versioning | Track document versions, view history, compare versions with diff | Pattern Shop |
| 044 | Pattern Shop Comments | Anchored comments on requirements docs, @mentions, resolved/unresolved | Pattern Shop |
| 045 | Technical Requirements Documents | Cross-cutting technical requirement docs (auth, security, performance) | Pattern Shop |

### SECTION 4: THE CONTROL ROOM MVP (046-060)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 046 | Control Room Database Schema | Tables for blueprints (foundation, system diagram, feature), versions, links | Control Room |
| 047 | Control Room Page Layout | Blueprint list/tree (left) + blueprint editor (right), type filters | Control Room |
| 048 | Foundation Blueprints | Create/edit foundation blueprints (tech stack, architecture, conventions) | Control Room |
| 049 | Blueprint Rich Text Editor | TipTap editor for blueprints with formatting, code blocks, auto-save | Control Room |
| 050 | System Diagram Blueprints | Create system diagram blueprints with Mermaid diagram rendering | Control Room |
| 051 | Feature Blueprints | Create feature blueprints linked 1:1 to Pattern Shop features | Control Room |
| 052 | Feature-Blueprint Linking | Enforce and display 1:1 relationship between features and blueprints | Control Room |
| 053 | Blueprint Templates | Configurable blueprint templates (outline sections), org-level templates | Control Room |
| 054 | Blueprint Status Tracking | Status field (draft, review, approved), progress indicators | Control Room |
| 055 | Blueprint Search & Filter | Search blueprints by text, filter by type/status/feature | Control Room |
| 056 | Control Room Agent Infrastructure | Agent chat panel, context (blueprints, requirements, artifacts), LLM route | Control Room |
| 057 | Agent: Blueprint Generation | Agent drafts blueprint from feature requirements, user reviews/edits | Control Room |
| 058 | Agent: Blueprint Review | Agent reviews blueprints for gaps, conflicts, suggests improvements | Control Room |
| 059 | Blueprint Version History | Track blueprint versions, diff view, restore previous versions | Control Room |
| 060 | Blueprint Comments | Anchored comments on blueprints, @mentions, resolve/unresolve | Control Room |

### SECTION 5: THE ASSEMBLY FLOOR MVP (061-080)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 061 | Assembly Floor Database Schema | Tables for work orders, phases, assignments, statuses, implementation plans | Assembly Floor |
| 062 | Assembly Floor Page Layout | Kanban board (default) + list view toggle, filters bar, creation button | Assembly Floor |
| 063 | Create Work Order (Manual) | Form with title, description, acceptance criteria, linked feature/blueprint | Assembly Floor |
| 064 | Work Order Detail View | Full work order page: description, acceptance criteria, implementation plan, activity | Assembly Floor |
| 065 | Kanban Board View | Drag-drop kanban with columns (Backlog, Ready, In Progress, In Review, Done) | Assembly Floor |
| 066 | Kanban Card Display | Cards show title, assignee avatar, priority badge, feature link, AC count | Assembly Floor |
| 067 | Work Order List/Table View | Sortable table with columns (title, status, assignee, priority, phase) | Assembly Floor |
| 068 | Work Order Assignment | Assign work orders to team members, reassignment, unassigned filter | Assembly Floor |
| 069 | Work Order Phases | Create/manage phases, assign work orders to phases, phase grouping in views | Assembly Floor |
| 070 | Work Order Priority & Sequencing | Priority levels, drag-drop sequencing within phases, execution order | Assembly Floor |
| 071 | Progress Tracking & Rollup | Completion tracking, progress rollup to features/epics, progress bars | Assembly Floor |
| 072 | Work Order Search & Filter | Search by text, filter by status/assignee/phase/priority, saved filters | Assembly Floor |
| 073 | Assembly Floor Agent Infrastructure | Agent chat panel, context (blueprints, requirements, work orders), LLM route | Assembly Floor |
| 074 | Agent: Work Order Extraction | Agent reads blueprints and generates work orders, user reviews batch | Assembly Floor |
| 075 | Agent: Phase Planning | Agent suggests phase groupings and sequencing based on dependencies | Assembly Floor |
| 076 | Work Order Implementation Plans | Rich text implementation plan section with file-level guidance | Assembly Floor |
| 077 | Work Order Bulk Operations | Multi-select, bulk status change, bulk assign, bulk phase move | Assembly Floor |
| 078 | Assembly Floor Comments | Comments on work orders, @mentions, activity feed | Assembly Floor |
| 079 | Leader Progress Dashboard | Read-only dashboard showing completion by epic, overall progress, timeline | Assembly Floor |
| 080 | MCP Connection Schema & API Routes | Database tables and API endpoints for MCP agent connections | Assembly Floor |

### SECTION 6: THE INSIGHTS LAB MVP (081-095)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 081 | Insights Lab Database Schema | Tables for feedback submissions, categories, tags, scores, conversions | Insights Lab |
| 082 | Feedback Collection API | Public API endpoint for feedback submission with App Key auth | Insights Lab |
| 083 | Insights Lab Page Layout | Inbox view (left) + detail/actions panel (right), filters bar | Insights Lab |
| 084 | Feedback Inbox Display | List feedback with timestamp, preview text, category badge, score | Insights Lab |
| 085 | Feedback Detail View | Full feedback with submitter info, device/browser context, category, actions | Insights Lab |
| 086 | Feedback Categorization | Assign categories (bug, feature-request, UX issue), multi-tag support | Insights Lab |
| 087 | Feedback Search & Filter | Search text, filter by category/tag/date/score, saved views | Insights Lab |
| 088 | Convert Feedback to Work Order | Create work order from feedback, pre-populate fields, bidirectional link | Insights Lab |
| 089 | Convert Feedback to Feature | Create Pattern Shop feature from feedback, link back to feedback | Insights Lab |
| 090 | Insights Lab Agent Infrastructure | Agent chat panel, context (feedback, features, work orders), LLM route | Insights Lab |
| 091 | Agent: Auto-Categorization | Agent categorizes incoming feedback, suggests tags, confidence scores | Insights Lab |
| 092 | Agent: Feedback Enrichment | Agent summarizes feedback, extracts key issues, links to related items | Insights Lab |
| 093 | Agent: Conversion Suggestions | Agent recommends converting feedback to work orders/features | Insights Lab |
| 094 | App Key Management | Generate/revoke App Keys for feedback API, key scoping per project | Insights Lab |
| 095 | Feedback Bulk Operations | Multi-select feedback, bulk categorize, bulk archive, bulk convert | Insights Lab |

### SECTION 7: CROSS-CUTTING ENHANCEMENTS (096-120)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 096 | Artifacts Database & Storage | Tables for artifacts, Supabase Storage buckets, file metadata tracking | Cross-Cutting |
| 097 | Artifact Upload UI | Drag-drop upload in project overview + in-agent upload, progress indicators | Cross-Cutting |
| 098 | Artifact Browser & Management | Browse artifacts by folder, preview files, rename, delete, organize | Cross-Cutting |
| 099 | Artifact Linking to Entities | Link artifacts to ideas/features/blueprints/work orders, @ reference in editors | Cross-Cutting |
| 100 | Artifact Search & Indexing | Full-text search across artifact names/content, agent-accessible search | Cross-Cutting |
| 101 | Artifact Folders & Organization | Hierarchical folder structure, drag-drop into folders, breadcrumb nav | Cross-Cutting |
| 102 | Document Version History System | Generic versioning for all document types, automatic version creation on save | Cross-Cutting |
| 103 | Version Diff & Comparison | Side-by-side diff view, red/green change highlighting | Cross-Cutting |
| 104 | Version Restore | Restore any document to previous version with confirmation | Cross-Cutting |
| 105 | Comments System Foundation | Generic polymorphic comments for all entities, threaded replies | Cross-Cutting |
| 106 | @Mentions System | Mention users/documents in comments and editors, autocomplete dropdown | Cross-Cutting |
| 107 | Notification System | In-app notifications for @mentions, comments, assignments, status changes | Cross-Cutting |
| 108 | Email Notifications | Email alerts for @mentions, critical updates, configurable preferences | Cross-Cutting |
| 109 | Knowledge Graph Schema | Entity relationship tables, connection types (references, depends-on, relates-to) | Cross-Cutting |
| 110 | Knowledge Graph Explorer Panel | Visual graph showing entity connections, clickable navigation | Cross-Cutting |
| 111 | Auto-Connection Detection | Scan documents for cross-references, auto-create entity connections | Cross-Cutting |
| 112 | Manual Entity Linking | UI to create/remove connections between any entities across modules | Cross-Cutting |
| 113 | Organization Console | Org settings, member management, project list, usage overview | Cross-Cutting |
| 114 | Team Invitation System | Email invitations, invite links, pending invites management | Cross-Cutting |
| 115 | Seat Management & Billing Schema | Seat limits, billing tables, Stripe integration schema | Cross-Cutting |
| 116 | User Profile & Settings | Profile page (name, avatar), notification preferences, password change | Cross-Cutting |
| 117 | Real-Time Presence | Show online users in sidebar, active-in-module indicators | Cross-Cutting |
| 118 | Real-Time Collaborative Editing | Concurrent document editing with conflict resolution (Yjs/CRDT) | Cross-Cutting |
| 119 | Audit Trail & Activity Log | Log all significant actions, viewable in org admin, filterable | Cross-Cutting |
| 120 | Project Archive & Cleanup | Archive completed projects, restore archived projects, data retention | Cross-Cutting |

### SECTION 8: ADVANCED FEATURES (121-135)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 121 | Hall: Idea Maturity Scoring | Auto-score ideas by completeness/engagement, maturity indicators | The Hall |
| 122 | Pattern Shop: Agent Writing Instructions | Custom instructions for agent writing style, injected into agent context | Pattern Shop |
| 123 | Pattern Shop: Aggregate Export | Export all requirements as single concatenated file with ordering | Pattern Shop |
| 124 | Control Room: Drift Detection | Compare blueprints against code changes, flag outdated blueprints | Control Room |
| 125 | Control Room: Cross-Document Suggestions | Agent suggests edits across multiple blueprints for architectural changes | Control Room |
| 126 | Control Room: Blueprint Templates (Org-Level) | Organization-wide shared blueprint templates, admin management | Control Room |
| 127 | Assembly Floor: Extraction Strategy Config | Configure work order extraction style (feature-slice vs specialist) | Assembly Floor |
| 128 | Assembly Floor: Sprint/Phase Burndown | Burndown charts per phase, velocity tracking, completion projections | Assembly Floor |
| 129 | Assembly Floor: MCP Implementation | Full MCP integration - coding agents pull work orders, update status | Assembly Floor |
| 130 | Assembly Floor: Work Order Sync Alerts | Detect blueprint changes affecting work orders, suggest updates | Assembly Floor |
| 131 | Insights Lab: Slack Integration | Webhook alerts for critical feedback, configurable notification rules | Insights Lab |
| 132 | Insights Lab: Feedback Analytics | Trend charts, category distribution, most-mentioned features over time | Insights Lab |
| 133 | Insights Lab: Priority Scoring | AI-powered priority scoring based on frequency, severity, user tier | Insights Lab |
| 134 | Cross-Module: Global Search | Unified search across all modules (ideas, features, blueprints, work orders, feedback) | Cross-Cutting |
| 135 | Cross-Module: Dark/Light Theme Toggle | Theme toggle with system preference detection, persistent preference | Cross-Cutting |

### SECTION 9: POLISH & DEPLOYMENT (136-150)

| Phase | Name | Description | Module/Area |
|-------|------|-------------|-------------|
| 136 | Error Boundaries & Fallback UI | React error boundaries, user-friendly error pages, error logging | Quality |
| 137 | Loading States & Skeleton Screens | Skeleton loaders for all data-fetching views, progressive loading | Quality |
| 138 | Form Validation & Error Messages | Zod validation schemas, inline error messages, server-side validation | Quality |
| 139 | Responsive Design Audit | Mobile/tablet layouts for all modules, touch-friendly interactions | Quality |
| 140 | Accessibility Audit (WCAG) | Keyboard navigation, ARIA labels, screen reader testing, contrast | Quality |
| 141 | Performance Optimization | Query optimization, component memoization, lazy loading, bundle splitting | Performance |
| 142 | Database Indexing & Query Tuning | Create indexes, optimize Supabase RLS policies, connection pooling | Performance |
| 143 | Unit Tests: Foundation & Auth | Tests for auth middleware, session management, tenant isolation, permissions | Testing |
| 144 | Unit Tests: All Modules | Component and business logic tests for all 5 modules | Testing |
| 145 | E2E Tests: Critical Workflows | End-to-end tests: signup → create project → idea → feature → blueprint → work order | Testing |
| 146 | API Documentation | OpenAPI/Swagger docs for all API routes, request/response schemas | Documentation |
| 147 | User Guide & Onboarding Tooltips | In-app tooltips, "Getting Started" flows per module, help pages | Documentation |
| 148 | CI/CD Pipeline | GitHub Actions: lint, test, build, deploy to Vercel on merge to main | DevOps |
| 149 | Security Audit & Hardening | Auth review, API rate limiting, input sanitization, CORS config, secrets audit | Security |
| 150 | Production Launch Checklist | Final QA pass, monitoring setup, error tracking, analytics, launch | Launch |

---

## Summary

This 150-phase roadmap provides a comprehensive path to building Helix Foundry from foundation through production launch. The phases are organized into logical sections that flow from core infrastructure, through MVP implementations of each module, to cross-cutting enhancements, advanced features, and finally polish and deployment. Each phase builds upon previous work to create an integrated product development platform powered by AI agents and real-time collaboration features.

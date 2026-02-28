# Foundry v2 — Post-Phase Alignment Checklist

> **Purpose**: Run this checklist after every completed phase to keep all project documents in sync with reality, then push the updated BuildPlan.
> **When to run**: At the end of the build session, AFTER committing the phase code to `dev`.
> **Who runs it**: Claude Code, in the same session that built the phase.
> **Estimated time**: 5–10 minutes per alignment run.

---

## How This Works

You (Claude Code) just finished building a phase. You have full context from the conversation — what was planned, what was discussed, what the engineer asked for, what changed during UAT, and what was actually built. Now you need to propagate that truth into the project documents (including the per-epic PhaseHistory file), then push the BuildPlan folder so every engineer starts the next phase with accurate context.

**Do NOT skip steps. Do NOT summarize loosely. Be precise.**

---

<!-- If your project spans multiple repos that share BuildPlan, uncomment and fill in: -->
<!--
## Repository Context

| Repo | GitHub URL | Contains |
|------|-----------|----------|
| [Repo 1] | `https://github.com/[ORG]/[REPO_1]` | [description] + `Artifacts/BuildPlanv2/` |
| [Repo 2] | `https://github.com/[ORG]/[REPO_2]` | [description] + `Artifacts/BuildPlanv2/` |

The `Artifacts/BuildPlanv2/` folder exists in BOTH repos and must be kept identical. After updating the docs locally, you push to both repos' `dev` branch.
-->

---

## Pre-Alignment Check

Before running the tasks below, confirm these conditions:

- [ ] The phase build is complete (code compiles, lint passes, tests pass)
- [ ] The phase code has been committed and pushed to `dev` on the current repo
- [ ] You have the full conversation context from this build session
- [ ] You know the phase number and can locate the phase spec file

If any of these are false, stop and resolve them first.

---

## Task 1: Identify What Changed

**Action**: Compare the phase spec (what was planned) against what was actually built. Use your conversation context to identify:

1. **Deviations from spec**: Features that were built differently than specified
2. **Dropped items**: Requirements that were descoped or deferred
3. **Added items**: Things that were built that weren't in the original spec (engineer requests, UAT findings, new utilities)
4. **New patterns or conventions**: Any new utilities, components, helpers, or architectural patterns introduced that future phases should know about
5. **New key files**: Any new files created that are likely to be referenced by future phases
6. **Dependency changes**: Any changes that affect downstream phases (new prerequisites, removed assumptions, changed APIs)

**Output**: Hold this analysis in memory. You'll use it in every subsequent task.

---

## Task 2: Update the Phase File

**File**: `Artifacts/BuildPlanv2/Phases/Phase-XXX-*.md` (the phase you just built)

**Action**: Rewrite the phase spec to match what was actually built. The file should read as a record of what WAS built, not what was originally planned.

**Rules**:
- Update the Objective section if the actual outcome differs from the original objective
- Update Detailed Requirements to reflect what was actually implemented (code snippets, file paths, API contracts)
- Update any file paths or component names that changed during implementation
- Update the Test Cases section to reflect actual test scenarios that were verified
- If new files were created that weren't in the spec, add them
- If files listed in the spec weren't touched, remove them
- Keep the same document structure and formatting conventions — just make the content truthful
- Update the Epic Context if phase scope expanded or contracted

**Do NOT**:
- Add a "Deviations" or "Changelog" section — the document should read cleanly as if it was always the plan
- Leave stale code snippets that don't match the actual implementation
- Keep references to features that were dropped

---

## Task 3: Update 00-Building-Brief-Summary.md

**File**: `Artifacts/BuildPlanv2/00-Building-Brief-Summary.md`

**Action**: Update the one-line description for this phase in the relevant Epic table to accurately reflect what was delivered.

**Rules**:
- Find the row for this phase number in the correct Epic table
- Rewrite the "One-Line Description" column to match what was actually built (not what was originally planned)
- If the phase title itself needs updating (rare, but possible if scope changed significantly), update that too
- If this phase introduced a change that affects the Tech Stack section, update it
- If this phase created or changed an Epic-level pattern, add a note under the Epic header

**Do NOT**:
- Change descriptions for other phases unless this phase's changes directly invalidate them
- Add new sections or restructure the document

---

## Task 4: Update roadmap.md

**File**: `Artifacts/BuildPlanv2/roadmap.md`

**Action**: Update the roadmap to reflect the completed phase and any ripple effects.

**Specific updates**:

1. **Mark the phase as done**: Update its status in the Phase Status Table from `ready`/`in-progress` to `done`
2. **Update the Execution Queue**: Move this phase from "Next up" to "Completed" in Section 6 (Sequential Execution Queue)
3. **Unblock downstream phases**: Check if completing this phase makes any `blocked` phases `ready` (all their prerequisites are now `done`)
4. **Flag new dependencies**: If this phase introduced something that future phases now depend on but didn't before, add it to the relevant phase's Prerequisites
5. **Update "Next up"**: Ensure the "Next up" section shows the correct next phase(s) to build
6. **Update Progress Summary**: Increment the "Done" count, decrement "Ready" or "Blocked" as appropriate
7. **Update the "Last updated" date**

**If scope changed during this phase**:
- If a downstream phase's requirements are now different because of what was built, add a note to that phase's row in the Status Table
- If a new phase needs to be added (rare), add it to the appropriate section with correct dependencies

---

## Task 5: Update nextsteps.md

**File**: `Artifacts/BuildPlanv2/nextsteps.md`

**Action**: Update the living prompt template to reflect everything learned during this phase.

**Specific updates**:

1. **Phase History (Section 1)**: Update the phase count and reference. The detailed narrative goes in the PhaseHistory file (Task 5B), not inline here.
2. **Key Files to Read (Section 2)**: If this phase created new files that future phases in the same module/track should read, add them to the appropriate track section. If a file was renamed or moved, update the reference.
3. **Conventions & Patterns (Section 3)**: If this phase introduced new conventions, patterns, or "gotchas" that future phases must follow, add them as new numbered items. Examples:
   - A new utility function that should be used instead of a manual pattern
   - A new component that replaces a previous approach
   - A platform-specific workaround discovered during implementation
   - An ESLint or TypeScript pattern to follow or avoid
4. **Sequential Execution Queue (Section 6)**: Update to match the roadmap changes from Task 4
5. **Update the "Last updated" date**

**Do NOT**:
- Remove existing conventions unless they are provably obsolete
- Rewrite sections that aren't affected by this phase
- Add speculative conventions ("we might need this later") — only add things that are confirmed true

---

## Task 5B: Append to PhaseHistory

**File**: `Artifacts/BuildPlanv2/PhaseHistory/epic-XX-*.md` (the file matching the epic this phase belongs to)

**Action**: Append a detailed technical narrative for the completed phase to the relevant PhaseHistory file.

**Format**:
```
**XXX** -- Phase Title -- Detailed technical narrative describing what was actually
built. Include API endpoints created, components built, schemas added, patterns
established, key files created/modified, integration points, and design decisions.
Be specific — mention file paths, function names, and concrete implementation details.
```

**Rules**:
- Append to the BOTTOM of the file (phases are chronological within each epic)
- Use the same format as existing entries: `**NNN** -- Title -- Narrative`
- Write in past tense describing what WAS built (not what was planned)
- Include enough detail that a future session can understand the implementation without reading the source code
- For cross-epic phases, append to ALL relevant epic files with a note: `(cross-epic: also in epic-XX)`
- If the epic's PhaseHistory file doesn't exist yet, create it following the template in PhaseHistory/README.md

**Do NOT**:
- Write vague summaries ("updated the dashboard") — be specific
- Include test commands or verification steps — this is a record of what was built, not a runbook
- Duplicate the full phase spec — summarize the key implementation decisions and outcomes

---

## Task 6: Cross-Document Consistency Check

**Action**: Re-read all updated documents (phase file, summary, roadmap, nextsteps, PhaseHistory) and verify they tell the same story.

**Check for**:

1. **Phase description consistency**: Does the phase file, the summary one-liner, the roadmap entry, the nextsteps history reference, and the PhaseHistory narrative all describe the same thing?
2. **Status consistency**: Does the roadmap show this phase as `done`? Does the nextsteps execution queue match?
3. **File reference consistency**: Are any files referenced in nextsteps that don't exist? Are any new key files missing from nextsteps?
4. **Dependency consistency**: Do the roadmap prerequisites still make sense given what was actually built?
5. **Convention consistency**: Do any new conventions in nextsteps contradict existing ones?
6. **No stale content**: Search for references to things that were dropped or changed — make sure they're cleaned up across all docs

**If you find inconsistencies**: Fix them immediately. Don't flag them and move on.

---

## Task 7: Report

After completing Tasks 1-6, present the engineer with a brief alignment summary:

```
## Alignment Complete — Phase XXX

**Changes detected**:
- [List the key deviations, additions, or dropped items]

**Documents updated**:
- Artifacts/BuildPlanv2/Phases/Phase-XXX-*.md — [what changed]
- Artifacts/BuildPlanv2/00-Building-Brief-Summary.md — [what changed]
- Artifacts/BuildPlanv2/roadmap.md — [what changed]
- Artifacts/BuildPlanv2/nextsteps.md — [what changed]

**Downstream impact**:
- [List any phases that were unblocked, or whose requirements changed]

**New conventions added**:
- [List any new conventions or key files added to nextsteps]
```

If nothing changed (the phase was built exactly to spec with no deviations), say so:

```
## Alignment Complete — Phase XXX

No deviations detected. All documents updated with completion status only.
```

**Always end the report with the suggested next command.** Look up the next `ready` phase from `Artifacts/BuildPlanv2/roadmap.md` and include:

```
**Next phase**: Phase YYY — <Phase Title>

To start it, run:
/build-phase
```

---

## Task 8: Commit and Push BuildPlan

### Step 8a: Commit and push BuildPlan to the current repo

```bash
git add Artifacts/BuildPlanv2/
git commit -m "docs: align BuildPlan after Phase XXX"
git push origin dev
```

<!-- If your project spans multiple repos, uncomment this section: -->
<!--
### Step 8b: Push BuildPlan to the OTHER repo

Determine which repo you're currently in, then push to the other one.

**Detect the current repo:**
```bash
git remote get-url origin
```

**Push to the other repo using a temp clone:**
```bash
OTHER_REPO="https://github.com/[ORG]/[OTHER_REPO].git"

git clone --branch dev --depth 1 "$OTHER_REPO" /tmp/other-repo
rm -rf /tmp/other-repo/Artifacts/BuildPlanv2/
cp -r Artifacts/BuildPlanv2/ /tmp/other-repo/Artifacts/BuildPlanv2/

cd /tmp/other-repo
git add Artifacts/BuildPlanv2/
git commit -m "docs: sync BuildPlan after Phase XXX"
git push origin dev

cd -
rm -rf /tmp/other-repo
```

**If the clone fails** (auth issues, network problems):
1. Tell the engineer: "I couldn't push BuildPlan to the other repo. You'll need to manually copy the Artifacts/BuildPlanv2/ folder."
2. Provide the exact commands they'd need to run.
3. Do NOT silently skip this step.

### Step 8c: Confirm sync

After both pushes succeed, report:
```
BuildPlan synced to both repos:
- [Repo 1] (dev branch)
- [Repo 2] (dev branch)
```
-->

---

## Quick Reference: What Goes Where

| Document | What it tracks | Updated how |
|----------|---------------|-------------|
| Phase file | Detailed spec for ONE phase | Rewritten to match what was built |
| 00-Building-Brief-Summary.md | One-line description per phase, tech stack, epic structure | Update the one-liner for this phase |
| roadmap.md | Status tracking, execution queue, dependencies, progress counts | Mark done, unblock downstream, update queue |
| nextsteps.md | Prompt template: phase history, key files, conventions, patterns | Add to history, add new files/conventions |
| PhaseHistory file | Detailed technical narrative per phase, grouped by epic | Append new entry for this phase |

---

## Failure Modes to Watch For

These are the most common ways alignment goes wrong. Watch for them:

1. **Lazy summaries**: Writing "updated the payment flow" when the actual change was "replaced token auth with direct gateway auth in the wallet load endpoint." Be specific.
2. **Forgetting new files**: A phase creates `src/utils/formatCurrency.ts` but it never gets added to nextsteps Key Files. The next phase reimplements it.
3. **Stale prerequisites**: Phase 045 was supposed to depend on 043, but 043 got descoped. The roadmap still shows the dependency.
4. **Convention drift**: Phase 030 established that all API responses use `{ success, data, error }` format, but it never got added to nextsteps conventions. Phase 035 uses a different format.
5. **Optimistic unblocking**: Marking a downstream phase as "ready" when the current phase actually changed the API it depends on.

---

*This file should be read by Claude Code at the end of every phase build session. Run all tasks sequentially. Do not skip the consistency check.*

# Epic 2: Planning Stage — Things to Test

> Comprehensive testing checklist for Phases 009–014.
> Use this to verify the full Epic 2 build before moving to Epic 3.

---

## Phase 009 — Step Detail View Component

### Step Route (`/org/[orgSlug]/project/[projectId]/helix/step/[stepKey]`)

- [ ] Navigate to `/helix/step/1.1` — Step 1.1 content renders (not generic StepDetailView)
- [ ] Navigate to `/helix/step/1.2` — Step 1.2 content renders
- [ ] Navigate to `/helix/step/1.3` — Step 1.3 content renders
- [ ] Navigate to `/helix/step/2.1` — Generic StepDetailView renders
- [ ] Navigate to `/helix/step/invalid` — redirects to Helix dashboard
- [ ] Navigate with invalid projectId — redirects to org page

### StepDetailView (Generic Steps)

- [ ] Left panel shows step overview, deliverables, and evidence requirements from `helix-process.ts` config
- [ ] Right panel shows EvidencePanel when step is active
- [ ] Right panel shows EvidenceViewer when step is complete
- [ ] Locked step shows "Locked" badge in header
- [ ] Active step shows cyan "Active" badge with pulse animation
- [ ] Complete step shows green "Complete" badge

### EvidencePanel

- [ ] Text evidence: textarea with 50-char minimum, character counter turns green at 50
- [ ] File evidence: file upload with name/size display after selection
- [ ] URL evidence: URL input with validation
- [ ] Checklist evidence: checkboxes with labels, all must be checked to submit
- [ ] "Mark as Complete" button disabled when no evidence provided
- [ ] "Mark as Complete" button disabled during loading (spinner shows)
- [ ] Validation errors display in red alert box
- [ ] Completed state shows read-only summary with date

### Config Updates

- [ ] Stage 1 title is "Planning" (not "Discovery")
- [ ] Step 1.1 title is "Define Project Idea"
- [ ] Step 1.2 title is "Brainstorming Prompt"
- [ ] Step 1.3 title is "Save Project Brief"

---

## Phase 010 — Step 1.1: Define Project Idea

### Form Fields

- [ ] Project Name input (required)
- [ ] Problem Statement textarea (required)
- [ ] Target Users textarea (required)
- [ ] Vision textarea (optional — no asterisk)
- [ ] TipTap editor for Project Idea (rich text with toolbar)

### TipTap Editor

- [ ] Bold button works (toggles bold on selected text)
- [ ] Italic button works
- [ ] Bullet list button works
- [ ] Ordered list button works
- [ ] Editor accepts multiline content
- [ ] Editor toolbar buttons show active state when formatting is applied

### Validation

- [ ] "Save & Complete" disabled when required fields are empty
- [ ] "Save & Complete" disabled when ideaText is under 50 characters (HTML tags stripped for count)
- [ ] Character counter shows X / 50 and turns green at 50+
- [ ] Validation errors display for empty required fields

### Auto-Save

- [ ] Type in any field — after 2 seconds of inactivity, "Auto-saved" indicator appears
- [ ] Auto-save calls `POST /api/helix/projects/[projectId]/steps/1.1/auto-save`
- [ ] Refresh page after auto-save — form fields restored from saved evidence_data
- [ ] Auto-save does NOT mark the step as complete

### Completion

- [ ] Click "Save & Complete" with valid data — step marked as complete
- [ ] Page reloads showing completed view
- [ ] Completed view shows all fields in read-only format
- [ ] "Continue to Step 1.2" link appears and navigates correctly
- [ ] Next step (1.2) is unlocked (status changed from 'locked' to 'active')

### Edge Cases

- [ ] Revisiting Step 1.1 after completion shows read-only view (no form)
- [ ] Auto-save indicator clears after a few seconds

---

## Phase 011 — Step 1.2: Brainstorming Prompt

### Gate Check

- [ ] Navigate to Step 1.2 when Step 1.1 is NOT complete — redirects to Step 1.1
- [ ] Navigate to Step 1.2 when Step 1.1 IS complete — renders correctly

### Prompt Generation

- [ ] Prompt includes project name from Step 1.1's evidence_data
- [ ] Prompt shows all 4 phases (Problem Deep Dive, Solution Exploration, User & Market Research, Project Brief Synthesis)
- [ ] Prompt displays in monospace font within scrollable container

### Copy to Clipboard

- [ ] Click "Copy Prompt" — text copied to clipboard
- [ ] Button changes to "Copied to Clipboard!" with green styling for 2 seconds
- [ ] Button returns to default state after 2 seconds

### Paste Output

- [ ] Textarea accepts pasted text
- [ ] Character counter shows X / 500 and turns green at 500+
- [ ] "Submit Pasted Output" button disabled when text is empty
- [ ] "Submit Pasted Output" button disabled when text is under 500 characters
- [ ] Validation error shows for text under 500 characters

### File Upload

- [ ] Click upload area — file picker opens
- [ ] Accepts .md and .txt files
- [ ] File contents are read and validated (500-char minimum)
- [ ] File upload triggers save and completion

### Completion

- [ ] Submit with valid text — step marked as complete, page reloads
- [ ] Completed view shows the brainstorming output (truncated in scrollable container)
- [ ] Source info shown: "Uploaded file: {name}" for file uploads
- [ ] "Continue to Step 1.3" link appears
- [ ] Step 1.3 is unlocked

### External Link

- [ ] "Open Claude Chat" button links to https://claude.ai in new tab

---

## Phase 012 — Step 1.3: Save Project Brief

### Gate Check

- [ ] Navigate to Step 1.3 when Step 1.2 is NOT complete — redirects to Step 1.2
- [ ] Navigate to Step 1.3 when Step 1.2 IS complete — renders correctly

### Source/Preview Toggle

- [ ] "Source" tab active by default — shows textarea
- [ ] Click "Preview" tab — shows rendered markdown
- [ ] Preview shows "Paste your Project Brief to see a preview here" when textarea is empty
- [ ] Preview renders markdown correctly (headings, lists, bold, links, code blocks, tables)
- [ ] Switching between Source and Preview preserves textarea content

### Markdown Renderer

- [ ] H1-H4 headings render with correct sizes and colors
- [ ] Paragraphs render with relaxed line-height
- [ ] Unordered lists render with disc bullets
- [ ] Ordered lists render with decimal numbers
- [ ] Blockquotes render with cyan left border
- [ ] Inline code renders with cyan text on tertiary background
- [ ] Code blocks render with border and padding
- [ ] Tables render with borders and header styling
- [ ] Links render in cyan with hover underline

### Paste Content

- [ ] Character counter shows X / 100 and turns green at 100+
- [ ] "Save Project Brief" button disabled when text is empty
- [ ] "Save Project Brief" button disabled when text is under 100 characters
- [ ] Validation error for text under 100 characters

### File Upload

- [ ] Accepts .md, .txt, .markdown, .text files
- [ ] Rejects other file types with error message
- [ ] File contents validated (100-char minimum)
- [ ] File upload triggers save and completion

### Completion

- [ ] Submit with valid text — step marked complete, page reloads
- [ ] Completed view renders content through MarkdownRenderer
- [ ] Source info shown for file uploads
- [ ] "Planning Complete" message shown: "Stage 1 — Planning is now complete"
- [ ] "Back to Helix Dashboard" link navigates correctly

---

## Phase 013 — Evidence Viewer Component

### EvidenceViewer (`components/helix/EvidenceViewer.tsx`)

- [ ] Renders "Submitted Evidence" header with green check icon
- [ ] Shows completion timestamp in human-readable format (e.g., "Feb 28, 2026, 02:30 PM")
- [ ] Shows submitter name and email when provided
- [ ] Audit footer shows step key and evidence type

### Text Evidence

- [ ] Text content renders through MarkdownRenderer
- [ ] Copy button appears in top-right corner
- [ ] Click copy — clipboard updated, icon changes to green check for 2 seconds
- [ ] Source file name shown when evidence source is 'file'
- [ ] Long content scrollable (max-height with overflow)

### Step 1.1 Evidence (Structured)

- [ ] Normalizer detects `ideaText` field and formats as markdown with sections
- [ ] Renders: Project Name as H1, Problem Statement, Target Users, Vision, Project Idea

### File Evidence

- [ ] Shows file icon, file name, file type, and file size
- [ ] Download button appears when fileUrl is present

### URL Evidence

- [ ] Renders as clickable link with external link icon
- [ ] Opens in new tab

### Checklist Evidence

- [ ] Shows completion count: "X of Y items completed"
- [ ] Disabled checkboxes display checked/unchecked state
- [ ] Checked items show strikethrough text

### Manual Evidence

- [ ] Shows yellow alert icon with "manually reviewed and approved" message

### No Evidence

- [ ] Shows "No evidence data available" message with alert icon

### Integration with StepDetailView

- [ ] Generic step in complete state — right panel shows EvidenceViewer (not EvidencePanel)
- [ ] Generic step in active state — right panel shows EvidencePanel (not EvidenceViewer)

---

## Phase 014 — Step Navigation & Progress Tracking

### BreadcrumbNav (`components/helix/BreadcrumbNav.tsx`)

- [ ] Shows: Helix > Stage N: Title > Step Key — Step Title
- [ ] Helix link navigates to dashboard
- [ ] Current step shown in bold/primary color
- [ ] Breadcrumb renders correctly in StepDetailView header

### ProgressBar (`components/helix/ProgressBar.tsx`)

- [ ] Stage progress bar shows correct fill percentage
- [ ] Label shows "X / Y" steps completed
- [ ] Active stage has cyan border and accent color
- [ ] 100% complete stage bar turns green with check icon
- [ ] OverallProgress shows percentage and "X of Y steps completed"

### StepNavigation (`components/helix/StepNavigation.tsx`)

- [ ] Previous button shows previous step key and title
- [ ] Next button shows next step key and title
- [ ] Previous button hidden/empty on first step (1.1)
- [ ] Next button hidden/empty on last step (8.2)
- [ ] Next button disabled (with Lock icon) when current step is not complete
- [ ] Next button disabled when next step is locked
- [ ] Next button enabled when current step is complete and next step is not locked
- [ ] Previous button always enabled (can navigate back to completed steps)
- [ ] Clicking enabled buttons navigates to correct step URL

### useHelixProgress Hook

- [ ] Returns `stages` array with progress per stage
- [ ] Returns `totalCompleted`, `totalSteps`, `percentage`
- [ ] `isLoading` true during fetch, false after
- [ ] `refresh()` refetches progress data
- [ ] Error state populated on API failure

### Progress API (`GET /api/helix/projects/[projectId]/progress`)

- [ ] Returns JSON: `{ stages: [{ stageNumber, stageTitle, completedSteps, totalSteps }] }`
- [ ] Stage counts match actual step completion in database
- [ ] All 8 stages returned even when no steps exist

### Integration

- [ ] StepDetailView shows BreadcrumbNav above the title
- [ ] StepDetailView shows StepNavigation at bottom (border-top separator)
- [ ] Navigation works after completing a step (next step becomes accessible)
- [ ] Progress persists on page reload

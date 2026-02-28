# Phase 076 - Work Order Implementation Plans

## Objective
Add implementation plan functionality to work orders, allowing structured guidance on file changes, dependencies, and step-by-step implementation with optional AI generation.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 064: Work Order Detail View
- Phase 073: Assembly Floor Agent Infrastructure

## Context
Implementation plans bridge the gap between requirements and code. They provide developers with structured guidance on what files to create/modify, implementation order, dependencies, and step-by-step instructions. AI can generate initial plans that developers refine.

## Detailed Requirements

### Implementation Plan Fields

#### Structure
- **Objective** (auto-generated or from description)
  - 1-2 sentence summary of what to implement
  - Auto-generated from work order description initially

- **Dependencies** (auto-generated from analysis)
  - List of other work orders or systems required before this
  - Format: "Requires Phase 1: User Authentication"

- **File Changes** (structured list)
  - File to modify/create with path
  - What to change (add function, modify class, etc.)
  - Example: "src/components/LoginForm.tsx - Add handleSubmit function"

- **Implementation Steps** (numbered list)
  - Detailed step-by-step instructions
  - Can include pseudo-code or actual code examples
  - Links to documentation if applicable

- **Key Considerations** (bullet list)
  - Edge cases to handle
  - Performance considerations
  - Security concerns
  - Testing requirements

#### Format
- Rich text / markdown
- Code block support
- Links (to docs, other work orders, features)
- Optional checklist for sub-tasks (Phase 078)

### Plan Creation

#### Manual Entry
- Text area in work order detail
- Edit button toggles edit mode
- Rich text editor with toolbar
- Save button persists plan

#### AI Generation
- Button: "Generate Implementation Plan"
- Agent uses work order context:
  - Title, description, acceptance criteria
  - Linked feature node
  - Project tech stack
  - Similar work orders (for examples)
- Agent generates structured plan
- User reviews and refines before saving

### AI Generation Prompt
```
Generate a detailed implementation plan for this work order:

Title: [title]
Description: [description]
Acceptance Criteria: [criteria list]
Linked Feature: [feature name]
Tech Stack: Next.js 14, TypeScript, Tailwind CSS, Supabase

The plan should include:
1. Objective (1-2 sentences)
2. Dependencies (what must be done first)
3. File Changes (list of files to create/modify with specific changes)
4. Implementation Steps (detailed numbered steps)
5. Key Considerations (edge cases, performance, security, testing)

Return as markdown with clear sections and code examples where helpful.
```

### Database Schema

#### Extend work_orders table
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS
  implementation_plan TEXT,
  implementation_plan_json JSONB,
  implementation_steps TEXT[],
  file_changes TEXT[],
  dependencies TEXT[],
  plan_generated_at TIMESTAMP WITH TIME ZONE;
```

Note: Keep both text and JSON versions for flexibility:
- TEXT: for display in UI, full markdown
- JSONB: for structured queries (e.g., find all work orders that modify "src/auth/")

## UI Components

### New/Modified Components
1. **ImplementationPlanSection** (modify Phase 064)
   - Display section in work order detail
   - Shows plan content with markdown rendering
   - Edit/View toggle
   - "Generate Plan" button (if no plan exists)

2. **ImplementationPlanEditor** (`app/components/Assembly/ImplementationPlanEditor.tsx`)
   - Rich text editor for plan content
   - Markdown support
   - Toolbar: bold, italic, code, lists, headings
   - Code block insertion
   - Save/Cancel buttons

3. **GeneratePlanButton** (`app/components/Assembly/GeneratePlanButton.tsx`)
   - Button to trigger AI generation
   - Shows loading spinner while generating
   - Replaces old plan or offers to merge

4. **PlanPreviewModal** (`app/components/Assembly/PlanPreviewModal.tsx`)
   - Modal to review AI-generated plan
   - Shows full plan
   - Edit before accepting
   - Accept/Reject buttons

5. **FileChangesList** (`app/components/Assembly/FileChangesList.tsx`)
   - Renders file changes section
   - Shows file path and changes
   - Collapsible per file
   - Code syntax highlighting

### Reused Components
- RichTextEditor (from Phase 063)
- Markdown renderer (from common)
- Code block (from common)

## File Structure
```
app/
  components/
    Assembly/
      ImplementationPlanSection.tsx       # Plan display in detail view
      ImplementationPlanEditor.tsx        # Rich text editor for plan
      GeneratePlanButton.tsx              # Trigger AI generation
      PlanPreviewModal.tsx                # Review AI-generated plan
      FileChangesList.tsx                 # Render file changes
  api/
    projects/
      [projectId]/
        work-orders/
          [workOrderId]/
            implementation-plan/
              route.ts                    # PATCH implementation plan
            generate-plan/
              route.ts                    # POST AI generation
  lib/
    agent/
      planGenerationPrompt.ts             # Prompt for plan generation
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useGenerateImplementationPlan.ts # Hook for AI generation
          useUpdateImplementationPlan.ts   # Hook for saving plan
```

## API Routes
```
PATCH /api/projects/[projectId]/work-orders/[workOrderId]/implementation-plan
  - Save implementation plan
  - Request: { implementation_plan: "markdown text" }
  - Response: Updated work order with plan
  - Status: 200

POST /api/projects/[projectId]/work-orders/[workOrderId]/generate-plan
  - Generate plan via AI
  - Request: {} (uses work order context)
  - Response: { generated_plan: "markdown text", structured_plan: {...} }
  - Status: 200
  - May stream response
```

## Acceptance Criteria
- Implementation plan section appears in work order detail
- Section shows plan content (if exists) with markdown rendering
- Edit button toggles edit mode
- Rich text editor opens for plan editing
- Save button persists plan
- "Generate Plan" button visible (if no plan)
- Click generates AI plan based on work order context
- Generated plan shown in preview modal
- User can accept or reject generated plan
- Accepted plan saved to work order
- File changes rendered with proper formatting
- Dependencies listed clearly
- Implementation steps numbered and detailed
- Plan persists on page reload
- Activity entry tracks plan generation by agent
- Code examples rendered with syntax highlighting

## Testing Instructions

1. **Plan Display**
   - Create work order without implementation plan
   - Open detail view
   - Verify "Implementation Plan" section present
   - Verify "No implementation plan defined" message
   - Verify "Generate Plan" button visible

2. **Manual Plan Entry**
   - Click "Generate Plan" or edit button
   - Verify rich text editor opens
   - Type plan content with markdown:
     - Headings (##, ###)
     - Bold, italic
     - Code blocks (```javascript)
     - Lists
   - Click save
   - Verify plan saved and displayed with formatting

3. **Generate Plan via AI**
   - Work order: "Implement user login form"
   - Description: "Create login form component with email/password fields"
   - Acceptance Criteria: "User can log in, errors shown, session created"
   - Click "Generate Plan"
   - Verify loading spinner appears
   - Verify generated plan appears in preview modal
   - Verify plan includes:
     - Objective section
     - File changes (which files to create/modify)
     - Implementation steps
     - Key considerations

4. **Review & Accept Generated Plan**
   - Preview modal shows generated plan
   - Plan looks reasonable and actionable
   - Click "Accept"
   - Verify plan saved to work order
   - Verify modal closes
   - Verify plan now displayed in detail view

5. **Reject & Regenerate**
   - Generated plan is incomplete or wrong
   - Click "Reject"
   - Verify plan not saved
   - Modal closes
   - Click "Generate Plan" again
   - Verify different plan generated (or option to regenerate)

6. **Edit AI-Generated Plan**
   - Accept generated plan
   - Click edit button
   - Modify plan content
   - Add missing details
   - Click save
   - Verify modifications persisted

7. **Plan Persistence**
   - Save plan
   - Refresh page
   - Navigate back to work order
   - Verify plan still there with same content

8. **File Changes Rendering**
   - Plan includes file changes section:
     ```
     ## File Changes
     - src/components/LoginForm.tsx - Create new component with form
     - src/pages/login.tsx - Add route and import LoginForm
     ```
   - Verify renders as list, not code block
   - Verify file paths clear and readable

9. **Code Examples**
   - Plan includes code examples:
     ```javascript
     function handleSubmit(email, password) {
       // Validation code
     }
     ```
   - Verify code block renders with syntax highlighting
   - Verify language detection works (javascript)

10. **Dependencies Section**
    - Plan lists dependencies
    - Verify renders clearly
    - Verify can link to other work orders (if implemented)

11. **Activity Tracking**
    - Generate plan via AI
    - Navigate to activity feed
    - Verify entry shows: "[Agent] generated implementation plan"
    - Timestamp shown

12. **Multiple Regenerations**
    - Generate plan
    - Reject
    - Generate again
    - Verify second plan different
    - Accept
    - Generate once more
    - Verify new plan generated (can regenerate)

13. **Complex Work Orders**
    - Work order with complex requirements
    - Generate plan
    - Verify plan is detailed and structured
    - Verify steps are logical and ordered
    - Verify all acceptance criteria addressed

14. **Error Handling**
    - Mock API error during generation
    - Verify error message shown
    - Option to retry

15. **Plan with Limited Context**
    - Work order with minimal description
    - Generate plan
    - Verify agent generates reasonable plan
    - Handles missing information gracefully

16. **Markdown Rendering**
    - Plan includes various markdown:
     - Headers
     - Lists (ordered and unordered)
     - Bold, italic, code inline
     - Links
    - Verify all rendered correctly
    - Verify not escaped as literal markdown

17. **Edit & Save Cycle**
    - Generate plan
    - Edit it multiple times
    - Save after each edit
    - Verify all edits persisted
    - No loss of content

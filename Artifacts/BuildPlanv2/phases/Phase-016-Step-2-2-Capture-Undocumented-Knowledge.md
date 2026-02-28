# Phase 016: Step 2.2 — Prompt Champion for Undocumented Knowledge

## Phase Overview
**Stage:** Epic 3: Documentation Stage (Step 2.2)
**Phase:** 016
**Route:** `/org/[orgSlug]/project/[projectId]/helix/step/2-2/`
**Time Estimate:** 2-4 hours
**Complexity:** High

## Objective
Capture critical domain knowledge, business rules, and design preferences that exist only in the project champion's mind. This structured knowledge capture ensures that implicit assumptions, edge cases, and organizational constraints are documented before build planning begins.

## Prerequisites
- Phase 015 (Step 2.1) complete: Documentation inventory exists
- User is project champion or has "owner" role
- TipTap rich text editor library integrated in project
- Supabase Storage configured for artifact uploads
- Artifacts system integrated (from Foundry v1)

## Epic Context
Step 2.2 is the second step of Epic 3 (Documentation Stage). While Step 2.1 inventories existing external documentation, Step 2.2 captures the knowledge that lives only in the champion's head. This prevents knowledge loss and ensures the build team has full context.

## Context
Domain experts often have deep knowledge about:
- Why certain design decisions were made
- Business rules not written anywhere
- Edge cases and exception handling requirements
- Technical constraints and dependencies
- Success criteria and definition of done
- Known risks and failure modes
- User workflows and pain points

Without capturing this knowledge early, the build team will discover it piecemeal during implementation, leading to rework and missed requirements. Step 2.2 provides structured prompts to guide the champion through systematic knowledge capture.

## Detailed Requirements

### 1. Knowledge Capture Form Structure
Create a guided form with 8 structured sections, each with its own rich text editor. Each section has:
- **Section title and description** (help text)
- **TipTap rich text editor** with toolbar (bold, italic, lists, headings, code blocks)
- **Placeholder prompt** (example text showing expected content type)
- **Character counter** (current/max, soft limit at 5000 chars per section)
- **Save status indicator** for that section

**Eight Required Sections:**

1. **Domain Knowledge**
   - Description: "Explain the core business, domain, and context this project operates in"
   - Placeholder: "This project helps [users/teams] [do what]... The key domain concepts are..."
   - Max: 5000 chars

2. **Business Rules**
   - Description: "List explicit business rules, constraints, and policies the system must enforce"
   - Placeholder: "Rules include: 1) Only admins can..., 2) Users cannot..., 3) The system must always..."
   - Max: 5000 chars

3. **Edge Cases & Exceptions**
   - Description: "Document unusual scenarios, boundary conditions, and how they should be handled"
   - Placeholder: "Edge cases: When [scenario], the system should [behavior]. If [condition], then [action]..."
   - Max: 5000 chars

4. **User Workflows**
   - Description: "Describe the key user journeys and workflows through the system"
   - Placeholder: "Users typically start by [action], then [action], finally [action]... Advanced workflows include..."
   - Max: 5000 chars

5. **Design Preferences**
   - Description: "Explain design philosophy, style preferences, and interaction patterns"
   - Placeholder: "We prefer [style]. The system should feel [descriptor]. Key interactions include..."
   - Max: 5000 chars

6. **Technical Constraints**
   - Description: "Document technical limitations, dependencies, and architectural requirements"
   - Placeholder: "We must use [technology]. We cannot use [technology] because... Performance targets are..."
   - Max: 5000 chars

7. **Success Criteria**
   - Description: "Define what success looks like for this project"
   - Placeholder: "Success means [metric]. We win when [condition]. Key KPIs are..."
   - Max: 5000 chars

8. **Known Risks**
   - Description: "Identify potential problems, risks, and mitigation strategies"
   - Placeholder: "Risk: [description]. Impact: [severity]. Mitigation: [strategy]. Risk: ..."
   - Max: 5000 chars

### 2. Rich Text Editor Features
Each editor instance includes:
- Toolbar with: Bold, Italic, Underline, Strikethrough
- Lists: Unordered bullet list, Ordered numbered list
- Heading levels: H2, H3, H4
- Code block (for technical constraints section)
- Link insertion
- Clear formatting button
- Full/minimal mode toggle (expandable editor)
- Character count display (current / max)
- Auto-save indicator ("Saving...", "Saved", "Error")

### 3. Auto-save Behavior
- Debounce: 3-second interval per section
- On save, update helix_steps.evidence_data with section content
- Show brief "Saved" indicator below editor for 2 seconds
- If save fails, show error toast with retry option
- Maintain local draft state (unsaved changes visible even if offline)
- Periodically autosave to localStorage as backup (every 5 seconds)

### 4. Artifact Creation
When step 2.2 is completed:
- Create single Artifact titled "Domain Knowledge Capture"
- Filename: `domain-knowledge-{projectId}-{timestamp}.md`
- Content: Markdown formatted version of all 8 sections
- Type: "documentation"
- Store in Helix process folder: `Helix/2-Documentation/`
- Make shareable link available for team review

### 5. Evidence Collection
Evidence object saved to helix_steps.evidence_data as jsonb:
```json
{
  "evidence_type": "knowledge_capture",
  "created_at": "2026-02-28T14:00:00Z",
  "updated_at": "2026-02-28T14:00:00Z",
  "sections": {
    "domain_knowledge": {
      "title": "Domain Knowledge",
      "content": "This project helps product teams...",
      "character_count": 1245,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "business_rules": {
      "title": "Business Rules",
      "content": "Rules include: 1) Only admins can...",
      "character_count": 892,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "edge_cases": {
      "title": "Edge Cases & Exceptions",
      "content": "When user is inactive for 30 days...",
      "character_count": 567,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "user_workflows": {
      "title": "User Workflows",
      "content": "Users start by creating...",
      "character_count": 1456,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "design_preferences": {
      "title": "Design Preferences",
      "content": "We prefer minimal design...",
      "character_count": 734,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "technical_constraints": {
      "title": "Technical Constraints",
      "content": "We must use PostgreSQL...",
      "character_count": 543,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "success_criteria": {
      "title": "Success Criteria",
      "content": "Success means 95% uptime...",
      "character_count": 312,
      "updated_at": "2026-02-28T14:00:00Z"
    },
    "known_risks": {
      "title": "Known Risks",
      "content": "Risk: User adoption slow...",
      "character_count": 876,
      "updated_at": "2026-02-28T14:00:00Z"
    }
  },
  "sections_completed": 8,
  "total_characters": 6625,
  "artifact_id": "artifact_knowledge_capture_abc123"
}
```

### 6. Minimum Viable Gate Requirement
- **Gate Block:** At least 3 of the 8 sections must have content (minimum 50 characters each)
- Validation: Shows which sections have content and which are empty
- Error message: "Please fill in at least 3 sections (Domain Knowledge, Business Rules, User Workflows, etc.) before completing this step"
- Visual indicator: Progress circle showing sections completed / total sections

### 7. UI/UX Details
- Layout: Full-width single column, sections stacked vertically
- Each section in expandable card (starts collapsed except first section)
- Section title visible in collapsed state with character count preview
- Expand on click to reveal editor
- Visual progress indicator: "3 of 8 sections completed"
- Sticky header with step title, progress, and complete button
- Edit mode vs. view mode for completed step

### 8. Component Breakdown

#### Page Component: `app/org/[orgSlug]/project/[projectId]/helix/step/2-2/page.tsx`
```typescript
// Route handler for step 2.2
// Loads existing evidence from helix_steps
// Renders KnowledgeCapture component
// Handles form submission via POST /api/helix/steps/2-2
```

#### Component: `components/helix/KnowledgeCapture.tsx`
```typescript
interface KnowledgeCaptureState {
  sections: {
    [key: string]: {
      title: string;
      content: string;
      character_count: number;
      updated_at: string;
    }
  };
  completion_percentage: number;
  save_status: 'idle' | 'saving' | 'saved' | 'error';
  artifact_id: string | null;
}

// Features:
// - Manage 8 section editors
// - Auto-save with debounce per section
// - Character counters per section
// - Progress tracking
// - Artifact creation on completion
```

#### Component: `components/helix/KnowledgeSection.tsx`
```typescript
interface KnowledgeSectionProps {
  section_id: string;
  title: string;
  description: string;
  placeholder: string;
  content: string;
  maxCharacters: number;
  onSave: (content: string) => void;
  save_status: 'idle' | 'saving' | 'saved' | 'error';
}

// Features:
// - Render TipTap editor for section
// - Character counter
// - Auto-save trigger
// - Save status indicator
```

## File Structure
```
/app/org/[orgSlug]/project/[projectId]/helix/step/2-2/
  └── page.tsx                          (Step page wrapper)

/components/helix/
  ├── KnowledgeCapture.tsx              (Main form component)
  ├── KnowledgeSection.tsx              (Individual section with TipTap)
  ├── SectionProgressIndicator.tsx      (Progress circle/bar)
  └── KnowledgePreview.tsx              (View mode for completed step)

/lib/helix/
  ├── knowledge-sections.ts             (Section configuration)
  ├── knowledge-capture.ts              (Utility functions)
  └── artifact-helpers.ts               (Artifact creation helpers)

/api/helix/steps/
  └── 2-2/
      ├── route.ts                      (POST for saving, GET for loading)
      └── artifact.ts                   (POST for artifact creation)
```

## Dependencies

### Database
- `helix_steps` table with evidence_data jsonb column
- `artifacts` table for storing knowledge capture artifact
- `helix_stage_gates` table for gate status

### Libraries
- `@tiptap/react` - Rich text editor
- `@tiptap/extension-*` - TipTap extensions (bold, italic, lists, etc.)
- `zustand` or React context - State management
- `lodash.debounce` - Debounce utility

### API Endpoints
- `POST /api/helix/steps/2-2` - Save knowledge capture evidence
- `GET /api/helix/steps/2-2` - Load existing evidence
- `POST /api/helix/steps/2-2/artifact` - Create knowledge capture artifact

### Components
- `StepDetailView` (parent container from Epic 2)
- Toast notification system
- Modal/dialog for artifact preview

### Supabase
- Storage bucket for artifacts
- Database client for helix_steps

## Tech Stack
- **Frontend:** Next.js 16+ (App Router), TypeScript, React
- **Rich Text Editor:** TipTap with React integration
- **Styling:** Tailwind CSS v4, CSS custom properties
- **State Management:** Zustand or React Context
- **API:** Next.js API Routes
- **Database:** Supabase PostgreSQL
- **File Storage:** Supabase Storage

## Acceptance Criteria

1. **All 8 Sections Display**: Each section renders with title, description, placeholder, rich text editor, and character counter
2. **Rich Text Editing Works**: User can apply bold, italic, lists, headings, code blocks in each editor; formatting persists on save
3. **Auto-save Functions**: Changes to any section auto-save after 3-second debounce, "Saved" indicator appears briefly
4. **Character Counters**: Each section displays current character count and max (5000), prevents exceeding max, shows warning at 4500+
5. **Progress Tracking**: UI displays "X of 8 sections completed" and visual progress indicator updates as content added
6. **Minimum Gate Check**: Cannot complete step until 3+ sections have 50+ characters each; error message displays requirements
7. **Artifact Creation**: Completing step creates artifact titled "Domain Knowledge Capture" in Helix folder, contains all sections
8. **Evidence Structure**: Saved evidence_data contains all sections with timestamps, character counts, and proper jsonb structure
9. **Mobile Responsive**: Form displays properly on mobile, editors usable on touch devices, character counter visible
10. **Data Persistence**: Existing knowledge capture loads on page refresh, manual complete button triggers final save and artifact creation

## Testing Instructions

1. **Test Rich Text Editing**
   - Click into first section editor
   - Type text then apply bold, italic, underline
   - Create bulleted and numbered lists
   - Add code block
   - Verify formatting renders correctly
   - Refresh page, verify formatting persists

2. **Test Auto-save**
   - Open step 2.2
   - Type in domain_knowledge section
   - Wait 3 seconds
   - Observe "Saved" indicator
   - Refresh page
   - Verify content persists

3. **Test Character Counter**
   - Type in a section
   - Observe character count increases
   - Try to exceed 5000 characters
   - Verify input cuts off at max
   - Verify warning appears at 4500+ chars

4. **Test Progress Tracking**
   - Open empty step 2.2
   - Verify progress shows "0 of 8"
   - Add content to domain_knowledge section
   - Verify progress updates to "1 of 8"
   - Add content to 2 more sections
   - Verify progress shows "3 of 8"

5. **Test Minimum Gate Check**
   - Fill only 2 sections with content
   - Click "Complete Step" or submit button
   - Verify error message appears requiring 3+ sections
   - Add content to 3rd section
   - Verify error clears and step can complete

6. **Test Artifact Creation**
   - Complete step with all 8 sections filled
   - Verify artifact creation process starts
   - Query artifacts table, verify new artifact exists
   - Verify artifact filename format: `domain-knowledge-{projectId}-{timestamp}.md`
   - Verify artifact location in Helix/2-Documentation/ folder
   - Verify artifact content contains all sections

7. **Test Expandable Sections**
   - Open step 2.2 with existing knowledge capture
   - Verify first section expanded by default
   - Verify other sections collapsed
   - Click on collapsed section, verify expands
   - Click again, verify collapses
   - Verify content preserved when collapsing/expanding

8. **Test Offline Behavior**
   - Open step 2.2 with slow/offline network
   - Type in first section
   - Wait for auto-save attempt
   - Verify offline indicator appears
   - Verify local draft saved to localStorage
   - Reconnect network
   - Verify auto-save retries and syncs

9. **Test Placeholder and Help Text**
   - Verify each section has correct placeholder text
   - Verify placeholder disappears when user types
   - Verify help text/description matches section purpose
   - Verify placeholders are not submitted as content

10. **Test Mobile Touch Interactions**
    - Resize to mobile (375px width)
    - Tap editor field
    - Verify keyboard appears
    - Tap toolbar buttons
    - Verify formatting applies
    - Scroll through sections
    - Verify all interactive elements accessible

## Notes for AI Agent

### Implementation Guidance
- Use TipTap with `@tiptap/react` and necessary extensions
- Create section configuration in `lib/helix/knowledge-sections.ts` (array of section objects)
- Implement debounce per section, not globally (allow independent saves)
- Use React Hook Form or custom hook for editor state management
- Consider using Controlled TipTap editor (manage content from React state)

### TipTap Setup
```typescript
// Each section gets its own useEditor instance
const editor = useEditor({
  extensions: [
    StarterKit,
    BulletList,
    OrderedList,
    CodeBlock,
    Link,
  ],
  content: section.content,
  onUpdate: ({ editor }) => {
    // Trigger debounced save
    debouncedSave(sectionId, editor.getHTML());
  }
});
```

### Artifact Creation Logic
- Call `createHelixArtifact()` helper (from Phase 019)
- Convert sections HTML to clean Markdown
- Use Markdown frontmatter for metadata
- Store artifact_id in evidence_data

### Character Counting
- Count HTML characters or plain text? Decide early (recommend plain text extraction)
- Create utility: `getPlainTextCharCount(html: string): number`
- Display counter as "1,245 / 5,000" format

### Save Strategy
- Each section saves independently to prevent losing one section's work if another fails
- Merge all sections before creating artifact (final save)
- Keep track of "dirty" sections in state for progress calculation

### Styling Notes
- Use `bg-secondary` for section cards
- Use `accent-cyan` for active editor border
- Use `text-primary` for labels
- TipTap toolbar should use same design system colors
- Editor height: 200-300px when expanded

### Common Pitfalls
- Don't lose work if page accidentally closed (localStorage backup)
- Don't submit artifact until all sections saved
- Don't show "Complete Step" button until minimum 3 sections met
- Ensure TipTap instances don't interfere with each other
- Test very long content in editors for performance

### Future Enhancements
- Voice input for dictation
- Collaboration mode (real-time editing)
- Export knowledge capture as PDF
- Integration with team communication tools (Slack notification when complete)
- Knowledge review workflow (manager approval before build planning)

---

**Phase Author:** Helix Documentation Stage Design Team
**Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Ready for Implementation

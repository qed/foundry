# Phase 022: Step 3.1 — Building Brief Summary Prompt (Manual)

## Objective
Display the Building Brief Summary prompt template to the user and guide them through running the prompt in Claude Cowork to generate initial project analysis and documentation summary. Collect the Q&A session output as evidence of prompt execution.

## Prerequisites
- Steps 1.1–2.4 completed (all Stage 2 documentation artifacts collected and stored)
- User has access to Claude Cowork
- All documentation files from Stage 2 are available as context

## Epic Context (Epic 4: Build Planning & Repo Setup)
This step initiates the Build Planning phase (Stage 3), where project documentation is analyzed and converted into a structured build plan. Step 3.1 triggers the AI-assisted analysis that will inform phases 3.2 and 3.3.

## Context
After collecting extensive project documentation in Stage 2 (Requirements, Design, Technical Specs, etc.), the project needs structured analysis to extract actionable build phases. This step provides a prompt template that users can take to Claude Cowork, run interactively with their documentation as context, and return the results to the platform.

The prompt is designed to:
- Summarize the complete project vision and goals
- Identify key technical decisions and dependencies
- Extract phase boundaries and prerequisites
- Highlight risks and assumptions
- Guide the generation of the Build Plan (created in Step 3.2)

## Detailed Requirements

### 1. Building Brief Summary Prompt Template Display
Create a UI component that displays a comprehensive prompt template with clear sections:

```markdown
# BUILDING BRIEF SUMMARY PROMPT

You are analyzing project documentation to create a structured build plan.

## INSTRUCTIONS
1. Review all provided documentation artifacts (listed below)
2. Answer each question thoughtfully and completely
3. Your responses will guide the creation of project phases
4. Be specific about dependencies, risks, and prerequisites

## DOCUMENTATION ARTIFACTS PROVIDED
[DYNAMIC: Insert list of all artifacts from Stage 2]

## QUESTIONS

### 1. Project Vision & Scope
- What is the core purpose of this project?
- What problems does it solve?
- What are the primary success metrics?

### 2. Technical Foundation
- What is the tech stack? (frameworks, databases, services, languages)
- What technical constraints exist? (performance, security, scale)
- Are there legacy systems to integrate?
- What deployment environment is expected?

### 3. User Flows & Features
- What are the 3–5 most critical user flows?
- Which features are must-have (MVP)? Which are nice-to-have?
- What are the key decision points in each flow?

### 4. Data Model & Integration
- What are the main entities and relationships?
- What integrations are required? (third-party APIs, external services)
- What data transformations are needed?

### 5. Quality & Compliance
- What testing strategy is expected? (unit, integration, e2e, manual)
- Are there compliance or security requirements? (GDPR, HIPAA, SOC 2, etc.)
- What performance targets exist?

### 6. Phase Planning
- In what logical order should features be built?
- What are the hard dependencies between features?
- What are natural phase boundaries? (suggest 8–12 phases total)
- For each phase, what is the estimated scope? (small: 1–2 days, medium: 3–5 days, large: 5+ days)
- What are the success criteria for each phase?

### 7. Risks & Assumptions
- What technical risks should the team mitigate early?
- What assumptions are critical to validate?
- What could derail the project?

### 8. Team & Process
- What is the expected team size and composition?
- What development process is expected? (sprint-based, continuous, other)
- Are there known process bottlenecks or constraints?

## OUTPUT FORMAT
Provide responses in the following structure:
- Use clear headings for each section
- For lists, use bullet points or numbered lists
- For phase planning, create a simple table with columns: Phase #, Title, Scope, Dependencies, Criteria
- Keep responses concise but complete (aim for 2–3 pages)
```

### 2. Documentation Artifacts Context List
Dynamically generate a list of all artifacts uploaded in Stage 2:

```typescript
// Components: helix/BuildingSummaryPrompt.tsx
interface DocumentationArtifact {
  id: string;
  name: string;
  type: "requirements" | "design" | "technical" | "business" | "other";
  uploadedAt: string;
  size: number;
}

// Retrieve from evidence_data.stage2Artifacts
const artifacts = evidenceData.stage2Artifacts || [];

// Format as markdown list for prompt context
const artifactsList = artifacts
  .map(a => `- **${a.type}**: ${a.name} (${a.uploadedAt})`)
  .join("\n");
```

### 3. Copy Prompt Button
Implement a button that copies the entire prompt template to clipboard:

```typescript
const handleCopyPrompt = async () => {
  const promptText = generatePromptTemplate(artifacts);
  await navigator.clipboard.writeText(promptText);
  showToast("Prompt copied to clipboard. Paste into Claude Cowork.");
};
```

### 4. Copy Documentation Summary Button
Implement a button that compiles artifact names and metadata for easy copying:

```typescript
const handleCopyDocsSummary = async () => {
  const summary = `
# PROJECT DOCUMENTATION SUMMARY

Total Artifacts: ${artifacts.length}

${artifacts
  .map(a => `- [${a.name}] (${a.type}) - Uploaded ${a.uploadedAt}`)
  .join("\n")}

[Paste this in Claude Cowork along with the Building Brief Summary Prompt]
  `.trim();

  await navigator.clipboard.writeText(summary);
  showToast("Documentation summary copied.");
};
```

### 5. Instructions for Claude Cowork Workflow
Display clear, step-by-step instructions:

```
WORKFLOW:
1. Click "Copy Prompt" and "Copy Documentation Summary"
2. Open Claude Cowork in a new tab
3. Create a new session
4. Paste the Documentation Summary as initial context
5. Paste the Building Brief Summary Prompt
6. Run the prompt (respond to each question)
7. Copy the Q&A session output
8. Return here and paste/upload the results in the next step
```

### 6. Q&A Session Results Input
Provide a textarea and file upload option to accept the Q&A session output:

```typescript
// After user runs prompt in Cowork
<textarea
  placeholder="Paste the entire Q&A session output from Claude Cowork..."
  rows={20}
  onChange={(e) => setQAResults(e.target.value)}
/>

// Or upload file
<FileUpload
  accept=".txt,.md"
  onUpload={(file) => parseQAResultsFile(file)}
/>
```

### 7. Results Validation & Storage
Validate that the Q&A results contain expected sections before saving:

```typescript
const validateQAResults = (text: string): boolean => {
  const requiredSections = [
    "Project Vision",
    "Technical Foundation",
    "User Flows",
    "Data Model",
    "Quality & Compliance",
    "Phase Planning",
    "Risks & Assumptions"
  ];

  return requiredSections.some(section =>
    text.includes(section) || text.includes(section.toLowerCase())
  );
};

// Store as artifact under helix_steps.evidence_data
const storeQAResults = async (qaText: string) => {
  const artifact = await uploadArtifact({
    fileName: "Building-Brief-QA-Results.md",
    content: qaText,
    folder: "3-Build-Planning",
    stepKey: "step-3.1"
  });

  // Update evidence_data
  updateEvidenceData({
    ...evidenceData,
    step31_qa_session: {
      artifactId: artifact.id,
      timestamp: new Date().toISOString(),
      sectionCount: countSections(qaText)
    }
  });
};
```

## File Structure
```
/steps/[stepKey]/
├── page.tsx (StepDetailView for step-3.1)
├── BuildingSummaryPrompt.tsx (component displaying prompt)
├── DocumentationsList.tsx (component listing Stage 2 artifacts)
└── QAResultsUpload.tsx (component accepting Q&A output)
```

## Dependencies
- All Stage 2 documentation artifacts (from steps 2.1–2.4)
- Claude Cowork access (external, user-initiated)
- Artifact storage system (Supabase Storage)
- helix_steps table with evidence_data column

## Tech Stack
- Next.js 16+, TypeScript, Tailwind CSS v4
- Supabase (storage, database)
- React hooks (useState, useCallback)
- Clipboard API, File API

## Acceptance Criteria
1. Prompt template displays all required sections (8 sections minimum)
2. Documentation artifacts list is dynamically populated from Stage 2
3. "Copy Prompt" button successfully copies full prompt to clipboard
4. "Copy Documentation Summary" button copies artifact list to clipboard
5. Instructions for Claude Cowork workflow are clear and step-by-step
6. Q&A results textarea accepts multi-line input and file uploads
7. Q&A results validation checks for all 7 required sections
8. Validated Q&A results are stored as Artifact in "3-Build-Planning" folder
9. Evidence data correctly captures timestamp and section count
10. User can navigate away and return; Q&A results persist in evidence_data

## Testing Instructions
1. **Prompt Display**: Load step 3.1; verify all 8 sections render with proper formatting
2. **Documentation List**: With 5+ artifacts from Stage 2, verify all appear in the artifact list
3. **Copy Functions**: Click "Copy Prompt"; paste into text editor; verify completeness; repeat for "Copy Documentation Summary"
4. **Cowork Instructions**: Open instructions; follow them step-by-step; verify they lead to Q&A execution
5. **Textarea Input**: Paste full Q&A session (2–3 pages); verify text renders and persists
6. **File Upload**: Upload a .md file with Q&A results; verify parsing and display
7. **Validation**: Submit incomplete Q&A (missing sections); verify validation error; submit complete Q&A; verify acceptance
8. **Artifact Storage**: After successful submit, navigate to Artifacts panel; verify "3-Build-Planning" folder contains Q&A file
9. **Evidence Persistence**: Refresh page; verify evidence_data retains Q&A reference and timestamp
10. **Navigation**: Complete step 3.1; navigate to step 3.2; return to step 3.1; verify Q&A results still present

## Notes for AI Agent
- The prompt template is intentionally comprehensive (8 questions) to ensure thorough analysis; adjust if user feedback indicates over-length
- Q&A results are treated as semi-structured data; the next phase (3.2) parses this into formal phase files
- Do not auto-generate Build Plan files in this step; only collect the Q&A output; generation happens in Step 3.2
- If user cannot access Claude Cowork, provide alternative: they can copy prompt and run it in any Claude instance and return results
- Consider adding a "Preview Q&A Results" summary panel that shows section count and key highlights before final storage
- The artifact storage should use a consistent naming pattern for later retrieval in Steps 3.2 and 3.3

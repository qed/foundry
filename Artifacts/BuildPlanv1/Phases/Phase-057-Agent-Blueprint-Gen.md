# Phase 057 - Agent: Blueprint Generation

**Objective:** Implement agent capability to generate blueprint drafts from feature requirements and architecture context.

**Prerequisites:**
- Phase 056 (Control Room Agent infrastructure)
- Phase 051 (Feature blueprints)
- Phase 048 (Foundation blueprints)

**Context:**
Engineers can ask the Control Room Agent to generate a blueprint draft for a feature. The agent reads the feature requirements, reviews the foundation blueprints and system diagrams to understand architecture and conventions, and generates a structured blueprint draft that follows the project's template. The draft is then reviewed and edited by the engineer before approval.

**Detailed Requirements:**

1. **Blueprint Generation Trigger**
   - User command: "Generate blueprint"
   - Or natural language: "Create a blueprint for this feature"
   - Prerequisites:
     - Viewing a feature blueprint view (or feature node without blueprint)
     - Feature has requirements defined in Pattern Shop
     - Project has foundation blueprints (at least one)
   - If prerequisites not met, agent responds: "I need to be viewing a feature to generate its blueprint. Please select a feature first."

2. **Generation Context**
   - Agent receives:
     - Feature requirements (from Pattern Shop):
       - Feature name
       - Feature description
       - Feature type (user-facing feature, system feature, etc.)
       - Epic/goal it belongs to
       - User stories or acceptance criteria (if available)
     - Foundation blueprints:
       - Backend Architecture (tech stack, API design, error handling)
       - Frontend Architecture (component patterns, styling, state management)
       - Data Layer (database approach, query patterns)
       - Authentication & Security (auth method, RBAC approach)
       - Deployment & DevOps (environments, deployment process)
     - System diagrams (high-level architecture reference)
     - Related feature blueprints (for dependencies)
     - Project technology stack

3. **Generation Prompt Structure**
   - System prompt (Phase 056) defines role and capabilities
   - User prompt for generation:
     ```
     Please generate a technical blueprint for the following feature:

     Feature: [Feature Name]
     Description: [Feature Description]
     User Stories:
     [... acceptance criteria ...]

     Based on our project architecture and conventions:
     - [Backend Architecture summary]
     - [Frontend Architecture summary]
     - [Data Layer approach]
     - [Auth approach]
     - [Deployment approach]

     Please structure the blueprint with these sections:
     1. Solution Overview
     2. API Endpoints
     3. UI Components & Behavior
     4. Data Model Changes
     5. Business Logic
     6. Testing Requirements
     7. Dependencies

     For each section, provide clear, actionable details. Include code examples where helpful.
     ```

4. **Generated Blueprint Content Structure**
   - Agent generates content with clear section headings (markdown H2 or H3)
   - Each section contains:
     - Section title (matches template)
     - Detailed content relevant to section
     - Examples, code, or diagrams where appropriate
   - Format: well-formatted markdown with:
     - Numbered lists for API endpoints
     - Code blocks with language specified
     - Bullet points for component lists
     - Tables for data models (columns, types, nullable, etc.)

5. **Example Generations** (for reference)
   - **Solution Overview**:
     ```
     The User Profile Management feature allows users to update their account
     information including name, email, profile picture, and preferences. This is
     a foundational feature required by [Related Feature] and impacts the
     authentication system.

     Key benefits:
     - Users can maintain accurate profile data
     - Integration with notification preferences
     - Enables future personalization features
     ```

   - **API Endpoints**:
     ```
     1. GET /api/users/{id}/profile
        - Retrieve user profile
        - Response: { id, name, email, avatar_url, preferences }

     2. PATCH /api/users/{id}/profile
        - Update user profile
        - Request: { name?, email?, avatar_url? }
        - Response: updated profile object
     ```

   - **UI Components & Behavior**:
     ```
     1. ProfileCard component
        - Displays user name, email, avatar
        - Read-only mode by default
        - Click to edit button toggles edit mode

     2. ProfileEditForm component
        - Form with inputs for name, email
        - Avatar upload with preview
        - Save and Cancel buttons
        - Validation: email format, required fields
     ```

   - **Data Model Changes**:
     ```
     New table: user_profiles (optional, or extend users table)
     Columns:
     - user_id (UUID, FK to users)
     - avatar_url (text, nullable)
     - bio (text, nullable)
     - preferences (jsonb)
     - updated_at (timestamp)

     Index: idx_user_profiles_user_id
     ```

   - **Testing Requirements**:
     ```
     Unit Tests:
     - ProfileCard renders with user data
     - Edit mode toggle works
     - Form validation prevents invalid emails
     - Save updates profile in database

     Integration Tests:
     - GET /api/users/{id}/profile returns correct data
     - PATCH /api/users/{id}/profile updates database
     - User cannot edit other user's profile (authorization)

     Edge Cases:
     - Empty optional fields
     - Special characters in name
     - Very large avatar image
     ```

6. **Generation Process**
   - User types "Generate blueprint"
   - Agent shows: "Generating blueprint for [Feature Name]..."
   - Agent streams response (typed out progressively)
   - Generation takes 10-30 seconds typically
   - User can cancel if taking too long

7. **Post-Generation Workflow**
   - Agent response shows complete blueprint draft
   - Below response, show action buttons:
     - "Use This Draft" button
     - "Regenerate" button
     - "Edit with More Details" button
   - Clicking "Use This Draft":
     - Blueprint draft content inserted into editor
     - Blueprint status set to 'draft'
     - Blueprint saved to database
     - Editor scrolls to top
     - Success toast: "Blueprint created. Review and refine as needed."
   - Clicking "Regenerate":
     - Show prompt: "Any additional context or requirements to include?"
     - Text input for additional context
     - Re-generate with additional context
   - Clicking "Edit with More Details":
     - Prompt user for specific sections to focus on:
       - [ ] Solution Overview
       - [ ] API Endpoints
       - [ ] Data Model
       - [ ] Testing
       - [ ] Other
     - Re-generate with focus on selected sections

8. **Quality Improvements**
   - Agent checks generated content for:
     - Completeness (all sections covered)
     - Consistency with foundations
     - Following project conventions
     - Clear and actionable content
   - If generation seems incomplete, agent offers to:
     - "Expand API Endpoints section"
     - "Add more testing details"
     - "Clarify data model"

9. **Generation Limitations**
   - Agent cannot see actual codebase (Phase 056 future work: add code context)
   - Agent generation is draft only (must be reviewed and edited)
   - Generation quality depends on feature requirements clarity
   - Agent recommends: "For best results, ensure feature requirements are detailed."

10. **Error Handling**
    - If feature has no requirements: "I need detailed feature requirements to generate a blueprint. Please add requirements in the Pattern Shop first."
    - If no foundation blueprints exist: "I need your project foundations to be defined first. Please create foundation blueprints for Backend Architecture, Frontend Architecture, etc."
    - If agent times out: "Generation took too long. Please try again or generate a simpler blueprint."
    - If agent returns low-quality response: User can regenerate

11. **Metrics & Analytics**
    - Track: number of blueprints generated, regenerated, accepted
    - Track: time from generation to approval
    - Track: which sections are most edited after generation
    - Use for improving agent prompts

12. **Variant: Generate Specific Sections**
    - User can ask: "Generate just the API Endpoints section"
    - Agent generates only requested section
    - User can insert into existing blueprint

**Agent Prompt (in system context)**
```
When the user asks you to generate a blueprint, follow these steps:

1. Analyze the feature requirements carefully
2. Review the project's architecture decisions and conventions
3. Generate a structured blueprint with clear, actionable content
4. Use markdown formatting with proper headers and code blocks
5. Include examples and code samples where helpful
6. Ensure consistency with existing foundations and diagrams
7. Provide enough detail for engineering implementation
8. Flag any ambiguities or missing requirements

After generating, optionally offer follow-up options:
- "Would you like me to expand any particular section?"
- "Should I add more implementation details?"
```

**UI Components**
- `GenerateBlueprintActions` (action buttons: Use Draft, Regenerate, Edit)
- `RegenerateDialog` (modal for additional context)
- `GenerationProgress` (shows "Generating..." status)
- `GeneratedBlueprintPreview` (shows draft before saving)

**File Structure**
```
app/
  components/
    room/
      GenerateBlueprintActions.tsx
      RegenerateDialog.tsx
      GenerationProgress.tsx
  lib/
    agent/
      generation-prompt.ts (generate prompt for blueprint)
      context.ts (enhanced with generation-specific context)
```

**Acceptance Criteria**
- [ ] "Generate blueprint" command triggers generation
- [ ] Agent shows progress: "Generating blueprint for [Feature Name]..."
- [ ] Agent streams generated blueprint content
- [ ] Generated blueprint has all required sections
- [ ] Generated content includes concrete details (endpoints, components, models)
- [ ] Generated content follows project conventions (from foundations)
- [ ] "Use This Draft" button saves blueprint to database
- [ ] Blueprint status set to 'draft' on generation
- [ ] Editor populated with generated content
- [ ] Success toast shows after blueprint created
- [ ] "Regenerate" button allows user to regenerate
- [ ] "Edit with More Details" button allows focused regeneration
- [ ] Error message shows if feature has no requirements
- [ ] Error message shows if foundations missing
- [ ] User can cancel generation if taking too long
- [ ] Generated blueprint is fully editable after creation
- [ ] API endpoints section includes correct HTTP methods
- [ ] Data model section includes table schema
- [ ] Testing section includes unit and integration tests
- [ ] Code examples have language specified (TypeScript, SQL, etc.)
- [ ] Agent references foundation decisions in generation
- [ ] Related feature dependencies mentioned in generated blueprint

**Testing Instructions**
1. Navigate to feature without blueprint
2. Type "Generate blueprint" in agent chat
3. Verify agent shows "Generating blueprint..." progress
4. Verify generation completes in 30-60 seconds
5. Verify generated blueprint shows in agent response
6. Verify generated content includes all sections:
   - Solution Overview
   - API Endpoints
   - UI Components & Behavior
   - Data Model Changes
   - Business Logic
   - Testing Requirements
   - Dependencies
7. Verify API endpoints have HTTP methods (GET, POST, PATCH)
8. Verify data model shows table schema
9. Verify code examples have language specified
10. Verify generated content references foundation decisions (e.g., "using Supabase")
11. Click "Use This Draft" button
12. Verify blueprint created in database
13. Verify editor populated with generated content
14. Verify blueprint status is 'draft'
15. Verify success toast shows
16. Edit generated blueprint and verify changes save
17. Generate another blueprint and click "Regenerate"
18. Add additional context: "Include admin endpoints and batch operations"
19. Verify regenerated blueprint includes new details
20. Click "Edit with More Details" and select checkboxes for specific sections
21. Verify regeneration focuses on selected sections with more details
22. Try to generate blueprint for feature with no requirements
23. Verify error message: "I need detailed feature requirements..."
24. Test generation for different blueprint types (foundation, system diagram)
25. Cancel generation mid-stream and verify stops cleanly
26. Verify generated content is grammatically correct and technically accurate
27. Test generation for feature with complex requirements
28. Test generation for feature with minimal requirements
29. Verify all API endpoints match feature requirements
30. Verify testing suggestions cover happy path and edge cases

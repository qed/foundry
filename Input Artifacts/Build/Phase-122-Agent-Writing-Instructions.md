# Phase 122: Pattern Shop - Agent Writing Instructions

## Objective
Enable project administrators to define custom writing instructions for the Pattern Shop Agent. These instructions are injected into the agent's system prompt to customize tone, style, and requirements generation behavior.

## Prerequisites
- Phase 037: Pattern Shop - Agent Integration (basic agent setup)
- Phase 113: Organization Console (project settings management)
- Supabase auth and project context
- Pattern Shop Agent API connectivity

## Context
Different organizations have different standards for documentation, tone, and technical requirements. Some may require formal regulatory language, others prefer conversational style. Custom writing instructions allow each project to tailor the agent's output to match their organizational standards and domain-specific needs.

## Detailed Requirements

### Database Changes
- Add to `projects` table column: `agent_writing_instructions` (TEXT, nullable)
- Store instruction text (max 2000 characters)
- Track last modified: `agent_instructions_updated_at` (TIMESTAMP)

### Project Settings UI
- New section in Project Settings: "Pattern Shop Agent Configuration"
- Text area for "Custom Writing Instructions" with 2000 char limit
- Instruction placeholders/examples:
  - "Write in formal, regulatory-compliant tone"
  - "Keep descriptions concise (under 200 words)"
  - "Include security considerations for each requirement"
  - "Format all code examples in TypeScript"
- Save button with confirmation toast
- Display "Last updated: [timestamp]" below text area

### Agent Integration
- When calling Pattern Shop Agent API, include `writingInstructions` in request:
  ```json
  {
    "projectId": "...",
    "featureName": "...",
    "featureDescription": "...",
    "writingInstructions": "Write in formal tone. Include regulatory requirements."
  }
  ```
- Agent system prompt includes instructions in template:
  ```
  You are writing for project [ProjectName] with these guidelines:
  [CUSTOM_INSTRUCTIONS]

  Follow these guidelines when generating requirements...
  ```

### API Endpoint
- `PATCH /api/projects/:projectId/settings/agent-instructions`
  - Request: `{ instructions: string }`
  - Response: `{ success: boolean, updatedAt: string }`
  - Validate char limit server-side

### Validation
- Max 2000 characters
- No HTML/script injection (sanitize input)
- Warn if instructions contain sensitive data (API keys, passwords)

## File Structure
```
/app/api/projects/[projectId]/settings/agent-instructions/route.ts
/app/components/Settings/ProjectSettings/AgentInstructions.tsx
/app/lib/supabase/migrations/add-agent-instructions.sql
/app/hooks/useProjectSettings.ts (updated)
/app/lib/agents/patternShopClient.ts (updated)
```

## Acceptance Criteria
- [ ] Custom writing instructions field available in Project Settings
- [ ] Text area displays placeholder examples
- [ ] Instructions stored in projects table correctly
- [ ] Save button validates character limit (max 2000)
- [ ] Sanitization prevents XSS injection attempts
- [ ] "Last updated" timestamp displays accurately
- [ ] Instructions injected into agent prompt when generating requirements
- [ ] Agent API request includes writingInstructions field
- [ ] Multiple projects can have different instructions without cross-contamination
- [ ] Updating instructions doesn't affect existing features/blueprints
- [ ] Clearing instructions (empty field) works correctly

## Testing Instructions
1. Navigate to Project Settings > Pattern Shop Agent Configuration
2. Enter custom instruction: "Write all requirements in formal tone. Include regulatory compliance notes."
3. Click Save and verify toast confirmation
4. Verify "Last updated" timestamp appears below text area
5. In Pattern Shop, create a new feature
6. Generate a requirement using the agent
7. Verify the generated requirement follows formal tone (read output for compliance language)
8. Go back to settings, clear instructions, save
9. Generate another requirement and verify tone is standard (less formal)
10. Test with multiple projects and verify instructions don't cross-contaminate
11. Try entering >2000 characters and verify validation error appears
12. Test XSS payload in instructions field: `<script>alert('xss')</script>` - verify it's sanitized

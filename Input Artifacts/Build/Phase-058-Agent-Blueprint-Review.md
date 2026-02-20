# Phase 058 - Agent: Blueprint Review

**Objective:** Implement agent capability to review blueprints for completeness, consistency, and alignment with project standards.

**Prerequisites:**
- Phase 056 (Control Room Agent infrastructure)
- Phase 051 (Feature blueprints)
- Phase 048 (Foundation blueprints)
- Phase 054 (Blueprint status tracking)

**Context:**
The Control Room Agent can review existing blueprints to identify gaps, inconsistencies, and improvements. Engineers use this feature during the In Review phase to ensure blueprints are complete and ready for approval. The agent flags specific issues with actionable suggestions, helping teams maintain high-quality technical documentation.

**Detailed Requirements:**

1. **Blueprint Review Trigger**
   - User command: "Review this blueprint"
   - Or natural language: "Check this blueprint", "Review for completeness", "What's missing?"
   - Prerequisites:
     - Viewing a blueprint in the editor
     - Blueprint has meaningful content (at least 50 characters)
   - If no blueprint selected: "Please select a blueprint to review. I'll analyze it for completeness and consistency."

2. **Review Scope**
   - Agent reviews blueprint against:
     - **Completeness**: Are all required sections present and filled?
     - **Content Quality**: Is content clear, specific, and actionable?
     - **Consistency**: Does blueprint align with foundations and conventions?
     - **Technical Accuracy**: Are technical details correct and feasible?
     - **Alignment**: Does blueprint match feature requirements?
     - **Clarity**: Can engineers use this blueprint for implementation?

3. **Review Checklist (Generated)**
   - Agent generates checklist of items checked during review:
     - [ ] Solution Overview explains what and why
     - [ ] API endpoints have full specifications (method, path, params, response)
     - [ ] UI components clearly describe behavior and state
     - [ ] Data model changes are specific (tables, columns, constraints)
     - [ ] Business logic is detailed and actionable
     - [ ] Testing requirements cover happy path and edge cases
     - [ ] Dependencies listed and explained
     - [ ] Terminology matches project conventions
     - [ ] No contradictions with foundation blueprints
     - [ ] Feasible within project constraints

4. **Review Output Structure**
   - Overall assessment: "Good", "Needs Work", "Excellent"
   - Summary (1-2 sentences): overview of blueprint quality
   - **Issues Found** section (if any):
     - **Critical Issues** (red, must fix):
       - Missing required content
       - Conflicts with architecture decisions
       - Technical infeasibility
       - Security/compliance concerns
     - **Important Issues** (yellow, should fix):
       - Unclear or vague descriptions
       - Incomplete sections
       - Missing edge cases
       - Doesn't follow conventions
     - **Suggestions** (blue, nice to have):
       - Formatting improvements
       - Additional examples
       - Clearer wording
       - Reference other blueprints
   - Each issue includes:
     - Issue title (short, specific)
     - Description (1-2 sentences)
     - Location (section, line number if possible)
     - Suggested fix (actionable steps)
   - **Strengths** section:
     - Positive observations
     - Well-documented sections
     - Good alignment with requirements

5. **Example Review Output**
   ```
   Blueprint Review: User Authentication Feature

   Assessment: Needs Work (6/10)
   This blueprint outlines the authentication system well but lacks detail
   in API error handling and token refresh logic.

   Critical Issues:
   1. Missing API Error Responses
      Location: API Endpoints section
      Issue: Endpoints don't document error responses (401, 403, 500)
      Fix: Add error response examples for each endpoint:
           401: { error: "Unauthorized", message: "Invalid credentials" }

   2. Token Refresh Logic Unclear
      Location: Business Logic section
      Issue: How tokens are refreshed isn't documented
      Fix: Specify refresh token flow (silent refresh on expiry, etc.)

   Important Issues:
   1. Database Constraints Missing
      Location: Data Model section
      Issue: No mention of constraints or indexes
      Suggestion: Document unique constraints, foreign keys, indexes
      Example: emails table has UNIQUE constraint, INDEX on user_id

   2. Testing Missing Edge Cases
      Location: Testing Requirements section
      Suggestion: Add tests for:
      - Concurrent login attempts
      - Token expiry during request
      - Rate limiting on login endpoint

   Suggestions:
   1. Add code example for JWT payload structure
   2. Reference the Authentication & Security foundation blueprint
   3. Document how this integrates with OAuth (mentioned in dependencies)

   Strengths:
   - Clear explanation of OAuth flow
   - Good separation of concerns (auth vs. authorization)
   - Mentions related features and dependencies
   ```

6. **Review Process**
   - User types "Review this blueprint"
   - Agent shows: "Analyzing blueprint..."
   - Agent analyzes blueprint (takes 10-20 seconds)
   - Review output displays in chat
   - Action buttons appear:
     - "Apply Suggestions" button (auto-fills suggestions)
     - "Edit Manually" button (opens editor for manual edits)
     - "Request Clarification" button (asks specific questions)
     - "Mark as Ready for Review" button (if no critical issues)

7. **Apply Suggestions**
   - Clicking "Apply Suggestions":
     - Shows checkboxes for each suggestion
     - User selects which suggestions to apply
     - Agent generates updated content for selected sections
     - User can review changes before accepting
     - "Accept Changes" button merges into blueprint
   - Changes merged with human edits preserved
   - Editor focuses on changed section
   - Toast notification: "Suggestions applied. Review and save when ready."

8. **Request Clarification**
   - Clicking "Request Clarification":
     - User types question about specific issue
     - Agent provides more detailed explanation and examples
     - Agent can suggest specific wording or code
   - Conversation continues in chat
   - User can apply suggestions after clarification

9. **Review Context**
   - Agent receives:
     - Current blueprint (full content)
     - Feature requirements (what feature should do)
     - Foundation blueprints (standards and conventions)
     - System diagrams (architecture context)
     - Related feature blueprints (dependencies)
     - Project guidelines (if available)

10. **Review Triggers & Automation**
    - **Manual**: User asks "Review this blueprint"
    - **Semi-automatic**: When user tries to move blueprint to "In Review" status
      - Show prompt: "Would you like the agent to review this blueprint first?"
      - "Review Now" button runs review before status change
    - **Optional Auto-review**: On blueprint save when approaching deadline
      - Configurable per org
      - "Your blueprint may need review" notification

11. **Issue Resolution Tracking**
    - After review, agent can track if issues are resolved:
    - User edits blueprint and asks: "Have I addressed the review issues?"
    - Agent re-checks specific issues: ✓ Resolved, ✗ Still needs work
    - Reports on resolution progress
    - Helps user prepare for approval

12. **Review Standards by Blueprint Type**
    - **Foundation Blueprints**:
       - Technology choices justified
       - Principles clearly stated
       - Conventions documented
       - Constraints identified
    - **System Diagrams**:
       - Diagram syntax valid (Mermaid)
       - Components clearly labeled
       - Data flow obvious
       - Legend/legend provided if needed
    - **Feature Blueprints**:
       - All sections filled (overview, APIs, components, data, logic, testing, deps)
       - Consistency with foundations
       - Alignment with feature requirements
       - Feasibility assessment

13. **Review Metrics**
    - Track issues found per review
    - Track issue types (completeness, clarity, consistency, etc.)
    - Track improvement over time
    - Use to guide team training and best practices

14. **Agent Prompt for Review**
    - System prompt (Phase 056) defines review capability
    - Review-specific instructions:
    ```
    When asked to review a blueprint:

    1. Check completeness: Are all required sections present and substantive?
    2. Verify consistency: Does it align with project foundations and conventions?
    3. Assess clarity: Can engineers use this for implementation?
    4. Identify issues: Flag specific problems with solutions
    5. Recognize strengths: Acknowledge what's done well
    6. Prioritize: Mark issues as critical, important, or suggestions
    7. Be constructive: Provide actionable guidance, not criticism

    Format output clearly with sections and bullet points.
    Include specific, actionable suggestions for fixes.
    ```

**API Routes**
```
POST /api/agent/room/review
  Body: {
    blueprint_id: uuid,
    project_id: uuid
  }
  Returns: {
    assessment: "Good" | "Needs Work" | "Excellent",
    score: number (0-10),
    summary: string,
    critical_issues: [ { title, description, location, suggestion } ],
    important_issues: [ ... ],
    suggestions: [ ... ],
    strengths: [ ... ],
    timestamp: ISO date
  }
  (Note: Can use same endpoint as Phase 056 with command 'review_blueprint')
```

**UI Components**
- `BlueprintReviewResult` (displays review output)
- `ReviewIssueCard` (single issue with severity)
- `ReviewChecklistItem` (checklist item)
- `ApplySuggestionsDialog` (modal for applying suggestions)
- `ReviewMetrics` (shows review score and summary)

**File Structure**
```
app/
  api/
    agent/
      room/
        route.ts (POST with review command support)
  components/
    room/
      BlueprintReviewResult.tsx
      ReviewIssueCard.tsx
      ReviewChecklistItem.tsx
      ApplySuggestionsDialog.tsx
  lib/
    agent/
      review-prompt.ts (review instructions for agent)
```

**Acceptance Criteria**
- [ ] "Review this blueprint" command triggers review
- [ ] Agent shows "Analyzing blueprint..." progress
- [ ] Review completes in 20-30 seconds
- [ ] Review output shows assessment (Good/Needs Work/Excellent)
- [ ] Review shows score (0-10)
- [ ] Review shows summary of findings
- [ ] Critical issues highlighted in red
- [ ] Important issues highlighted in yellow
- [ ] Suggestions highlighted in blue
- [ ] Each issue includes title, description, location, and fix suggestion
- [ ] Strengths section acknowledges well-done areas
- [ ] "Apply Suggestions" button available if suggestions found
- [ ] Apply suggestions shows checkboxes for each suggestion
- [ ] Applying suggestions updates blueprint content
- [ ] "Request Clarification" button works (continues conversation)
- [ ] "Mark as Ready for Review" button available if no critical issues
- [ ] Review score affects blueprint status workflow
- [ ] User can continue editing after review
- [ ] Follow-up review shows progress on previously-flagged issues
- [ ] Review respects foundation blueprint standards
- [ ] Review checks alignment with feature requirements
- [ ] API endpoints review includes checking for error responses
- [ ] Data model review includes checking for constraints/indexes
- [ ] Testing review suggests edge cases

**Testing Instructions**
1. Navigate to blueprint and type "Review this blueprint"
2. Verify agent shows "Analyzing blueprint..." progress
3. Verify review completes and output displays in chat
4. Verify review includes assessment and score
5. Verify review includes critical issues (if any) in red
6. Verify review includes important issues (if any) in yellow
7. Verify review includes suggestions (if any) in blue
8. Verify each issue has title, description, location, and fix
9. Verify strengths section shows positive observations
10. Click "Apply Suggestions" button
11. Verify modal shows checkboxes for suggestions
12. Select some suggestions and click "Accept Changes"
13. Verify blueprint content updated with applied suggestions
14. Verify editor scrolls to changed section
15. Verify success toast shows
16. Edit blueprint to address critical issues
17. Ask "Have I addressed the review issues?"
18. Verify agent checks specific issues and reports progress
19. Create blueprint with incomplete sections
20. Review and verify completeness issues flagged
21. Create blueprint that conflicts with foundation
22. Review and verify consistency issue flagged
23. Create blueprint with vague content
24. Review and verify clarity issues suggested
25. Review feature blueprint missing API error responses
26. Verify error response issue flagged with suggestion
27. Review blueprint missing testing edge cases
28. Verify agent suggests specific test cases
29. Create excellent blueprint
30. Review and verify "Excellent" assessment
31. Verify score shown (8-10 for good blueprint)
32. Test "Request Clarification" button
33. Ask follow-up question about specific issue
34. Verify agent provides detailed explanation
35. Review blueprint approaching "In Review" status
36. Verify prompt offers agent review before status change
37. Click "Review Now" in prompt
38. Verify review shown before status can change
39. Review same blueprint twice, verify consistent results
40. Check review doesn't modify blueprint without user approval

# Phase 074 - Agent: Work Order Extraction from Blueprints

## Objective
Enable the Assembly Floor Agent to read blueprints, intelligently extract work orders, present structured suggestions to users, and create work orders in batch.

## Prerequisites
- Phase 046: Blueprint System (assumed exists)
- Phase 061: Assembly Floor Database Schema
- Phase 073: Assembly Floor Agent Infrastructure

## Context
Blueprints contain detailed requirements and specifications, but they exist in narrative/structured document form. The agent bridges this gap by parsing blueprints and extracting discrete, actionable work orders. This automation reduces manual entry effort and ensures work items don't slip through cracks.

## Detailed Requirements

### Agent Command
- User trigger: "Extract work orders from blueprints" or "Extract WOs from [Blueprint Name]"
- Agent recognizes command and responds with:
  1. Request for blueprint selection (if not specified)
  2. Analysis of blueprint(s)
  3. Extracted work orders list (structured)
  4. Review and approval flow

### Blueprint Selection
- If user doesn't specify blueprint:
  - Agent asks: "Which blueprints would you like me to extract from?"
  - Show dropdown/list of available blueprints
  - User selects one or more
- If user specifies by name:
  - Agent searches blueprints by name
  - Shows matching blueprints (if multiple)

### Extraction Algorithm

#### Process
1. Fetch blueprint content (full text)
2. Send blueprint + system prompt to LLM
3. LLM analyzes and extracts work orders
4. Prompt engineering to ensure structure:
   ```
   Extract all work orders from this blueprint. For each work order, provide:
   - Title (short, 3-50 words)
   - Description (detailed, 1-2 paragraphs)
   - Acceptance Criteria (numbered list of requirements)
   - Priority (Critical, High, Medium, Low - based on importance/blocking)
   - Estimated Complexity (Simple, Medium, Complex)

   Return as JSON array: [ { title, description, acceptance_criteria, priority, complexity } ]
   ```

#### Work Order Structure
```json
{
  "title": "Implement user authentication with OAuth2",
  "description": "Add OAuth2 authentication provider integration...",
  "acceptance_criteria": [
    "User can log in with OAuth2 provider",
    "Session persists across page refreshes",
    "Logout clears session"
  ],
  "priority": "High",
  "estimated_complexity": "Medium",
  "linked_blueprint_id": "uuid",
  "suggested_phase": "Backend Setup",
  "suggested_feature": "Authentication"
}
```

### Review & Approval Interface

#### Modal/Slide-over
- Title: "Review Extracted Work Orders"
- Shows list of suggested work orders
- Each card/row shows:
  - Title
  - Description (truncated, expandable)
  - Acceptance criteria count
  - Priority badge
  - Actions: ✓ Accept, ✗ Reject, ✎ Edit

#### Edit Mode
- Click "Edit" to modify work order before creation:
  - Edit title, description
  - Change priority
  - Modify acceptance criteria
  - Assign phase or feature

#### Create Work Orders
- Button: "Create X Work Orders"
- Disabled if no work orders selected
- Shows count of selected work orders
- Batch creation:
  - Creates all selected work orders in single operation
  - Shows progress
  - Confirmation with count: "Created 5 work orders"
  - Auto-dismisses modal and returns to board

### Handling Edge Cases

#### Unclear Extractions
- If LLM can't clearly extract work orders
- Show warning: "I found unclear items in the blueprint. Review manually?"
- Highlight ambiguous sections
- User can dismiss or edit

#### Duplicate Detection
- Check if extracted work orders already exist (by title similarity)
- Show warning: "Work order similar to existing: [Title]"
- User can merge, keep both, or replace

#### Missing Information
- If extraction lacks critical fields
- Show warning badge on card
- Suggest AI completion: "Generate description"
- User can auto-fill or edit manually

### Database Tracking
- Link created work orders to blueprint
- work_orders.blueprint_id = source blueprint ID
- Activity entry: "Extracted from [Blueprint Name] by [User] via Agent"
- Batch operation: single activity entry with count

## API Routes
```
POST /api/projects/[projectId]/agent/extract-work-orders
  - Extract work orders from blueprint(s)
  - Request: { blueprint_ids: ["uuid"], manual_input?: "string" }
  - Response: {
      status: "pending" | "success" | "error",
      extracted_work_orders: [ { title, description, acceptance_criteria, priority, complexity, ... } ],
      warnings: [ "Warning 1", "Warning 2" ]
    }
  - Status: 200 (extraction started, may show as streaming if using SSE)

POST /api/projects/[projectId]/work-orders/batch-create
  - Create multiple work orders at once
  - Request: {
      work_orders: [
        { title, description, acceptance_criteria, priority, phase_id, feature_node_id, blueprint_id }
      ]
    }
  - Response: {
      created_count: 5,
      created_work_orders: [ { id, title, ... } ],
      failed: []
    }
  - Status: 201

GET /api/projects/[projectId]/blueprints
  - List blueprints for project (used in selection)
  - Response: [ { id, title, status, created_at } ]
  - Status: 200
```

## UI Components

### New/Modified Components
1. **ExtractWorkOrdersModal** (`app/components/Assembly/ExtractWorkOrdersModal.tsx`)
   - Modal for extraction workflow
   - Step 1: Blueprint selection (if needed)
   - Step 2: Show extracted work orders for review
   - Step 3: Confirmation and creation

2. **BlueprintSelector** (`app/components/Assembly/BlueprintSelector.tsx`)
   - Dropdown/list of blueprints
   - Multi-select with checkboxes
   - Search by blueprint name
   - Shows blueprint status

3. **ExtractedWorkOrderCard** (`app/components/Assembly/ExtractedWorkOrderCard.tsx`)
   - Shows single extracted work order for review
   - Title, description, criteria, priority
   - Edit, Accept, Reject actions
   - Click to expand full details

4. **WorkOrderExtractReview** (`app/components/Assembly/WorkOrderExtractReview.tsx`)
   - Container for reviewing extracted work orders
   - Scrollable list of cards
   - "Create All" and "Create Selected" buttons
   - Shows count of selected

### Reused Components
- Modal (from common)
- Checkbox (from common)
- Spinner/Loading (from common)

## File Structure
```
app/
  components/
    Assembly/
      ExtractWorkOrdersModal.tsx          # Extraction workflow modal
      BlueprintSelector.tsx               # Blueprint selection
      ExtractedWorkOrderCard.tsx          # Single extracted WO review
      WorkOrderExtractReview.tsx          # Review container
  api/
    projects/
      [projectId]/
        agent/
          extract-work-orders/
            route.ts                      # POST extraction endpoint
        work-orders/
          batch-create/
            route.ts                      # POST batch create
  lib/
    agent/
      extractionPrompt.ts                 # System prompt for extraction
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useExtractWorkOrders.ts         # Hook for extraction
          useBatchCreateWorkOrders.ts     # Hook for batch creation
```

## Acceptance Criteria
- User initiates "Extract work orders from blueprints" command
- Agent shows blueprint selection UI (if multiple exist)
- User selects blueprint(s)
- Agent analyzes and extracts work orders
- Extracted work orders shown in review modal
- Each card shows: title, description, criteria, priority
- User can edit extracted work order before creation
- User can reject/remove unwanted work orders
- "Create X Work Orders" button creates batch
- Progress shown during creation
- Confirmation: "Created 5 work orders"
- Created work orders linked to source blueprint
- Activity entry tracks extraction by agent
- Duplicate warnings shown for similar existing work orders
- Warnings shown for unclear/incomplete extractions

## Testing Instructions

1. **Blueprint Selection**
   - Command: "Extract work orders from blueprints"
   - Agent asks for blueprint(s)
   - Verify blueprint dropdown shows all available blueprints
   - Select one blueprint
   - Proceed to extraction

2. **Extraction**
   - Select blueprint about "User Authentication feature"
   - Agent analyzes blueprint
   - Verify extraction completes in reasonable time (< 5s)
   - Verify extracted work orders appear in review modal

3. **Extracted Work Order Display**
   - Verify each extracted WO shows:
     - Title: "Implement OAuth2 provider"
     - Description (summary)
     - Acceptance criteria list (3-5 items)
     - Priority badge (color-coded)
     - Estimated complexity

4. **Edit Extracted Work Order**
   - Click "Edit" on extracted work order
   - Verify edit form appears
   - Modify title, description, criteria
   - Click "Save"
   - Verify changes reflected in card

5. **Reject Work Order**
   - Click "Reject" or × on extracted work order
   - Verify work order removed from list
   - Verify count updates ("4 work orders remaining")

6. **Review Modal**
   - After extraction, modal shows all extracted work orders
   - Verify list scrollable if many items
   - Verify each item distinct and readable

7. **Create Work Orders**
   - Modal shows "Create 5 Work Orders" button
   - Click button
   - Verify progress indicator shows
   - Verify creation completes
   - Verify success message: "Created 5 work orders"

8. **Verify Created Work Orders**
   - Close modal
   - Return to kanban board
   - Verify new work orders appear
   - Verify all have correct title, description, criteria, priority

9. **Blueprint Linking**
   - Open detail view of created work order
   - Verify blueprint_id is set
   - Verify can navigate to source blueprint from work order

10. **Activity Tracking**
    - Navigate to activity feed
    - Verify entry shows: "[Agent] extracted X work orders from [Blueprint]"
    - Verify timestamp

11. **Duplicate Detection**
    - Extract work orders
    - One extracted WO title matches existing WO closely
    - Verify warning shown: "Similar to existing: [Title]"
    - User can merge or keep both

12. **Multiple Blueprint Extraction**
    - Select 2 blueprints
    - Agent extracts from both
    - Verify work orders from both shown
    - Create all
    - Verify all created with correct blueprint references

13. **Error Handling**
    - Mock API error during extraction
    - Verify error message shown to user
    - Verify suggestion to try again

14. **Empty Blueprint**
    - Extract from blueprint with minimal content
    - Verify agent handles gracefully
    - Suggests manual work order creation

15. **Complex Blueprint**
    - Extract from large, detailed blueprint
    - Verify extraction completes
    - Verify work orders are well-structured and actionable
    - No overly vague or unusable titles/descriptions

16. **Agent Command Recognition**
    - User message: "Can you extract work orders?"
    - Agent recognizes intent
    - Initiates extraction workflow
    - Verify natural language understanding works

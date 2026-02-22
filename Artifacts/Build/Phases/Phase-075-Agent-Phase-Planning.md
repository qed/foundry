# Phase 075 - Agent: Phase Planning & Suggestions

## Objective
Enable the Assembly Floor Agent to analyze work orders and suggest logical phase groupings based on dependencies, priority, features, and team capacity.

## Prerequisites
- Phase 061: Assembly Floor Database Schema
- Phase 069: Phases
- Phase 073: Assembly Floor Agent Infrastructure
- Phase 074: Agent Work Order Extraction

## Context
Once work orders exist, teams must organize them into phases for execution. The agent can analyze work orders and suggest intelligent groupings that respect dependencies, group related features, and balance workload. This accelerates planning and surfaces opportunities for parallel work.

## Detailed Requirements

### Agent Command
- User trigger: "Suggest phase plan" or "Help me organize work orders into phases"
- Agent recognizes command and responds with:
  1. Analysis of current work orders
  2. Suggested phase structure
  3. Reasoning for each phase
  4. Accept/modify/apply workflow

### Analysis Factors

#### 1. Feature Grouping
- Work orders linked to same feature should be in same phase
- Work orders linked to same epic can be grouped by feature within phase
- Example: "Database Setup", "Authentication", "API Core" → 3 phases by feature

#### 2. Dependencies
- Work orders that depend on others (inferred from descriptions/titles)
- Order phases so dependencies are satisfied
- Example: "Setup DB" before "Create DB schema" before "Implement queries"
- Agent infers likely dependencies from text analysis

#### 3. Priority
- Critical items in earlier phases
- High priority grouped together
- Lower priority deferred to later phases
- Balances risk (critical items first) with efficiency

#### 4. Complexity & Capacity
- Estimate complexity per work order (Simple, Medium, Complex)
- Balance complexity in each phase (avoid all complex in first phase)
- Consider team capacity/velocity
- Suggest realistic sprint lengths

#### 5. Related Work Orders
- Work orders mentioning same components/modules
- Group by technology/domain
- Example: "Frontend" phase, "Backend" phase

### Suggestion Algorithm

#### Process
1. Fetch all work orders for project (with full details)
2. Build dependency graph (inferred from descriptions)
3. Calculate feature grouping scores
4. Score phases based on criteria (dependencies, priority, complexity, capacity)
5. Propose 3-5 alternative phase structures
6. Return top suggestion + alternatives

#### Prompt Engineering
```
Analyze these work orders and suggest phase groupings:

Work orders: [JSON list of all work orders with title, description, priority, feature, complexity]

For each suggested phase, provide:
1. Phase name
2. Work orders included (list of titles)
3. Reasoning (why these work orders belong together)
4. Estimated duration (1-4 weeks)
5. Dependencies on other phases
6. Key risks

Consider:
- Feature grouping (same feature → same phase)
- Dependencies (ordered correctly)
- Priority (critical items in early phases)
- Complexity balance (mix simple and complex tasks)
- Capacity (realistic workload per phase)

Return JSON: {
  phases: [
    {
      name: "Phase name",
      suggested_position: 0,
      work_order_titles: ["WO1", "WO2"],
      reasoning: "...",
      estimated_duration: "2 weeks",
      dependencies: ["Phase name if depends on other"],
      risks: ["Risk 1", "Risk 2"]
    }
  ],
  overall_reasoning: "Why this structure makes sense",
  critical_path: "...",
  alternatives: [ { phases: [...] } ]
}
```

### Suggestion Display

#### Modal/Slide-over
- Title: "Suggested Phase Plan"
- Shows primary suggestion with details
- Each phase card:
  - Phase name (editable)
  - Work order list (show count, clickable to see all)
  - Duration estimate
  - Reasoning/notes
  - Risks highlighted

#### Alternative Plans
- Button/tab: "Show alternatives"
- Displays 2-3 alternative phase structures
- User can switch between alternatives
- Select one to proceed

#### Phase Customization
- Edit suggested phase name
- Add/remove work orders from phases
- Reorder phases
- Rename before applying

#### Apply Plan
- Button: "Apply Suggested Plan"
- Creates all suggested phases
- Assigns work orders to phases
- Shows progress
- Confirmation: "Created X phases and assigned Y work orders"

### Handling User Input

#### Constraints
- User can specify: "Plan with 3-4 phases"
- Agent adjusts suggestion to meet constraint
- User can specify: "Group by [feature name]"
- Agent prioritizes that grouping

#### Refinement Loop
- User: "Suggest phase plan"
- Agent: Shows suggestion
- User: "Can we combine Design and API into one phase?"
- Agent: Recalculates and shows modified plan
- User: "Perfect, apply it"
- Agent: Creates phases and organizes work orders

### Database Operations
- Creates multiple phases (POST batch)
- Assigns work orders to phases
- Activity entry: "Suggested and created phase plan via Agent"
- Tracks work orders moved to phases

## API Routes
```
POST /api/projects/[projectId]/agent/suggest-phases
  - Analyze work orders and suggest phases
  - Request: { constraints?: { min_phases, max_phases, focus_feature_id } }
  - Response: {
      status: "success" | "error",
      primary_suggestion: { phases: [...], reasoning: "..." },
      alternatives: [ { phases: [...] } ]
    }
  - Status: 200

POST /api/projects/[projectId]/phases/batch-create
  - Create multiple phases at once
  - Request: { phases: [ { name, description, position } ] }
  - Response: { created_phases: [...], assigned_work_orders_count: X }
  - Status: 201

PATCH /api/projects/[projectId]/apply-phase-plan
  - Apply suggested phase plan (create phases + assign work orders)
  - Request: { suggested_phases: [ { name, work_order_ids: ["uuid"] } ] }
  - Response: { success: true, phases_created: X, work_orders_assigned: Y }
  - Status: 200
```

## UI Components

### New/Modified Components
1. **SuggestPhasePlanModal** (`app/components/Assembly/SuggestPhasePlanModal.tsx`)
   - Modal for phase planning workflow
   - Shows primary suggestion
   - Alternative suggestions in tabs/carousel
   - Confirmation before applying

2. **PhasePlanCard** (`app/components/Assembly/PhasePlanCard.tsx`)
   - Shows single phase from suggestion
   - Name (editable), work orders (list), duration, reasoning
   - Add/remove work orders buttons
   - Edit phase details

3. **WorkOrderSelectorForPhase** (`app/components/Assembly/WorkOrderSelectorForPhase.tsx`)
   - Modal to add/remove work orders from phase
   - Checkbox list of available work orders
   - Shows which are already assigned to phase

4. **PhasePlanAlternatives** (`app/components/Assembly/PhasePlanAlternatives.tsx`)
   - Tabs or carousel showing alternative suggestions
   - User can preview each alternative
   - Select one to apply

### Reused Components
- Modal (from common)
- Card (from common)
- Checkbox (from common)

## File Structure
```
app/
  components/
    Assembly/
      SuggestPhasePlanModal.tsx           # Phase plan suggestion modal
      PhasePlanCard.tsx                   # Single phase in plan
      WorkOrderSelectorForPhase.tsx       # WO assignment UI
      PhasePlanAlternatives.tsx           # Alternative suggestions
  api/
    projects/
      [projectId]/
        agent/
          suggest-phases/
            route.ts                      # POST phase suggestion endpoint
        phases/
          batch-create/
            route.ts                      # POST batch create phases
          apply-plan/
            route.ts                      # PATCH apply phase plan
  lib/
    agent/
      planningPrompt.ts                   # System prompt for phase planning
  org/[orgSlug]/
    project/[projectId]/
      floor/
        hooks/
          useSuggestPhasePlan.ts          # Hook for phase suggestions
          useApplyPhasePlan.ts            # Hook for applying plan
```

## Acceptance Criteria
- User command: "Suggest phase plan" recognized by agent
- Agent analyzes all work orders
- Suggestion modal appears with primary plan
- Shows: phase names, work orders per phase, duration, reasoning
- Alternative suggestions available (tab/carousel)
- User can edit suggested phase names
- User can add/remove work orders from phases
- "Apply Suggested Plan" button creates phases
- Work orders assigned to correct phases
- Activity entry tracks plan creation by agent
- All phases created with correct positions
- Confirmation shows count: "Created 4 phases and assigned 20 work orders"
- Alternative suggestions consider different grouping strategies

## Testing Instructions

1. **Command Recognition**
   - Type: "Suggest phase plan"
   - Verify agent recognizes intent
   - Starts phase planning workflow

2. **Analysis & Suggestion**
   - Create 15 work orders with mixed priorities, features, complexity
   - Request phase plan
   - Verify suggestion completes (< 5s)
   - Verify suggestion modal appears

3. **Primary Suggestion Display**
   - Modal shows suggested phases (e.g., 3-4 phases)
   - Each phase card shows:
     - Name (e.g., "Foundation", "Core Features")
     - List of work orders (count and expandable list)
     - Duration estimate (e.g., "2 weeks")
     - Reasoning (why items grouped together)
   - Verify all work orders assigned to some phase

4. **Work Order Distribution**
   - Verify no work order left unassigned
   - Verify work orders correctly grouped by feature/priority
   - Verify dependencies respected (prerequisite phases come first)

5. **Alternative Suggestions**
   - Click "Show alternatives" or similar
   - Verify 2-3 alternative phase plans shown
   - Each alternative has different grouping strategy
   - Can switch between alternatives
   - Descriptions explain difference

6. **Edit Phase Names**
   - Hover over phase name
   - Click to edit
   - Type new name: "Backend Setup"
   - Verify name updated in card

7. **Modify Work Order Assignment**
   - In phase card, click "Edit work orders" or similar
   - Modal opens showing available work orders
   - Uncheck some, check others
   - Verify phase work order list updates

8. **Apply Phase Plan**
   - Review suggestion and confirm it looks good
   - Click "Apply Suggested Plan"
   - Verify progress indicator shows
   - Verify phases created
   - Verify work orders assigned to phases
   - Verify success message: "Created 4 phases, assigned 20 work orders"

9. **Verify Created Phases**
   - Close modal
   - Return to Assembly Floor
   - Verify new phases in PhaseNavigation tabs
   - Verify phase names match suggestion
   - Click each phase tab
   - Verify correct work orders in each phase

10. **Verify Phase Ordering**
    - Phases appear in correct order in tabs
    - First phase (Foundation) comes before dependent phases
    - Verify position field set correctly

11. **Activity Tracking**
    - Navigate to activity feed
    - Verify entry shows: "[Agent] suggested and created phase plan"
    - Shows count of phases and work orders

12. **Constraint-Based Suggestions**
    - Command: "Suggest 4-phase plan"
    - Agent adjusts suggestion to fit 4 phases
    - Verify result has exactly 4 phases

13. **Feature-Based Grouping**
    - Command: "Suggest phases grouped by feature"
    - Agent prioritizes feature-based grouping
    - Verify related features grouped in same phase

14. **Refinement Loop**
    - Agent suggests plan
    - User: "Can we combine phases 2 and 3?"
    - Agent recalculates
    - Verify new suggestion with combined phases

15. **Complex Project**
    - Create 50 work orders with diverse features, priorities, complexity
    - Request phase plan
    - Verify suggestion is logical and balanced
    - Verify complexity distributed across phases
    - Verify critical items in early phases

16. **Error Handling**
    - Mock API error during suggestion
    - Verify error message shown
    - Option to retry

17. **Empty Project**
    - No work orders exist
    - Request phase plan
    - Agent suggests: "No work orders to plan. Would you like me to extract from blueprints?"
    - Graceful handling

18. **All Work Orders Assigned**
    - After applying plan
    - Verify 100% of work orders assigned to some phase
    - No work orders left unphased (unless user chose)

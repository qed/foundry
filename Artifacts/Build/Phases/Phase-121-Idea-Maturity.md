# Phase 121: Hall - Idea Maturity Scoring

## Objective
Implement automatic maturity scoring for ideas in the Hall based on completeness, engagement, and age. Provide visual maturity indicators and enable filtering/sorting by maturity level.

## Prerequisites
- Phase 011: Ideas Repository (schema and CRUD operations)
- Phase 023: Idea Comments & Engagement (comment functionality)
- Ideas table with metrics: views, comment_count
- User interface components for ideas list

## Context
Ideas evolve over time as they gather feedback, comments, and details. A maturity scoring system helps teams identify which ideas are well-developed and ready for advancement to features, versus those that need more refinement. This phase automates the calculation of idea maturity based on quantifiable signals.

## Detailed Requirements

### Maturity Score Calculation
- **Completeness Score (0-40 points):**
  - Description present and >100 chars: 10 points
  - 2+ tags assigned: 10 points
  - 1+ linked connections (features/blueprints/ideas): 10 points
  - Attachments or additional context: 10 points

- **Engagement Score (0-40 points):**
  - 1-5 comments: 5 points, 6-10: 10 points, 11-20: 15 points, 20+: 20 points
  - 1-10 views: 5 points, 11-50: 10 points, 51-100: 15 points, 100+: 20 points

- **Age Score (0-20 points):**
  - Created <7 days ago: 20 points (new, fresh ideas)
  - Created 7-30 days ago: 15 points
  - Created 31-90 days ago: 10 points
  - Created >90 days ago: 5 points (momentum matters)

### Maturity Tiers
- **Raw (0-33):** New ideas with minimal detail or engagement
- **Developing (34-66):** Ideas with reasonable detail and some community interest
- **Mature (67-100):** Well-defined ideas with strong engagement and completeness

### Database Changes
- Add `ideas` table column: `maturity_score` (INTEGER, default 0)
- Add column: `maturity_tier` (TEXT: 'raw' | 'developing' | 'mature')
- Add column: `maturity_updated_at` (TIMESTAMP)
- Create function: `calculate_idea_maturity()` triggered on idea/comment inserts or updates

### API Endpoint
- `GET /api/projects/:projectId/ideas?sortBy=maturity&filterTier=mature`
- Returns ideas sorted by maturity_score DESC or filtered by tier

### UI Components
- Maturity badge on idea cards: color-coded (gray for Raw, yellow for Developing, green for Mature)
- Maturity progress bar showing score breakdown (completeness vs. engagement vs. age)
- Sort dropdown in Ideas list with option "By Maturity (High to Low)"
- Filter pills for: All, Raw, Developing, Mature

### Recalculation Strategy
- Trigger recalculation on: idea update, new comment, view event
- Debounce updates (recalculate max once per 5 minutes per idea)
- Batch job: daily scheduled task to recalculate all ideas

## File Structure
```
/app/api/projects/[projectId]/ideas/maturity/route.ts
/app/components/Hall/IdeaMaturityBadge.tsx
/app/components/Hall/IdeaMaturityBar.tsx
/app/components/Hall/IdeasList.tsx (updated)
/app/lib/ideas/maturityCalculator.ts
/app/lib/supabase/migrations/add-maturity-scoring.sql
/app/hooks/useIdeaMaturity.ts
```

## Acceptance Criteria
- [ ] Maturity score calculated correctly for ideas with various completion/engagement levels
- [ ] Maturity tier (Raw/Developing/Mature) assigned based on score thresholds
- [ ] Ideas list can be sorted by maturity score (high to low)
- [ ] Ideas can be filtered by maturity tier with working filter pills
- [ ] Maturity badge displays correct color and tier label on idea cards
- [ ] Maturity progress bar visualizes score breakdown accurately
- [ ] Score recalculates automatically when idea is edited or comment added
- [ ] Recalculation is debounced (no more than once per 5 minutes per idea)
- [ ] Daily batch job executes and updates all idea scores
- [ ] Test with 20+ ideas at varying maturity levels

## Testing Instructions
1. Navigate to Hall > Ideas list
2. Create 3 new ideas with varying detail levels:
   - Idea A: Just a title, no description → should be Raw
   - Idea B: Full description, 2 tags, 3 comments → should be Developing
   - Idea C: Full description, 4+ tags, connections, 15+ comments, 50+ views → should be Mature
3. Verify maturity badges display correct tier and colors
4. Sort list by "Maturity (High to Low)" and confirm order is C, B, A
5. Add filter "Mature" and verify only Idea C displays
6. Add a comment to Idea A and verify score increases
7. Edit Idea A to add description and tags, verify tier changes
8. Wait 5+ minutes, confirm recalculation debounce works

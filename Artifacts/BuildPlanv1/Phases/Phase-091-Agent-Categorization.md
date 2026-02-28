# Phase 091 - Agent: Auto-Categorization

## Objective
Implement automatic AI-driven feedback categorization that assigns category, tags, and priority score to new submissions, with user override capability and confidence metrics.

## Prerequisites
- Phase 090: Insights Lab Agent infrastructure complete
- Phase 081: Feedback database schema with category and score fields
- Phase 086: Categorization UI components
- OpenAI API access

## Context
New feedback arrives uncategorized. Manually categorizing every piece of feedback is time-consuming at scale. The auto-categorization agent analyzes feedback content and metadata to assign appropriate categories (bug, feature request, UX issue, performance, other), apply relevant tags, and score priority (0-100). Users see the AI's confidence level and can easily override suggestions. This accelerates triage while maintaining human control over categorization decisions.

## Detailed Requirements

### Auto-Categorization Trigger
- **Timing**: Automatically on feedback submission (async background job)
- **Delay**: 1-2 seconds after creation to avoid race conditions
- **Scope**: All new feedback with status "new" and category "uncategorized"
- **Idempotency**: Only run once per feedback item

### Categorization Analysis

The agent analyzes:
1. **Content**: Full feedback text for issue type indicators
2. **Metadata**: Browser, device, page URL for context clues
3. **Submitter Info**: Name/email for pattern matching
4. **Existing Feedback**: Similar previously categorized items for consistency

### Category Assignment

**Output Structure**:
```typescript
{
  category: 'bug' | 'feature_request' | 'ux_issue' | 'performance' | 'other';
  confidence: number; // 0-100, how sure the agent is
  reasoning: string;  // Brief explanation of why this category
  suggestedTags: string[]; // Array of 1-3 suggested tags
  score: number; // 0-100 priority score
  scoreReasoning: string; // Why this priority level
}
```

### Confidence Scoring
- **High (80-100)**: Clear indicators, obvious category
  - Example: "App crashes on login" → Bug (99% confidence)
- **Medium (50-79)**: Reasonable indicators, could be 2 categories
  - Example: "Slow to load" → Performance vs UX (65% confidence)
- **Low (0-49)**: Ambiguous, could fit multiple categories
  - Example: "Not sure how to do X" → Feature Request vs UX (40% confidence)

### Category Indicators

**Bug**:
- Keywords: crash, error, broken, bug, fail, not working, won't, can't
- Confidence boost: Error message in feedback

**Feature Request**:
- Keywords: add, wish, would like, feature, option, ability
- Confidence boost: Feature doesn't exist in product

**UX Issue**:
- Keywords: confusing, unclear, hard to find, not intuitive, hard to understand
- Confidence boost: Common task, user struggled

**Performance**:
- Keywords: slow, lag, delay, hang, timeout, freeze, battery, memory
- Confidence boost: Metrics provided (seconds, percentage)

**Other**:
- Doesn't fit other categories
- Feedback about company/team/docs
- Generic praise or complaints

### Priority Scoring (0-100)

**Scoring Factors** (weighted):
- **Category Weight**:
  - Bug: +20 base
  - Performance: +15 base
  - UX Issue: +10 base
  - Feature Request: +5 base
  - Other: +0 base

- **Frequency**: +0-20 based on similar existing feedback
  - 5+ similar items: +20
  - 2-4 similar items: +10
  - 1 similar item: +5

- **Severity Indicators**: +0-20
  - User impact described: +10
  - Revenue impact mentioned: +20
  - Blocking user: +15

- **Submission Quality**: +0-10
  - Detailed description: +5
  - Contact info provided: +5

- **Recency**: -0-10
  - Old issue: -10
  - Recent issue: +0

**Score Range**:
- 0-30: Low priority (nice-to-have)
- 31-60: Medium priority (consider for next iteration)
- 61-80: High priority (should address soon)
- 81-100: Critical priority (address immediately)

### Tag Suggestions

**Default Tags**:
- Category name (e.g., "bug-critical" for critical bugs)
- Severity level if detectable (e.g., "blocking", "non-critical")
- Component/feature affected (e.g., "login", "checkout")
- User segment (e.g., "mobile", "safari")
- Release blocker status (e.g., "release-blocker")

**Tag Extraction**:
- Auto-extract component names from feedback
- Identify browser/device as tags
- Extract version numbers if mentioned
- Identify user segments (mobile users, new users, etc.)

### User Interface for Suggestions

**In Feedback Inbox**:
- Show category badge auto-assigned
- Show confidence % on badge (hover to see reasoning)
- Score visible in list item

**In Feedback Detail**:
- Show "AI-suggested" label under category
- Show confidence score with explanation
- One-click accept or override dropdown
- Show suggested tags with option to add/remove
- Show score with explanation

### Update Flow

1. **Submission**: User submits feedback via API
2. **Background Job**: 2-second delay to ensure DB commit
3. **Enrichment**: Agent analyzes content and similar items
4. **Update**: Agent updates feedback record with:
   - category (calculated)
   - tags (suggested, can be overridden)
   - score (calculated)
   - ai_suggested (metadata flag indicating auto-assignment)
5. **UI Update**: Real-time update to inbox/detail via Supabase Realtime

### Override Behavior
- **User Changes Category**:
  - Update feedback.category to new value
  - Clear ai_suggested flag
  - Keep AI tags (user can remove manually)
  - Recalculate score based on new category
- **User Changes Tags**:
  - Add/remove tags as needed
  - AI tags still marked as suggested
- **User Rejects Score**:
  - Manual score override not yet in Phase 091
  - Flag for Phase 086 enhancement

### Error Handling
- **API Failure**: Log error, continue without enrichment
- **Timeout**: Requeue job with exponential backoff
- **Rate Limit**: Respect OpenAI rate limits, queue jobs
- **Invalid Feedback**: Skip if content null or empty

## Implementation

### Database Updates

**feedback_submissions Table** (if not present):
```sql
ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS ai_suggested BOOLEAN DEFAULT false;
ALTER TABLE feedback_submissions ADD COLUMN IF NOT EXISTS categorization_reasoning TEXT;
```

### Background Job: app/lib/jobs/categorize-feedback.ts

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function categorizeFeedback(feedbackId: string) {
  const supabase = createServerComponentClient();

  try {
    // Fetch feedback
    const { data: feedback, error: fetchError } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      console.error('Failed to fetch feedback:', fetchError);
      return;
    }

    // Skip if already categorized
    if (feedback.category !== 'uncategorized') {
      return;
    }

    // Fetch similar feedback for context
    const { data: similarFeedback } = await supabase
      .from('feedback_submissions')
      .select('id, content, category, score')
      .eq('project_id', feedback.project_id)
      .neq('id', feedbackId)
      .neq('category', 'uncategorized')
      .limit(10);

    // Build context for agent
    const context = {
      feedbackContent: feedback.content,
      submitterEmail: feedback.submitter_email,
      submitterName: feedback.submitter_name,
      metadata: feedback.metadata,
      similarFeedback: similarFeedback?.slice(0, 5) || []
    };

    // Call agent
    const categorization = await callCategorizationAgent(context);

    // Update feedback with results
    const { error: updateError } = await supabase
      .from('feedback_submissions')
      .update({
        category: categorization.category,
        tags: categorization.suggestedTags,
        score: categorization.score,
        ai_suggested: true,
        categorization_reasoning: JSON.stringify({
          confidence: categorization.confidence,
          reasoning: categorization.reasoning,
          scoreReasoning: categorization.scoreReasoning
        })
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Failed to update feedback:', updateError);
      return;
    }

    // Notify via Realtime
    supabase
      .channel(`feedback:${feedbackId}`)
      .send('broadcast', {
        event: 'categorized',
        payload: categorization
      });

  } catch (error) {
    console.error('Categorization error:', error);
    // Log to error tracking, retry with backoff
  }
}

async function callCategorizationAgent(context: any) {
  const systemPrompt = `You are a feedback categorization expert. Analyze user feedback and categorize it accurately.

Return a JSON object with these fields:
- category: string (bug, feature_request, ux_issue, performance, other)
- confidence: number (0-100)
- reasoning: string (brief explanation)
- suggestedTags: string[] (1-3 tags)
- score: number (0-100 priority)
- scoreReasoning: string (why this priority)

Be precise and confident in your categorization.`;

  const userPrompt = `Categorize this feedback:

Content: ${context.feedbackContent}
Submitter: ${context.submitterName || context.submitterEmail || 'Anonymous'}
Browser: ${context.metadata?.browser || 'Unknown'}
Device: ${context.metadata?.device || 'Unknown'}

Similar categorized feedback in this project:
${context.similarFeedback
  .map(f => `- (${f.category}) "${f.content.slice(0, 100)}"`)
  .join('\n')}

Return valid JSON only.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 200
  });

  const content = response.choices[0]?.message?.content || '{}';
  const result = JSON.parse(content);

  // Validate and clamp values
  result.confidence = Math.max(0, Math.min(100, result.confidence || 50));
  result.score = Math.max(0, Math.min(100, result.score || 50));

  return result;
}
```

### Trigger: After Feedback Creation

In Phase 082 feedback API, add queue job:
```typescript
import { queue } from '@/lib/queue';

// After successful feedback insert:
await queue.add(
  'categorize-feedback',
  { feedbackId: feedback.id },
  { delay: 2000 } // 2 second delay
);
```

### UI: Show AI Suggestions

#### In Feedback Detail (_components/FeedbackDetailCategorization.tsx):

```typescript
const categoryConfig = {
  // ... existing config ...
};

interface Props {
  // ... existing props ...
  aiReasoning?: {
    confidence: number;
    reasoning: string;
    scoreReasoning: string;
  };
}

export default function FeedbackDetailCategorization({
  feedbackId,
  currentCategory,
  currentTags,
  score,
  aiReasoning
}: Props) {
  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Categorization</h3>
        {aiReasoning && (
          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            <span title={aiReasoning.reasoning}>
              AI-suggested ({aiReasoning.confidence}% confident)
            </span>
          </div>
        )}
      </div>

      {/* Category selector with confidence indicator */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Category
        </label>
        {aiReasoning && (
          <p className="text-xs text-blue-600 mb-2">
            {aiReasoning.reasoning}
          </p>
        )}
        {/* ... existing category selector ... */}
      </div>

      {/* Score with reasoning */}
      {score !== null && aiReasoning && (
        <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded">
          <p className="text-xs text-amber-900">
            <strong>Priority Score: {score}/100</strong>
          </p>
          <p className="text-xs text-amber-800 mt-1">
            {aiReasoning.scoreReasoning}
          </p>
        </div>
      )}

      {/* ... rest of component ... */}
    </div>
  );
}
```

## File Structure
```
lib/
├── jobs/
│   └── categorize-feedback.ts
├── queue.ts (job queue implementation)
└── agent/
    └── categorize.ts (agent functions)
app/
└── api/
    └── jobs/
        └── categorize/route.ts (webhook for job completion)
```

## Acceptance Criteria
- [x] Background job runs 2 seconds after feedback creation
- [x] Feedback analyzed for category, tags, and score
- [x] Category assigned with confidence score (0-100)
- [x] Tags suggested based on content analysis
- [x] Priority score calculated (0-100)
- [x] Feedback updated with ai_suggested flag
- [x] Reasoning stored for user visibility
- [x] UI shows "AI-suggested" label on categorization
- [x] Confidence percentage displayed (hover for reasoning)
- [x] User can override category without losing AI tags
- [x] Low confidence suggestions show explanation
- [x] Similar feedback considered in scoring
- [x] Error handling doesn't block feedback creation
- [x] Idempotency prevents double-categorization
- [x] Realtime updates notify UI of changes

## Testing Instructions

1. **Auto-Categorization**
   - Submit feedback via API with clear bug indicator ("App crashes")
   - Wait 2 seconds
   - Check database: category should be "bug"
   - Check score: should be > 70 for crash
   - Check tags: should include "critical" or "bug"

2. **Confidence Scoring**
   - Submit ambiguous feedback ("Could be better")
   - Check confidence: should be < 50
   - Verify reasoning explains ambiguity

3. **Tag Suggestions**
   - Submit feedback mentioning specific component ("Login form is slow")
   - Check tags: should include "login" and "performance"

4. **UI Display**
   - View feedback detail
   - Verify "AI-suggested" label appears
   - Hover over confidence % for reasoning
   - Verify score explanation displays

5. **Override**
   - View feedback with AI categorization
   - Change category manually
   - Verify ai_suggested flag clears
   - Verify tags still present

6. **Similar Feedback**
   - Submit feedback A: "App crashes on login"
   - Submit feedback B: "Login crash on startup"
   - Verify B gets same category
   - Verify B score considers A's existence

7. **Error Handling**
   - Simulate API failure
   - Verify feedback not lost
   - Verify job requeued
   - Check exponential backoff in logs

8. **Batch Testing**
   - Submit 10 feedback items
   - Verify all categorized within 20 seconds
   - Verify inbox shows categories for all

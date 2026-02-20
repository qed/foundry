# Phase 092 - Agent: Feedback Enrichment

## Objective
Implement AI-powered feedback enrichment that summarizes feedback, extracts key issues, detects duplicates, links to related items, and suggests affected features.

## Prerequisites
- Phase 090: Insights Lab Agent infrastructure
- Phase 091: Auto-categorization working
- Phase 085: Feedback detail view
- Phase 026: Feature tree available

## Context
User feedback often contains verbose, tangential information. Enrichment extracts the core issues, finds related feedback to surface duplicates, and suggests which features might be impacted. This helps teams focus on the actual user problems rather than the communication style, avoid duplicate work, and understand the scope of impact.

## Detailed Requirements

### Enrichment Analysis

Enrichment generates:
```typescript
{
  summary: string; // 1-2 sentence summary of core issue
  keyIssues: string[]; // 3-5 bullet points of main problems
  affectedComponents: string[]; // Features/pages likely impacted
  suggestedFeatures: {
    id: string;
    name: string;
    matchScore: number; // 0-100, how relevant
    matchReason: string; // Why this feature is related
  }[];
  relatedFeedback: {
    id: string;
    content: string;
    similarity: number; // 0-100, how similar
  }[];
  duplicateRisk: {
    isDuplicate: boolean;
    relatedFeedbackIds: string[];
    confidence: number;
  };
}
```

### Enrichment Triggers

1. **On Demand**: User clicks "Enrich this feedback" in detail view
2. **Auto on Submit**: Optional, runs after categorization
3. **Bulk Operation**: Apply enrichment to selected feedback items
4. **Agent Command**: "Analyze this feedback" in agent chat

### Summary Generation

**Input**: Full feedback content + metadata
**Output**: 1-2 sentence summary capturing the core problem

Examples:
- Input: "When I try to log in with Chrome on my Windows laptop, nothing happens. I click the button and it just sits there. I've tried clearing cache but still doesn't work. Maybe it's a bug in your login code?"
- Output: "Users experience login freezing in Chrome on Windows, with no error message."

### Key Issue Extraction

**Input**: Feedback content
**Output**: 3-5 bullet points of distinct problems

Example:
- "App crashes on startup"
- "No error message shown"
- "Affects Chrome browser only"
- "Clearing cache doesn't help"

### Affected Components

**Extraction Strategy**:
1. **Explicit mentions**: "login page", "checkout flow", "settings menu"
2. **Implicit references**: "I can't create an account" → auth/signup
3. **Device/browser**: "Safari" → browser compatibility
4. **Feature matching**: Link to feature tree by name similarity

**Output Format**:
```
[
  { component: "login", confidence: 0.95, reason: "explicitly mentioned" },
  { component: "auth", confidence: 0.8, reason: "signup implied" }
]
```

### Related Feedback Detection

**Similarity Scoring** (0-100):
- **Semantic**: Does content discuss same problem? (0-60 points)
  - Using embeddings or keyword overlap
  - "login crashes" vs "login freezes" = high similarity
  - "login issues" vs "checkout slow" = low similarity
- **Category Match**: Same or related category? (0-20 points)
  - Bug + Bug = +20
  - Bug + UX = +10
  - Bug + Feature = 0
- **Component Match**: Affect same area? (0-20 points)
  - Same page/feature = +20
  - Related feature = +10

**Threshold**: 60+/100 = related feedback
**Max Results**: Return top 5 related items

### Duplicate Detection

**Criteria**:
- **High Similarity** (90+%): Likely duplicate
  - Exact or near-exact copies
  - Same issue from multiple users
  - Word-for-word feedback
- **Very Similar** (80-89%): Probably duplicate
  - Same core issue, different wording
  - Different users, same problem
  - Related but distinct issues
- **Similar** (60-79%): Related, probably not duplicate
  - Overlapping but distinct problems

**Duplicate Response**:
- Flag in UI: "⚠️ This appears to be similar to [other items]"
- Not fully automated (user decides)
- Prevent accidental merges
- Suggest consolidation to user

### Feature Suggestion

**Matching Algorithm**:
1. **Keyword Match**: Feature names vs feedback content
2. **Category Alignment**:
   - "Feature request" feedback → incomplete features
   - "Bug" feedback → features with known issues
3. **Recency**: Features in active development prioritized
4. **Relevance Score**: Combination of above

**Output**:
```
[
  {
    id: "feat-123",
    name: "User Onboarding",
    matchScore: 95,
    matchReason: "Feedback discusses signup flow issue"
  },
  {
    id: "feat-456",
    name: "Authentication",
    matchScore: 75,
    matchReason: "Related to login issues mentioned"
  }
]
```

## UI Components

### Enrichment Display in Feedback Detail

#### _components/FeedbackEnrichmentSection.tsx

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { enrichFeedback } from '@/lib/supabase/feedback';

interface Enrichment {
  summary: string;
  keyIssues: string[];
  affectedComponents: string[];
  suggestedFeatures: any[];
  relatedFeedback: any[];
  duplicateRisk: {
    isDuplicate: boolean;
    relatedFeedbackIds: string[];
    confidence: number;
  };
}

interface FeedbackEnrichmentSectionProps {
  feedbackId: string;
  projectId: string;
  enrichment?: Enrichment;
}

export default function FeedbackEnrichmentSection({
  feedbackId,
  projectId,
  enrichment: initialEnrichment
}: FeedbackEnrichmentSectionProps) {
  const [enrichment, setEnrichment] = useState(initialEnrichment);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const enrichMutation = useMutation({
    mutationFn: () => enrichFeedback(feedbackId, projectId),
    onSuccess: (result) => {
      setEnrichment(result);
      queryClient.invalidateQueries({
        queryKey: ['feedback-detail', feedbackId]
      });
    }
  });

  if (!enrichment) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => enrichMutation.mutate()}
          disabled={enrichMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 text-sm font-medium disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {enrichMutation.isPending ? 'Analyzing...' : 'Enrich with AI'}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        AI Analysis
      </h3>

      {/* Duplicate Warning */}
      {enrichment.duplicateRisk.isDuplicate && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Potential Duplicate
              </p>
              <p className="text-xs text-amber-800 mt-1">
                This appears to be similar to {enrichment.duplicateRisk.relatedFeedbackIds.length} other submissions.
                {enrichment.duplicateRisk.confidence > 90 && ' Very likely a duplicate.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Summary</h4>
        <p className="text-sm text-gray-900 italic">
          {enrichment.summary}
        </p>
      </div>

      {/* Key Issues */}
      {enrichment.keyIssues.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'issues' ? null : 'issues')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900"
          >
            {expandedSection === 'issues' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Key Issues ({enrichment.keyIssues.length})
          </button>
          {expandedSection === 'issues' && (
            <ul className="mt-2 space-y-1 ml-4">
              {enrichment.keyIssues.map((issue, i) => (
                <li key={i} className="text-sm text-gray-700 before:content-['•'] before:mr-2">
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Affected Components */}
      {enrichment.affectedComponents.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Affected Components</h4>
          <div className="flex flex-wrap gap-2">
            {enrichment.affectedComponents.map(comp => (
              <span
                key={comp}
                className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
              >
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Features */}
      {enrichment.suggestedFeatures.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'features' ? null : 'features')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900"
          >
            {expandedSection === 'features' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Related Features ({enrichment.suggestedFeatures.length})
          </button>
          {expandedSection === 'features' && (
            <ul className="mt-2 space-y-1 ml-4">
              {enrichment.suggestedFeatures.map(feat => (
                <li key={feat.id} className="text-sm text-gray-700">
                  <span className="font-medium">{feat.name}</span>
                  <span className="text-gray-600 text-xs ml-2">
                    ({feat.matchScore}% match)
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    {feat.matchReason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Related Feedback */}
      {enrichment.relatedFeedback.length > 0 && (
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'related' ? null : 'related')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900"
          >
            {expandedSection === 'related' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Related Feedback ({enrichment.relatedFeedback.length})
          </button>
          {expandedSection === 'related' && (
            <ul className="mt-2 space-y-2 ml-4">
              {enrichment.relatedFeedback.map(related => (
                <li
                  key={related.id}
                  className="text-xs text-gray-700 p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <p className="text-gray-900 truncate">
                    {related.content.slice(0, 100)}...
                  </p>
                  <p className="text-gray-600 mt-1">
                    {related.similarity}% similar
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

### Agent Command Handler

#### In AgentChatPanel (Phase 090):

```typescript
// Handle enrichment command
if (userMessage.content.toLowerCase().includes('enrich')) {
  const enrichResult = await enrichFeedback(feedbackId, projectId);
  // Return enrichment in agent response format
  const enrichmentText = `
## Enrichment Analysis

**Summary:** ${enrichResult.summary}

**Key Issues:**
${enrichResult.keyIssues.map(i => `- ${i}`).join('\n')}

**Related Features:** ${enrichResult.suggestedFeatures.length} matches
${enrichResult.suggestedFeatures.slice(0, 3).map(f => `- ${f.name} (${f.matchScore}%)`).join('\n')}

**Similar Submissions:** ${enrichResult.relatedFeedback.length} found
  `;
  // Return as agent message
}
```

## Implementation: lib/agent/enrich.ts

```typescript
import { OpenAI } from 'openai';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cosine } from 'js-search'; // For similarity

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function enrichFeedback(feedbackId: string, projectId: string) {
  const supabase = createServerComponentClient();

  // Fetch feedback
  const { data: feedback } = await supabase
    .from('feedback_submissions')
    .select('*')
    .eq('id', feedbackId)
    .single();

  if (!feedback) return null;

  // Get all feedback in project for comparison
  const { data: allFeedback } = await supabase
    .from('feedback_submissions')
    .select('id, content, category, created_at')
    .eq('project_id', projectId)
    .neq('id', feedbackId)
    .limit(100);

  // Get feature tree
  const { data: features } = await supabase
    .from('feature_nodes')
    .select('id, name, type, description')
    .eq('project_id', projectId)
    .limit(50);

  // Call enrichment agent
  const enrichmentResult = await callEnrichmentAgent(
    feedback,
    allFeedback || [],
    features || []
  );

  // Store enrichment
  await supabase
    .from('feedback_submissions')
    .update({
      enrichment: enrichmentResult
    })
    .eq('id', feedbackId);

  return enrichmentResult;
}

async function callEnrichmentAgent(
  feedback: any,
  allFeedback: any[],
  features: any[]
) {
  const systemPrompt = `You are a feedback analysis expert. Analyze user feedback and extract:
1. A clear 1-2 sentence summary of the core issue
2. 3-5 key problems identified
3. Affected components/features
4. Duplicate likelihood assessment

Return valid JSON with fields: summary, keyIssues (string[]), affectedComponents, duplicateRisk`;

  const userPrompt = `Analyze this feedback:

Content: ${feedback.content}
Category: ${feedback.category}
Submitter: ${feedback.submitter_email || feedback.submitter_name || 'Anonymous'}

Related features in project:
${features.slice(0, 10).map(f => `- ${f.name}`).join('\n')}

Return JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.5,
    max_tokens: 400
  });

  let result = JSON.parse(response.choices[0]?.message?.content || '{}');

  // Find related feedback using similarity
  const embeddings = await getEmbeddings([feedback.content, ...allFeedback.map(f => f.content)]);
  const relatedFeedback = findSimilarFeedback(
    embeddings[0],
    embeddings.slice(1),
    allFeedback,
    75 // similarity threshold
  );

  result.relatedFeedback = relatedFeedback;

  // Match suggested features
  result.suggestedFeatures = matchFeatures(feedback.content, features, result.affectedComponents);

  // Assess duplicate risk
  const highSimilarCount = relatedFeedback.filter(f => f.similarity > 90).length;
  result.duplicateRisk = {
    isDuplicate: highSimilarCount > 0,
    relatedFeedbackIds: relatedFeedback.map(f => f.id),
    confidence: highSimilarCount > 0 ? 95 : 30
  };

  return result;
}

function findSimilarFeedback(
  sourceEmbedding: number[],
  otherEmbeddings: number[][],
  allFeedback: any[],
  threshold: number
) {
  return otherEmbeddings
    .map((emb, idx) => ({
      id: allFeedback[idx].id,
      content: allFeedback[idx].content,
      similarity: calculateCosineSimilarity(sourceEmbedding, emb)
    }))
    .filter(f => f.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

function matchFeatures(content: string, features: any[], components: string[]) {
  // Simple keyword matching for MVP
  return features
    .map(feat => ({
      id: feat.id,
      name: feat.name,
      matchScore: calculateMatchScore(content, feat.name, feat.description),
      matchReason: `Matches keyword "${feat.name}" or related concept`
    }))
    .filter(f => f.matchScore > 50)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}
```

## Acceptance Criteria
- [x] "Enrich with AI" button visible in feedback detail
- [x] Clicking button triggers enrichment process
- [x] Enrichment summary displays in clear format
- [x] Key issues extracted and listed
- [x] Affected components identified and tagged
- [x] Related features suggested with match scores
- [x] Related feedback items shown (up to 5)
- [x] Duplicate detection identifies similar submissions
- [x] Duplicate warning displayed prominently
- [x] Enrichment stored in database
- [x] Agent can trigger enrichment via "enrich" command
- [x] Results update in real-time

## Testing Instructions

1. **Enrichment Trigger**
   - Open feedback detail
   - Click "Enrich with AI"
   - Verify loading state
   - Verify results display

2. **Summary Quality**
   - Verify summary is 1-2 sentences
   - Verify it captures core problem
   - Verify it's distinct from original content

3. **Key Issues**
   - Verify 3-5 issues extracted
   - Verify each issue is a distinct problem
   - Verify issues are specific (not generic)

4. **Affected Components**
   - Feedback mentioning "login page"
   - Verify "login" appears in components
   - Verify other unrelated components not included

5. **Feature Matching**
   - Feedback about slow checkout
   - Verify "Checkout" feature suggested
   - Verify match score > 70
   - Verify reason explains match

6. **Related Feedback**
   - Multiple similar feedback items exist
   - Enrich one item
   - Verify similar items appear in Related
   - Verify similarity scores reasonable (75-99%)

7. **Duplicate Detection**
   - Two near-identical feedback items
   - Enrich one
   - Verify duplicate warning appears
   - Verify confidence > 90%

8. **Agent Command**
   - In agent chat, say "Enrich this"
   - Verify enrichment results returned as agent message
   - Verify formatted nicely with headers

9. **Storage**
   - Enrich feedback
   - Refresh page
   - Verify enrichment still displays
   - Verify stored in database

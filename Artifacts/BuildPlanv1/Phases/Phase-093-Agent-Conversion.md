# Phase 093 - Agent: Conversion Suggestions

## Objective
Implement AI-powered recommendations for converting feedback into work orders or features, with prioritization based on frequency, severity, and team capacity.

## Prerequisites
- Phase 090: Insights Lab Agent infrastructure
- Phase 088: Convert feedback to work order
- Phase 089: Convert feedback to feature
- Phase 091: Auto-categorization with scoring

## Context
Teams struggle with prioritization: Which feedback should become work orders? Which as features? The AI agent analyzes patterns across all feedback to recommend conversions. It considers frequency (how many users report this?), severity (how critical is it?), and alignment with roadmap (does it fit current priorities?). The agent presents ranked recommendations with reasoning, letting teams make informed decisions at scale.

## Detailed Requirements

### Conversion Recommendation Engine

**Analysis Performed**:
1. **Frequency Analysis**: How many similar feedback items?
2. **Severity Assessment**: Impact level based on category and user reports
3. **Cluster Detection**: Group similar issues for bulk handling
4. **Trend Analysis**: Is this newly emerging or long-standing?
5. **Roadmap Alignment**: Does this fit planned features?
6. **Duplicate Analysis**: Which feedback items represent same problem?

### Recommendation Output

```typescript
{
  recommendations: Array<{
    type: 'work_order' | 'feature' | 'monitor'; // recommended action
    feedbackIds: string[]; // feedback items involved
    title: string; // suggested title
    description: string; // suggested description
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'xs' | 's' | 'm' | 'l' | 'xl'; // estimated effort
    impact: number; // 0-100, user impact score
    frequency: number; // how many users affected
    similarityGroup: string[]; // cluster of similar issues
    reasoning: string; // why this recommendation
    suggestedParent?: string; // for features, suggested parent epic
  }>;
  trends: Array<{
    category: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    volumeThisWeek: number;
    volumeLastWeek: number;
  }>;
  summary: string; // overall summary
}
```

### Agent Commands

Commands users can invoke in agent chat:

1. **"What should we prioritize?"**
   - Returns top 3-5 conversion recommendations
   - Ranked by impact and frequency
   - Ready-to-convert format

2. **"Which feedback should become work orders?"**
   - Filters recommendations to work orders only
   - Sorts by severity and frequency
   - Includes critical/high priority items

3. **"Find duplicate issues"**
   - Returns grouped feedback by similarity
   - Shows which can be consolidated
   - Suggests merging similar reports

4. **"What's trending in feedback?"**
   - Shows emerging patterns
   - Identifies new issues rising in frequency
   - Highlights unaddressed common requests

5. **"Suggest features from feedback"**
   - Recommends feature conversions
   - Groups related feature requests
   - Suggests parent features/epics

6. **"Analyze [category] feedback"**
   - Deep analysis of specific category (bugs, feature requests, etc.)
   - Common themes within category
   - Priority recommendations for category

### Priority Scoring Algorithm

**Factors** (weighted):
- **Frequency**: 40% weight
  - 10+ users: 100 points
  - 5-9 users: 75 points
  - 2-4 users: 50 points
  - 1 user: 25 points

- **Category Weight**: 30% weight
  - Bug: 100
  - Performance: 90
  - UX Issue: 60
  - Feature Request: 40
  - Other: 10

- **Severity Indicators**: 20% weight
  - Critical blocker: 100
  - Blocks workflow: 75
  - Workaround available: 50
  - Minor issue: 25

- **Trend**: 10% weight
  - Rapidly increasing: +25
  - Stable: 0
  - Decreasing: -10

**Final Priority**:
- 80+: Critical
- 60-79: High
- 40-59: Medium
- 0-39: Low

### Effort Estimation

Simple heuristic based on category and complexity:
- **Bug Fixes**: XS-S (simple fixes) to L (complex reproduction)
- **UX Improvements**: S-M
- **Feature Requests**: M-L
- **Performance**: M-XL (depends on root cause)

### Clustering Algorithm

Groups similar feedback items by:
1. **Semantic Similarity**: Using embeddings or keyword matching
2. **Component Overlap**: Same feature/page mentioned
3. **Category Match**: Same category
4. **Temporal Proximity**: Similar submission dates

**Cluster Representation**:
- Representative feedback item (most detailed)
- Count of items in cluster
- Similarity range (min-max)

### Trend Detection

Compares feedback volume:
- **This Week** vs **Last Week**
- Identifies growing categories
- Flags emerging issues
- Highlights declining problems (resolved)

## Agent Commands Implementation

### Command: "What should we prioritize?"

```typescript
const handlePrioritizeCommand = async (projectId: string, context: any) => {
  // Get all feedback
  const allFeedback = context.feedback;

  // Analyze patterns
  const clusters = clusterSimilarFeedback(allFeedback);

  // Score each cluster
  const scored = clusters.map(cluster => ({
    ...cluster,
    score: calculatePriorityScore(cluster),
    impact: calculateImpact(cluster),
    recommendation: recommendConversion(cluster)
  }));

  // Sort by score
  const topRecommendations = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Format response
  return `
## Top Priorities

Based on ${allFeedback.length} feedback items, here are your top 5 priorities:

${topRecommendations.map((rec, i) => `
### ${i + 1}. ${rec.recommendation.title}
**Priority:** ${rec.recommendation.priority} | **Impact:** ${rec.impact}/100
**Affects:** ${rec.feedbackIds.length} users
**Type:** ${rec.recommendation.type}

${rec.recommendation.reasoning}

_Recommended action: ${rec.recommendation.type === 'work_order' ? 'Convert to Work Order' : 'Add to Roadmap'}_
`).join('\n')}

Would you like me to help convert any of these to work orders or features?
  `;
};
```

### Command: "Find duplicate issues"

```typescript
const handleDuplicateCommand = async (projectId: string, context: any) => {
  const allFeedback = context.feedback;

  // Find clusters of very similar items (90%+ similarity)
  const duplicateClusters = findDuplicates(allFeedback, 0.9);

  return `
## Potential Duplicates Found

Found ${duplicateClusters.length} groups of similar feedback:

${duplicateClusters.map((cluster, i) => `
### Group ${i + 1}: ${cluster.representativeTitle}
**Similarity:** ${cluster.similarityRange.min}-${cluster.similarityRange.max}%
**Count:** ${cluster.feedbackIds.length} submissions

${cluster.feedbackIds.slice(0, 3).map(id =>
  `- "${allFeedback.find(f => f.id === id).content.slice(0, 60)}..."`
).join('\n')}

_Suggested action: Consolidate these feedback items to reduce duplication._
  `).join('\n')}
  `;
};
```

### Command: "What's trending?"

```typescript
const handleTrendingCommand = async (projectId: string, context: any) => {
  const trends = analyzeTrends(context.feedback);

  const increasingTrends = trends.filter(t => t.trend === 'increasing');
  const decreasingTrends = trends.filter(t => t.trend === 'decreasing');

  return `
## Feedback Trends

### 📈 Rising Issues
${increasingTrends.map(t =>
  `- **${t.category}:** ${t.volumeThisWeek} this week (↑${t.volumeThisWeek - t.volumeLastWeek} from last week)`
).join('\n')}

### 📉 Declining Issues
${decreasingTrends.map(t =>
  `- **${t.category}:** ${t.volumeThisWeek} this week (↓${t.volumeLastWeek - t.volumeThisWeek} from last week)`
).join('\n')}

The most urgent emerging pattern is [most increasing category]. Consider prioritizing this category.
  `;
};
```

## UI Integration

### Recommendations Display in Agent Chat

```typescript
// In AgentChatPanel, format recommendations as structured output

const formatRecommendations = (recommendations: any[]) => {
  return recommendations.map(rec => `
## ${rec.title}

- **Type:** ${rec.type}
- **Priority:** ${rec.priority}
- **Users Affected:** ${rec.frequency}
- **Estimated Effort:** ${rec.effort}

${rec.reasoning}

[Convert to Work Order](#) | [Add to Feature Roadmap](#) | [View Similar Feedback](#)
  `).join('\n---\n');
};
```

### Batch Actions

Allow users to act on agent recommendations:
```typescript
// Batch convert top 5 recommendations to work orders
const handleConvertTopRecommendations = async (projectId: string) => {
  const recommendations = await getAgentRecommendations(projectId);
  const topFive = recommendations.slice(0, 5);

  for (const rec of topFive) {
    if (rec.recommendation.type === 'work_order') {
      await convertFeedbackToWorkOrder(rec.feedbackIds[0], {
        title: rec.recommendation.title,
        description: rec.recommendation.description,
        priority: rec.recommendation.priority,
        // ... other fields
      });
    }
  }
};
```

## Implementation: lib/agent/recommend.ts

```typescript
import { OpenAI } from 'openai';

export async function getConversionRecommendations(
  projectId: string,
  context: any
) {
  // Cluster similar feedback
  const clusters = clusterFeedbackByContent(context.feedback);

  // Score clusters
  const scored = clusters.map(cluster => ({
    ...cluster,
    score: calculateClusterScore(cluster),
    recommendation: generateRecommendation(cluster, context.features, context.workOrders)
  }));

  // Analyze trends
  const trends = analyzeFeedbackTrends(context.feedback);

  // Call agent to generate summary and detailed recommendations
  const agentSummary = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a product prioritization expert. Analyze feedback clusters and provide
        conversion recommendations. Consider frequency, severity, trend, and team capacity.`
      },
      {
        role: 'user',
        content: `
        Analyze these ${clusters.length} feedback clusters and provide conversion recommendations:

        ${scored.slice(0, 10).map(s => `
        - ${s.recommendation.title}: ${s.feedbackIds.length} users, score ${s.score}/100
        `).join('\n')}

        Trends: ${trends.map(t => `${t.category} is ${t.trend}`).join('; ')}
        `
      }
    ],
    max_tokens: 500
  });

  return {
    recommendations: scored.map(s => s.recommendation),
    trends,
    summary: agentSummary.choices[0].message.content
  };
}

function clusterFeedbackByContent(feedback: any[]) {
  // Group by semantic similarity, component, and category
  // Return array of clusters
}

function calculateClusterScore(cluster: any): number {
  const frequencyScore = cluster.feedbackIds.length * 10; // 10 points per user
  const categoryBoost = getCategoryWeight(cluster.category);
  const trendBoost = calculateTrendBoost(cluster);

  return Math.min(100, frequencyScore + categoryBoost + trendBoost);
}

function generateRecommendation(
  cluster: any,
  features: any[],
  workOrders: any[]
): any {
  const { category, feedbackIds, content } = cluster;

  // Determine type: work order or feature
  let type = 'monitor';
  if (category === 'bug' || category === 'performance') {
    type = 'work_order';
  } else if (category === 'feature_request') {
    type = 'feature';
  }

  return {
    type,
    feedbackIds,
    title: extractTitle(content),
    description: extractDescription(content),
    priority: calculatePriority(cluster),
    effort: estimateEffort(cluster),
    impact: calculateImpact(cluster),
    frequency: feedbackIds.length,
    reasoning: generateReasoning(cluster),
    suggestedParent: findBestParent(content, features)
  };
}
```

## Acceptance Criteria
- [x] Agent responds to "What should we prioritize?" command
- [x] Returns ranked recommendations with priority
- [x] Includes conversion type (work order vs feature)
- [x] Shows frequency (how many users affected)
- [x] Shows reasoning for recommendation
- [x] "Find duplicates" command identifies similar feedback
- [x] "What's trending?" shows rising/declining categories
- [x] Recommendations include estimated effort
- [x] Recommendations formatted for easy action
- [x] Batch convert recommendations to work orders
- [x] Batch add recommendations to roadmap
- [x] Trend data shows this week vs last week
- [x] Clustering groups similar feedback

## Testing Instructions

1. **Prioritization Command**
   - Chat: "What should we prioritize?"
   - Verify top 5 recommendations returned
   - Verify ranked by impact/frequency
   - Verify reasoning explains recommendation

2. **Bug vs Feature Logic**
   - Create feedback with bug keywords
   - Agent should recommend "Convert to Work Order"
   - Create feature request feedback
   - Agent should recommend "Add to Roadmap"

3. **Duplicate Detection**
   - Create 3 near-identical feedback items
   - Chat: "Find duplicate issues"
   - Verify grouped together
   - Verify similarity scores show 85-99%

4. **Trending Analysis**
   - Submit 5 bugs this week, 1 last week
   - Chat: "What's trending?"
   - Verify bugs show as increasing trend
   - Verify volume numbers correct

5. **Frequency Consideration**
   - Create 10 feedback items for bug A
   - Create 1 feedback item for bug B
   - Verify bug A ranked higher
   - Verify frequency shown correctly

6. **Priority Scoring**
   - Bug affecting 5 users > Feature affecting 2 users
   - Verify bug recommendation appears first

7. **Effort Estimation**
   - Simple bug should show "XS" or "S"
   - Complex feature should show "L" or "XL"

8. **Batch Actions**
   - Get recommendations
   - Click "Convert all to Work Orders"
   - Verify multiple work orders created
   - Verify all from top recommendations

9. **Roadmap Integration**
   - Get recommendations
   - Click "Add to Roadmap"
   - Verify feature created in tree
   - Verify in recommended parent epic

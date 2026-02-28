# Phase 079 — Knowledge Extraction Interview
## Objective
Implement an AI-driven structured interview system that conducts interactive conversations to capture domain knowledge. Interviews adapt based on project type and brief, covering domain fundamentals, business rules, edge cases, workflows, constraints, and success criteria.

## Prerequisites
- Phase 001 — Project Brief Capture — Project type and description available
- Phase 074 — Documentation Upload Interface — Context from uploaded documents

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 79 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Not all project knowledge exists in uploaded documents. Teams often have tacit knowledge about business rules, edge cases, preferences, and constraints that aren't yet documented. This phase implements an interactive interview system where Claude asks context-adapted questions to extract and capture this knowledge.

The interview adapts its questions based on the project type (e-commerce, SaaS, mobile app, etc.) and what's already known from the brief and uploads. It covers domain fundamentals, business workflows, edge cases, technical constraints, success criteria, and risks. The extracted knowledge feeds into documentation completeness scoring and verification gates.

---
## Detailed Requirements

### 1. Adaptive Interview Service
#### File: `lib/helix/documentation/knowledge-interview.ts` (NEW)
Implement AI-driven adaptive interview logic:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface InterviewQuestion {
  id: string;
  category:
    | "domain"
    | "business_rules"
    | "edge_cases"
    | "workflows"
    | "preferences"
    | "constraints"
    | "success_criteria"
    | "risks";
  question: string;
  context: string;
  followUpQuestions: string[];
}

export interface InterviewResponse {
  questionId: string;
  answer: string;
  confidence: "clear" | "partial" | "unclear";
  suggestedFollowUp?: string;
}

export interface KnowledgeExtraction {
  projectId: string;
  startedAt: string;
  completedAt?: string;
  totalQuestionsAsked: number;
  categoryBreakdown: Record<string, number>;
  extractedKnowledge: {
    category: string;
    insights: string[];
    evidence: string[];
  }[];
  identifiedRisks: string[];
  assumptionsMade: string[];
  documentationRecommendations: string[];
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function generateAdaptiveInterviewQuestions(
  projectContext: {
    name: string;
    type: string;
    description: string;
    techStack: string[];
  },
  existingDocumentation: { title: string; summary: string }[],
  previousAnswers: InterviewResponse[]
): Promise<InterviewQuestion[]> {
  const docSummary = existingDocumentation
    .map((doc) => `- ${doc.title}: ${doc.summary}`)
    .join("\n");

  const answersSummary = previousAnswers
    .map((ans) => `Q: ${ans.questionId}\nA: ${ans.answer}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Generate 5 adaptive interview questions for this project. Choose categories we haven't fully explored yet.

Project Type: ${projectContext.type}
Project Name: ${projectContext.name}
Description: ${projectContext.description}
Tech Stack: ${projectContext.techStack.join(", ")}

Existing Documentation:
${docSummary || "None yet"}

Previous Interview Answers:
${answersSummary || "No previous answers"}

Generate questions that:
1. Build on what we already know
2. Explore gaps in the existing documentation
3. Capture tacit knowledge not yet documented
4. Adapt to the project type
5. Are open-ended to encourage detailed responses

Respond in JSON:
{
  "questions": [
    {
      "id": "q_domain_001",
      "category": "domain",
      "question": "What are the core business concepts that power this system?",
      "context": "Understanding domain terminology will help ensure documentation uses consistent language.",
      "followUpQuestions": ["Can you give an example of...?", "How does...?"]
    }
  ]
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const questionData = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };

  return (questionData.questions || []) as InterviewQuestion[];
}

export async function conductInterviewConversation(
  userResponse: string,
  currentQuestion: InterviewQuestion,
  projectContext: any
): Promise<{ nextQuestion?: InterviewQuestion; insights: string[] }> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are interviewing a project stakeholder to extract domain knowledge.

Current Question: ${currentQuestion.question}
Context: ${currentQuestion.context}

User's Response: "${userResponse}"

Based on this response:
1. Extract key insights and knowledge
2. Identify gaps or unclear points
3. Determine if a follow-up question is needed
4. Rate the response clarity (clear/partial/unclear)

Respond in JSON:
{
  "insights": ["Insight 1", "Insight 2"],
  "clarity": "clear",
  "followUpNeeded": true,
  "followUpQuestion": "Can you elaborate on...?",
  "suggestedNextCategory": "edge_cases"
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    insights: analysisData.insights || [],
    nextQuestion: analysisData.followUpNeeded
      ? {
          id: `follow_up_${Date.now()}`,
          category: analysisData.suggestedNextCategory || "constraints",
          question: analysisData.followUpQuestion || "",
          context: "Follow-up to previous response",
          followUpQuestions: [],
        }
      : undefined,
  };
}

export async function synthesizeInterviewFindings(
  allResponses: Array<{
    question: InterviewQuestion;
    answer: string;
  }>,
  projectContext: any
): Promise<KnowledgeExtraction> {
  const responsesSummary = allResponses
    .map((r) => `[${r.question.category}] ${r.question.question}\nA: ${r.answer}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Synthesize these interview responses into structured knowledge extraction.

Interview Responses:
${responsesSummary}

Extract and organize:
1. Key insights by category (domain, business rules, workflows, etc.)
2. Identified risks or concerns
3. Assumptions made by the team
4. Documentation recommendations to capture this knowledge

Respond in JSON:
{
  "extractedKnowledge": [
    {
      "category": "business_rules",
      "insights": ["Rule 1", "Rule 2"],
      "evidence": ["Response that supports this"]
    }
  ],
  "identifiedRisks": ["Risk 1", "Risk 2"],
  "assumptionsMade": ["Assumption 1"],
  "documentationRecommendations": ["Create domain model doc", "Document business rules"]
}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const synthesisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    projectId: projectContext.name,
    startedAt: new Date().toISOString(),
    totalQuestionsAsked: allResponses.length,
    categoryBreakdown: allResponses.reduce(
      (acc, r) => {
        acc[r.question.category] = (acc[r.question.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    extractedKnowledge: synthesisData.extractedKnowledge || [],
    identifiedRisks: synthesisData.identifiedRisks || [],
    assumptionsMade: synthesisData.assumptionsMade || [],
    documentationRecommendations:
      synthesisData.documentationRecommendations || [],
  };
}

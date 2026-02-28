# Phase 066 — Ask User Questions Module

## Objective
Implement structured question component with single/multi-select options and free-text answers, following Cowork's AskUserQuestion pattern for interactive build planning.

## Prerequisites
- Phase 063 — Build Planning Chat Interface — chat interface ready

## Epic Context
**Epic:** 8 — In-App Build Planning
**Phase:** 066 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Rather than asking questions in plain chat text, Claude can send structured questions with predefined options (multiple choice) alongside free-text fields. This phase implements an interactive question component that renders questions as cards with option buttons and text inputs, allowing users to quickly answer without typing from scratch.

---

## Detailed Requirements

### 1. Question Component
#### File: `components/helix/chat/AskUserQuestions.tsx` (NEW)
Interactive question card with options and inputs.

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'single-select' | 'multi-select' | 'free-text' | 'mixed';
  options?: QuestionOption[];
  placeholder?: string;
  required?: boolean;
}

export interface QuestionResponse {
  questionId: string;
  selectedOptions?: string[];
  freeText?: string;
}

interface AskUserQuestionsProps {
  questions: Question[];
  onSubmit: (responses: QuestionResponse[]) => void;
  isLoading?: boolean;
}

export function AskUserQuestions({
  questions,
  onSubmit,
  isLoading = false,
}: AskUserQuestionsProps) {
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>(
    questions.reduce(
      (acc, q) => ({
        ...acc,
        [q.id]: {
          questionId: q.id,
          selectedOptions: q.type === 'multi-select' ? [] : undefined,
          freeText: '',
        },
      }),
      {}
    )
  );

  const handleSelectOption = (questionId: string, option: string) => {
    setResponses((prev) => {
      const q = questions.find((q) => q.id === questionId)!;
      if (q.type === 'single-select') {
        return {
          ...prev,
          [questionId]: {
            ...prev[questionId],
            selectedOptions: [option],
          },
        };
      } else if (q.type === 'multi-select') {
        const selected = prev[questionId].selectedOptions || [];
        const updated = selected.includes(option)
          ? selected.filter((s) => s !== option)
          : [...selected, option];
        return {
          ...prev,
          [questionId]: {
            ...prev[questionId],
            selectedOptions: updated,
          },
        };
      }
      return prev;
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        freeText: text,
      },
    }));
  };

  const handleSubmit = () => {
    const allResponses = Object.values(responses);
    const allAnswered = questions.every((q) => {
      const resp = responses[q.id];
      if (q.type === 'free-text' || q.type === 'mixed') {
        return !q.required || resp.freeText?.trim();
      }
      return resp.selectedOptions && resp.selectedOptions.length > 0;
    });

    if (!allAnswered) {
      alert('Please answer all required questions');
      return;
    }

    onSubmit(allResponses);
  };

  return (
    <div className="space-y-6 bg-white rounded-lg border border-slate-200 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Questions
        </h2>
        <p className="text-sm text-slate-600">
          Please answer the following questions to help me plan your build.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className="border border-slate-200 rounded-lg p-4 space-y-3"
          >
            <h3 className="font-medium text-slate-900">
              {question.text}
              {question.required && <span className="text-red-600 ml-1">*</span>}
            </h3>

            {/* Single Select */}
            {question.type === 'single-select' && question.options && (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={
                        responses[question.id].selectedOptions?.[0] === option.value
                      }
                      onChange={() => handleSelectOption(question.id, option.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {option.label}
                      </p>
                      {option.description && (
                        <p className="text-xs text-slate-600">{option.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Multi Select */}
            {question.type === 'multi-select' && question.options && (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={responses[question.id].selectedOptions?.includes(
                        option.value
                      )}
                      onChange={() => handleSelectOption(question.id, option.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {option.label}
                      </p>
                      {option.description && (
                        <p className="text-xs text-slate-600">{option.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Free Text */}
            {question.type === 'free-text' && (
              <textarea
                value={responses[question.id].freeText || ''}
                onChange={(e) => handleTextChange(question.id, e.target.value)}
                placeholder={question.placeholder || 'Your answer...'}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Mixed (options + text) */}
            {question.type === 'mixed' && (
              <div className="space-y-3">
                {question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={responses[question.id].selectedOptions?.includes(
                            option.value
                          )}
                          onChange={() => handleSelectOption(question.id, option.value)}
                        />
                        <span className="text-sm text-slate-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
                <textarea
                  value={responses[question.id].freeText || ''}
                  onChange={(e) => handleTextChange(question.id, e.target.value)}
                  placeholder={question.placeholder || 'Additional details...'}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Submit Answers'}
      </button>
    </div>
  );
}
```

### 2. Question Generator Utility
#### File: `lib/helix/question-generator.ts` (NEW)
Helper to convert Claude responses into structured questions.

```typescript
import { Question } from '@/components/helix/chat/AskUserQuestions';

export function parseQuestionsFromText(text: string): Question[] {
  // Parse Claude-generated questions from markdown format
  // Expected format:
  // ## Question 1: Title
  // Type: single-select
  // Options: A) Option A | B) Option B
  // Required: true

  const questions: Question[] = [];
  const questionBlocks = text.split(/^##\s+/m).slice(1);

  questionBlocks.forEach((block, idx) => {
    const lines = block.split('\n');
    const title = lines[0].replace(/^\d+:\s*/, '').trim();

    const typeMatch = block.match(/Type:\s*(\w+)/i);
    const type = (typeMatch?.[1]?.toLowerCase() || 'free-text') as Question['type'];

    const optionsMatch = block.match(/Options:\s*(.+?)(?=Required|$)/is);
    const options = optionsMatch
      ? optionsMatch[1]
          .split(/[|,]/)
          .map((opt) => {
            const m = opt.match(/^\s*[A-Z]\)\s*(.+)/);
            const label = m ? m[1].trim() : opt.trim();
            return {
              label,
              value: label.toLowerCase().replace(/\s+/g, '-'),
            };
          })
      : undefined;

    const requiredMatch = block.match(/Required:\s*(true|false)/i);
    const required = requiredMatch ? requiredMatch[1].toLowerCase() === 'true' : true;

    questions.push({
      id: `q_${idx}`,
      text: title,
      type,
      options,
      required,
    });
  });

  return questions;
}

export function formatResponsesAsText(
  questions: Question[],
  responses: Record<string, any>
): string {
  return questions
    .map((q) => {
      const resp = responses[q.id];
      let answer = '';

      if (q.type === 'single-select' || q.type === 'multi-select') {
        answer = resp.selectedOptions?.join(', ') || '(no answer)';
      } else if (q.type === 'free-text' || q.type === 'mixed') {
        answer = resp.freeText || '(no answer)';
      }

      return `Q: ${q.text}\nA: ${answer}`;
    })
    .join('\n\n');
}
```

---

## File Structure
```
components/helix/chat/
├── AskUserQuestions.tsx (NEW)
└── [previous chat components]

lib/helix/
└── question-generator.ts (NEW)
```

---

## Dependencies
- React 19+ (hooks, state)
- Tailwind CSS for styling
- Button component from ui library

---

## Tech Stack for This Phase
- TypeScript (interfaces for Question, Response)
- React Hooks (useState)
- Form state management
- Markdown parsing for Claude-generated questions

---

## Acceptance Criteria
1. AskUserQuestions renders all question types: single-select, multi-select, free-text, mixed
2. Single-select shows radio buttons (only one selectable)
3. Multi-select shows checkboxes (multiple selectable)
4. Free-text shows textarea for longer answers
5. Mixed shows both checkboxes and textarea
6. Submit button disabled while isLoading = true
7. Submit button disabled until all required questions answered
8. parseQuestionsFromText converts markdown format to Question objects
9. parseQuestionsFromText extracts type, options, required flag
10. formatResponsesAsText converts responses back to readable text

---

## Testing Instructions
1. Render AskUserQuestions with single-select question, verify radio buttons display
2. Click option, verify only one selected
3. Render multi-select question, verify checkboxes display
4. Select multiple options, verify all stay selected
5. Render free-text question, verify textarea appears
6. Type in textarea, verify text captured in responses
7. Render mixed question, verify checkboxes and textarea both present
8. Try submit with empty required field, verify alert and prevent submission
9. Call parseQuestionsFromText with markdown, verify questions parsed correctly
10. Call formatResponsesAsText with responses, verify readable text output

---

## Notes for the AI Agent
- Question parsing uses regex to extract structure from Claude's markdown output.
- Question IDs are generated as q_0, q_1, etc., but could use UUIDs in production.
- Validation can be enhanced with custom validators per question type in v2.
- Consider adding conditional logic (show Q2 only if Q1 = specific answer) in future.

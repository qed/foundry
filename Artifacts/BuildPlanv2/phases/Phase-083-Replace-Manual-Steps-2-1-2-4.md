# Phase 083 — Replace Manual Steps 2.1-2.4
## Objective
Integrate AI-powered documentation automation into the Helix flow, replacing manual documentation steps (2.1-2.4) with AI paths while preserving manual alternatives. Each step gets an AI-accelerated path using Phases 075-082 features.

## Prerequisites
- Phase 075 — Documentation Inventory AI
- Phase 076 — Gap Detection Engine
- Phase 077 — Documentation Review AI
- Phase 078 — Auto-Categorize Uploaded Documents
- Phase 079 — Knowledge Extraction Interview
- Phase 080 — Documentation Completeness Scoring
- Phase 081 — Review Report Generation
- Phase 082 — Verification Gate With AI Assessment

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 83 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Phases 075-082 have built individual AI components for documentation automation. This phase integrates them into the Helix workflow, replacing the manual Step 2 process with intelligent, AI-powered paths. Teams can choose: fast AI path (runs all analysis, suggests improvements) or manual path (upload and review as before).

The AI path dramatically reduces documentation review time from hours to minutes while maintaining quality. Manual path remains available for teams preferring direct control or additional validation. Both paths flow into Step 3 (Build Planning) using the same documentation data structures.

---
## Detailed Requirements

### 1. Documentation Step AI Path Integration
#### File: `app/helix/steps/documentation/AIPath.tsx` (NEW)
Implement AI-accelerated documentation step flow:

```typescript
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { DocumentInventoryDisplay } from "@/app/helix/components/DocumentCategoryDisplay";
import { DocumentCategorizationSummary } from "@/app/helix/components/DocumentCategorizationSummary";

type AIPathStage =
  | "upload"
  | "analyzing_inventory"
  | "detecting_gaps"
  | "reviewing_quality"
  | "categorizing"
  | "interviewing"
  | "scoring"
  | "generating_report"
  | "verification"
  | "complete";

interface AIPathState {
  stage: AIPathStage;
  progress: number;
  results: {
    inventory?: any;
    gaps?: any;
    review?: any;
    categorization?: any;
    interview?: any;
    score?: any;
    report?: any;
    verification?: any;
  };
  error?: string;
}

export function DocumentationAIPath() {
  const [state, setState] = useState<AIPathState>({
    stage: "upload",
    progress: 0,
    results: {},
  });

  const stageDescriptions = {
    upload: "Upload documentation files",
    analyzing_inventory: "Analyzing document types and content...",
    detecting_gaps: "Detecting documentation gaps...",
    reviewing_quality: "Reviewing documentation quality...",
    categorizing: "Auto-categorizing documents...",
    interviewing: "Conducting knowledge extraction interview...",
    scoring: "Calculating completeness score...",
    generating_report: "Generating review report...",
    verification: "Assessing readiness with verification gate...",
    complete: "Documentation analysis complete!",
  };

  const handleStartAIPath = async (files: File[]) => {
    try {
      // Stage 1: Analyze Inventory
      setState((prev) => ({
        ...prev,
        stage: "analyzing_inventory",
        progress: 10,
      }));

      const inventoryResponse = await fetch(
        "/api/helix/documentation/analyze-inventory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: files.map((f) => f.name) }),
        }
      );

      const inventory = await inventoryResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, inventory },
        progress: 25,
        stage: "detecting_gaps",
      }));

      // Stage 2: Detect Gaps
      const gapsResponse = await fetch(
        "/api/helix/documentation/detect-gaps",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventory }),
        }
      );

      const gaps = await gapsResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, gaps },
        progress: 40,
        stage: "reviewing_quality",
      }));

      // Stage 3: Review Quality
      const reviewResponse = await fetch(
        "/api/helix/documentation/review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files }),
        }
      );

      const review = await reviewResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, review },
        progress: 55,
        stage: "categorizing",
      }));

      // Stage 4: Auto-Categorize (already done in inventory, but display)
      setState((prev) => ({
        ...prev,
        progress: 70,
        stage: "scoring",
      }));

      // Stage 5: Calculate Completeness Score
      const scoreResponse = await fetch(
        "/api/helix/documentation/calculate-score",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventory,
            gaps,
            review,
          }),
        }
      );

      const score = await scoreResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, score },
        progress: 80,
        stage: "generating_report",
      }));

      // Stage 6: Generate Report
      const reportResponse = await fetch(
        "/api/helix/documentation/generate-report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review,
            score,
            gaps,
          }),
        }
      );

      const report = await reportResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, report },
        progress: 90,
        stage: "verification",
      }));

      // Stage 7: Verification Gate Assessment
      const verificationResponse = await fetch(
        "/api/helix/documentation/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            gaps,
          }),
        }
      );

      const verification = await verificationResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, verification },
        progress: 100,
        stage: "complete",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Analysis failed",
      }));
    }
  };

  const renderStageContent = () => {
    switch (state.stage) {
      case "complete":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-lg font-semibold">Analysis Complete!</span>
            </div>

            {state.results.score && (
              <Card>
                <CardHeader>
                  <CardTitle>Completeness Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    {state.results.score.overallScore}/100
                  </div>
                  <p className="text-gray-600">
                    Status: {state.results.score.scoreStatus}
                  </p>
                </CardContent>
              </Card>
            )}

            {state.results.verification && (
              <Card>
                <CardHeader>
                  <CardTitle>Verification Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`p-3 rounded ${
                      state.results.verification.readyToProceed
                        ? "bg-green-50 border border-green-200"
                        : "bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <p className="font-semibold">
                      {state.results.verification.readyToProceed
                        ? "Ready to Proceed"
                        : "Address Blockers First"}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      {state.results.verification.reasoning}
                    </p>
                    {state.results.verification.criticalBlockers.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="font-medium text-sm">Blockers:</p>
                        {state.results.verification.criticalBlockers.map(
                          (blocker, i) => (
                            <p key={i} className="text-sm text-gray-700">
                              • {blocker.title}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // Download report
                  if (state.results.report?.markdown) {
                    const element = document.createElement("a");
                    element.setAttribute(
                      "href",
                      `data:text/markdown;charset=utf-8,${encodeURIComponent(
                        state.results.report.markdown
                      )}`
                    );
                    element.setAttribute("download", "documentation-review.md");
                    element.click();
                  }
                }}
              >
                Download Report
              </Button>
              <Button variant="outline">Review Details</Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Save to helix_steps.evidence_data
                  // Continue to Step 3
                }}
              >
                Continue to Planning
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{stageDescriptions[state.stage]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium">{state.progress}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (state.error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <CardTitle>Analysis Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{state.error}</p>
          <Button
            onClick={() =>
              setState({
                stage: "upload",
                progress: 0,
                results: {},
              })
            }
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return renderStageContent();
}
```

### 2. Step 2 Flow Controller
#### File: `app/helix/steps/documentation/StepController.tsx` (NEW)
Route between AI and manual paths:

```typescript
"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentationAIPath } from "./AIPath";
import { DocumentationManualPath } from "./ManualPath";
import { Zap, FileText } from "lucide-react";

type PathChoice = "choose" | "ai" | "manual";

export function DocumentationStepController() {
  const [selectedPath, setSelectedPath] = useState<PathChoice>("choose");

  if (selectedPath === "choose") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Documentation Review</CardTitle>
          <CardDescription>
            Choose how you'd like to review and validate your documentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedPath("ai")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">AI Path (Fast)</span>
              </div>
              <p className="text-sm text-gray-600">
                Automated analysis with AI insights. 5-10 minutes to complete.
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>✓ Auto-categorize documents</li>
                <li>✓ Detect gaps vs requirements</li>
                <li>✓ Quality review & scoring</li>
                <li>✓ Generate report</li>
                <li>✓ Verify readiness</li>
              </ul>
            </button>

            <button
              onClick={() => setSelectedPath("manual")}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="font-semibold">Manual Path</span>
              </div>
              <p className="text-sm text-gray-600">
                Traditional review with full control. As much time as you need.
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>✓ Upload documents</li>
                <li>✓ Review each file</li>
                <li>✓ Create action items</li>
                <li>✓ Manual verification</li>
              </ul>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedPath === "ai") {
    return <DocumentationAIPath />;
  }

  return <DocumentationManualPath />;
}
```

---
## File Structure
```
lib/helix/documentation/
├── inventory.ts (Phase 075)
├── gap-detection.ts (Phase 076)
├── review.ts (Phase 077)
├── categorization.ts (Phase 078)
├── knowledge-interview.ts (Phase 079)
├── completeness-score.ts (Phase 080)
├── report-generator.ts (Phase 081)
└── verification-gate.ts (Phase 082)

app/helix/steps/documentation/
├── AIPath.tsx (NEW)
├── StepController.tsx (NEW)
├── ManualPath.tsx (EXISTING, preserved)
└── index.tsx (UPDATED)

app/helix/components/
├── DocumentCategoryDisplay.tsx (Phase 078)
├── DocumentCategorizationSummary.tsx (Phase 078)
└── ...
```

---
## Dependencies
- All Phases 075-082 services
- Supabase for data persistence
- Claude API for AI analysis
- Helix session data structure

---
## Tech Stack for This Phase
- TypeScript
- React (UI components)
- Claude API
- Supabase (persistence)
- Tailwind CSS v4
- Lucide React (icons)

---
## Acceptance Criteria
1. Documentation step presents choice between AI and manual paths
2. AI path executes all 8 analysis phases in sequence
3. Each stage displays progress indicator and stage name
4. Results from each phase feed into subsequent phases
5. Manual path preserves existing functionality unchanged
6. Both paths save results to helix_steps.evidence_data
7. Completeness score and verification gate accessible in both paths
8. Report can be exported as markdown
9. Error handling shows clear error messages and recovery options
10. Time to complete AI path is under 15 minutes for typical project

---
## Testing Instructions
1. Upload 5-10 mixed documentation files
2. Select AI Path and observe all 8 stages execute
3. Verify progress bar increments correctly
4. Check each stage produces expected results in state
5. Verify final report displays completeness score
6. Check verification gate shows blockers or proceed status
7. Download report and verify markdown formatting
8. Switch back and select Manual Path
9. Verify manual path works independently
10. Test error recovery by simulating API failure mid-flow

---
## Notes for the AI Agent
This phase is the integration point that makes all previous work visible and useful. The UX should feel fast and seamless—users should see their documentation analyzed before they get bored. Progress indication is important for keeping users confident the system is working. The choice between paths is important: power users and teams with existing processes may prefer manual; teams wanting speed will prefer AI. Both should feel equally valid. Error recovery should be graceful—don't lose user's work if something fails mid-flow. Consider saving state periodically so users can resume if needed.

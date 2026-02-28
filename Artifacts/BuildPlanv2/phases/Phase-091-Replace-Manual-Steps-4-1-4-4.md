# Phase 091 — Replace Manual Steps 4.1-4.4
## Objective
Integrate automated repo setup into Helix flow, replacing manual Steps 4.1-4.3 with AI/automated paths. Step 4.4 (git push) remains user-initiated. Wire all previous repo setup phases into the workflow.

## Prerequisites
- Phase 084 — Repo Template Customization Engine
- Phase 085 — Auto Find-and-Replace Placeholders
- Phase 086 — Build Plan to Repo Structure Generator
- Phase 087 — Downloadable Ready-Made Project Folder
- Phase 088 — Git Initialization Guide Generator
- Phase 089 — GitHub Repo Creation Integration
- Phase 090 — Pre-Build Review AI Assistant

## Epic Context
**Epic:** 10 — Repo Setup Automation — Steps 4.1-4.4
**Phase:** 91 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Phases 084-090 have built individual components for repo setup automation. This phase integrates them into the Helix Step 4 flow, replacing the manual process with an automated workflow that produces a ready-to-use repository.

Steps 4.1-4.3 become mostly automated; Step 4.4 (pushing to GitHub) remains user-initiated for security. Users can choose between fully automated (with optional GitHub integration) or manual-only paths.

---
## Detailed Requirements

### 1. Repo Setup Flow Controller
#### File: `app/helix/steps/repo-setup/RepoSetupController.tsx` (NEW)
Orchestrate the automated repo setup flow:

```typescript
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";

type RepoSetupStage =
  | "choose"
  | "customizing"
  | "building_plan"
  | "generating_package"
  | "reviewing"
  | "git_init"
  | "github_optional"
  | "complete";

interface RepoSetupState {
  stage: RepoSetupStage;
  progress: number;
  results: {
    customizedFiles?: any;
    buildPlanStructure?: any;
    projectPackage?: Blob;
    preBuiltReview?: any;
    gitGuide?: any;
    githubResult?: any;
  };
  error?: string;
}

export function RepoSetupController() {
  const [state, setState] = useState<RepoSetupState>({
    stage: "choose",
    progress: 0,
    results: {},
  });

  const [selectedPath, setSelectedPath] = useState<"full" | "manual">("full");

  const stageDescriptions = {
    choose: "Choose setup method",
    customizing: "Customizing template files...",
    building_plan: "Generating Build Plan structure...",
    generating_package: "Creating downloadable package...",
    reviewing: "Running pre-build review...",
    git_init: "Generating git initialization guide...",
    github_optional: "Preparing GitHub integration (optional)...",
    complete: "Repository setup complete!",
  };

  const handleStartFullAutomation = async () => {
    try {
      // Stage 1: Customize Templates
      setState((prev) => ({
        ...prev,
        stage: "customizing",
        progress: 15,
      }));

      const customizationResponse = await fetch(
        "/api/helix/repo-setup/customize-templates",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: "YourProject",
            projectDescription: "Your description",
            authorName: "Author",
            authorEmail: "author@example.com",
          }),
        }
      );

      const customized = await customizationResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, customizedFiles: customized },
        progress: 30,
        stage: "building_plan",
      }));

      // Stage 2: Build Plan Generation
      const buildPlanResponse = await fetch(
        "/api/helix/repo-setup/generate-build-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            briefContent: "Project brief",
            buildPlanData: {},
          }),
        }
      );

      const buildPlan = await buildPlanResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, buildPlanStructure: buildPlan },
        progress: 50,
        stage: "generating_package",
      }));

      // Stage 3: Generate Package
      const packageResponse = await fetch(
        "/api/helix/repo-setup/generate-package",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customizedFiles: customized,
            buildPlanFiles: buildPlan,
          }),
        }
      );

      const packageBlob = await packageResponse.blob();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, projectPackage: packageBlob },
        progress: 65,
        stage: "reviewing",
      }));

      // Stage 4: Pre-Build Review
      const reviewResponse = await fetch(
        "/api/helix/repo-setup/pre-build-review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: "YourProject",
            files: customized.files,
          }),
        }
      );

      const review = await reviewResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, preBuiltReview: review },
        progress: 80,
        stage: "git_init",
      }));

      // Stage 5: Git Initialization Guide
      const gitResponse = await fetch(
        "/api/helix/repo-setup/git-init-guide",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: "YourProject",
            repositoryUrl: "https://github.com/user/repo",
          }),
        }
      );

      const gitGuide = await gitResponse.json();

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, gitGuide },
        progress: 100,
        stage: "complete",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Setup failed",
      }));
    }
  };

  if (state.stage === "choose") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Repository Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Choose how to set up your project repository
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setSelectedPath("full");
                handleStartFullAutomation();
              }}
              className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="font-semibold text-blue-700 mb-2">
                Fully Automated ⚡
              </div>
              <p className="text-sm text-gray-600">
                All steps automated. Download, extract, git init, start coding.
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>✓ Customize templates</li>
                <li>✓ Generate Build Plan</li>
                <li>✓ Create zip download</li>
                <li>✓ Pre-build validation</li>
                <li>✓ Git setup instructions</li>
              </ul>
            </button>

            <button
              onClick={() => setSelectedPath("manual")}
              className="p-4 border-2 border-amber-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
            >
              <div className="font-semibold text-amber-700 mb-2">
                Manual Setup
              </div>
              <p className="text-sm text-gray-600">
                Step-by-step instructions for full control.
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>✓ Download template</li>
                <li>✓ Customize files</li>
                <li>✓ Review Build Plan</li>
                <li>✓ Initialize git</li>
                <li>✓ Push to GitHub</li>
              </ul>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.stage === "complete") {
    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-6 h-6" />
              <CardTitle>Repository Setup Complete!</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="download" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="download">Download</TabsTrigger>
            <TabsTrigger value="review">Review Results</TabsTrigger>
            <TabsTrigger value="git">Git Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Project Package Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Your complete project folder is ready to download. Extract it
                  and follow the git setup instructions below.
                </p>
                <Button
                  onClick={() => {
                    if (state.results.projectPackage) {
                      const url = URL.createObjectURL(
                        state.results.projectPackage
                      );
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "project-setup.zip";
                      link.click();
                    }
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Project Zip
                </Button>
                <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
                  📦 Includes: Customized files, BuildPlan, docs, src folder,
                  .claude/commands, all ready to go
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review">
            {state.results.preBuiltReview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pre-Build Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className={`p-3 rounded ${
                      state.results.preBuiltReview.readyToBuild
                        ? "bg-green-50 border border-green-200"
                        : "bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <p className="font-semibold">
                      {state.results.preBuiltReview.readyToBuild
                        ? "✅ Ready to Build"
                        : "⚠️ Issues Found"}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      {state.results.preBuiltReview.summary}
                    </p>
                  </div>

                  {state.results.preBuiltReview.issues?.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Issues:</p>
                      <ul className="text-sm space-y-1">
                        {state.results.preBuiltReview.issues
                          .slice(0, 5)
                          .map((issue, i) => (
                            <li key={i} className="text-gray-700">
                              • {issue.title}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="git">
            {state.results.gitGuide && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Git Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono text-gray-700 overflow-auto max-h-48">
                    <pre>{state.results.gitGuide.commands?.[0]?.command}</pre>
                  </div>
                  <Button variant="outline" className="w-full">
                    View Full Git Guide
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setState({ ...state, stage: "choose" })}>
            Start Over
          </Button>
          <Button>Proceed to Phase 001</Button>
        </div>
      </div>
    );
  }

  return (
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
  );
}
```

### 2. Manual Path (Preserved)
#### File: `app/helix/steps/repo-setup/ManualPath.tsx` (EXISTING, preserved)
Maintain existing manual workflow for users who prefer direct control

---
## File Structure
```
lib/helix/repo-setup/
├── template-engine.ts (Phase 084)
├── placeholder-handler.ts (Phase 085)
├── build-plan-generator.ts (Phase 086)
├── package-generator.ts (Phase 087)
├── git-init-guide.ts (Phase 088)
├── github.ts (Phase 089)
├── pre-build-review.ts (Phase 090)
└── index.ts (NEW - exports)

app/helix/steps/repo-setup/
├── RepoSetupController.tsx (NEW)
├── ManualPath.tsx (EXISTING, preserved)
└── index.tsx (UPDATED)

app/api/helix/repo-setup/
├── customize-templates/route.ts (NEW)
├── generate-build-plan/route.ts (NEW)
├── generate-package/route.ts (NEW)
├── pre-build-review/route.ts (NEW)
├── git-init-guide/route.ts (NEW)
└── github-create/route.ts (NEW, optional)
```

---
## Dependencies
- All Phases 084-090 services
- Supabase for persistence
- JSZip for zip generation
- GitHub API client

---
## Tech Stack for This Phase
- TypeScript
- React (UI orchestration)
- Claude API (pre-build review)
- GitHub API (optional GitHub integration)
- JSZip (package generation)
- Next.js API routes

---
## Acceptance Criteria
1. Step 4 presents choice between fully automated and manual paths
2. Fully automated path executes all 7 previous phases sequentially
3. Each stage displays progress indicator with stage name
4. Customized files generated with all placeholders replaced
5. Build Plan structure generated correctly
6. Project zip package created with all files included
7. Pre-build review identifies any issues and provides fixes
8. Git initialization guide generated with copy-paste commands
9. Package download triggers with correct filename
10. Manual path preserved as alternative option

---
## Testing Instructions
1. Select fully automated path and observe all stages execute
2. Verify progress bar increments through each stage
3. Check that customization replaces all placeholder values
4. Verify Build Plan structure created with correct file hierarchy
5. Download the zip file and extract to verify contents
6. Check pre-build review identifies no critical issues (for valid setup)
7. Verify git initialization guide has correct project name and repo URL
8. Manually download, extract, and follow git commands to verify accuracy
9. Test manual path still works as fallback
10. Test error recovery if a stage fails mid-flow

---
## Notes for the AI Agent
This is the final integration phase for repo setup automation. The UX should feel seamless and fast—users should see their complete repository in under 2 minutes (for the UI flow). The choice between paths is important: some teams prefer the guarantee of manual review, others want speed. Both should feel equally valid and supported.

Download functionality is critical—test across browsers to ensure the zip file downloads with correct filename and all contents. Git initialization instructions should be accurate and copy-pasteable without modification. The optional GitHub integration (Phase 089) should feel truly optional—teams without GitHub tokens shouldn't feel like they're missing out.

Consider persisting state so users can resume if they close the browser mid-flow. Error messages should be clear about what went wrong and how to recover. After completion, users should feel confident their repository is ready for Phase 001 development.

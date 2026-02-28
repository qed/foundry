# Phase 078 — Auto-Categorize Uploaded Documents
## Objective
Implement automatic document type classification with confidence scoring and visual display. Automatically tag uploaded files based on content analysis and allow users to view and override categorization with confidence indicators.

## Prerequisites
- Phase 075 — Documentation Inventory AI — Core classification logic
- Phase 074 — Documentation Upload Interface — File upload mechanism

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 78 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
While Phase 075 performs backend analysis, this phase surfaces the categorization results in the UI with confidence scores and allows users to verify or override classifications. Automatic categorization reduces manual effort while confidence scores give users visibility into AI certainty. This supports the document organization workflow and feeds into subsequent analysis phases.

The phase displays documents with their AI-detected types, confidence levels, and suggested categories, enabling users to quickly organize their documentation and catch any misclassifications before they affect gap detection or review processes.

---
## Detailed Requirements

### 1. Document Categorization UI Component
#### File: `app/helix/components/DocumentCategoryDisplay.tsx` (NEW)
Display and manage document categorization:

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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface DocumentCategoryProps {
  fileName: string;
  detectedType: {
    type: string;
    confidence: number;
    reasoning: string;
  };
  suggestedCategory: string;
  extractedKeywords: string[];
  onCategoryOverride?: (newType: string) => void;
}

const documentTypes = [
  { value: "specification", label: "Specification", color: "bg-blue-100" },
  { value: "mockup", label: "Mockup", color: "bg-purple-100" },
  { value: "wireframe", label: "Wireframe", color: "bg-amber-100" },
  { value: "notes", label: "Notes", color: "bg-green-100" },
  { value: "code", label: "Code", color: "bg-slate-100" },
  { value: "prototype", label: "Prototype", color: "bg-red-100" },
  { value: "brand_asset", label: "Brand Asset", color: "bg-pink-100" },
  { value: "other", label: "Other", color: "bg-gray-100" },
];

export function DocumentCategoryDisplay({
  fileName,
  detectedType,
  suggestedCategory,
  extractedKeywords,
  onCategoryOverride,
}: DocumentCategoryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState(detectedType.type);

  const confidenceColor =
    detectedType.confidence > 0.8
      ? "text-green-600"
      : detectedType.confidence > 0.5
        ? "text-amber-600"
        : "text-red-600";

  const confidenceIcon =
    detectedType.confidence > 0.8 ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-amber-600" />
    );

  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    onCategoryOverride?.(newType);
    setIsEditing(false);
  };

  const typeConfig = documentTypes.find((t) => t.value === selectedType);
  const confidencePercent = Math.round(detectedType.confidence * 100);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{fileName}</CardTitle>
            <CardDescription>{suggestedCategory}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {confidenceIcon}
            <span className={`text-sm font-medium ${confidenceColor}`}>
              {confidencePercent}% confident
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Type:</span>
          {isEditing ? (
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <Badge
                className={`${typeConfig?.color || "bg-gray-100"} text-black`}
              >
                {typeConfig?.label || selectedType}
              </Badge>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 hover:underline ml-2"
              >
                Edit
              </button>
            </>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">AI Reasoning:</p>
          <p className="italic">{detectedType.reasoning}</p>
        </div>

        {extractedKeywords.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Keywords:</p>
            <div className="flex flex-wrap gap-1">
              {extractedKeywords.map((keyword, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2. Bulk Categorization Summary
#### File: `app/helix/components/DocumentCategorizationSummary.tsx` (NEW)
Display overview of categorized documents:

```typescript
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface CategorizationSummaryProps {
  typeDistribution: Record<string, number>;
  suggestedStructure: Array<{
    category: string;
    fileCount: number;
    types: string[];
  }>;
  totalFiles: number;
  averageConfidence: number;
}

export function DocumentCategorizationSummary({
  typeDistribution,
  suggestedStructure,
  totalFiles,
  averageConfidence,
}: CategorizationSummaryProps) {
  const chartData = Object.entries(typeDistribution).map(([type, count]) => ({
    type,
    count,
  }));

  const confidencePercent = Math.round(averageConfidence * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Document Categorization Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">Total Files</p>
              <p className="text-2xl font-bold">{totalFiles}</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold">{confidencePercent}%</p>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-sm text-gray-600">Types Detected</p>
              <p className="text-2xl font-bold">{Object.keys(typeDistribution).length}</p>
            </div>
          </div>

          <BarChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested Folder Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suggestedStructure.map((struct, i) => (
              <div
                key={i}
                className="p-3 border rounded bg-gray-50"
              >
                <p className="font-medium">{struct.category}</p>
                <p className="text-sm text-gray-600">
                  {struct.fileCount} files • {struct.types.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---
## File Structure
```
lib/helix/documentation/
├── inventory.ts (EXISTING from Phase 075)
├── categorization.ts (NEW - type definitions and helpers)
└── ...

app/helix/components/
├── DocumentCategoryDisplay.tsx (NEW)
├── DocumentCategorizationSummary.tsx (NEW)
└── ...
```

---
## Dependencies
- Phase 075 — Documentation Inventory AI
- Supabase for document storage and retrieval
- Recharts for visualization
- Shadcn/ui components (Card, Badge, Select)

---
## Tech Stack for This Phase
- TypeScript
- React (client components for UI)
- Claude API (categorization via Phase 075)
- Recharts (data visualization)
- Tailwind CSS v4

---
## Acceptance Criteria
1. Documents upload and auto-categorization triggers via Phase 075 logic
2. Each document displays detected type, confidence score, and suggested category
3. Confidence scores range 0-100% with visual indicators (colors/icons)
4. Users can edit/override categorization with single click
5. Bulk summary shows distribution chart and suggested folder structure
6. Average confidence calculated correctly across all documents
7. Keywords extracted and displayed for each document
8. Document type colors consistent with design system
9. UI shows reasoning for AI classification decision
10. Changes to categorization persist to database

---
## Testing Instructions
1. Upload 5-10 mixed document types (spec, mockup, notes, code)
2. Verify each receives appropriate type classification
3. Check confidence scores are between 0-1.0
4. Click "Edit" on a document and select different type
5. Verify change persists after page reload
6. Check summary chart displays correct type distribution
7. Verify keywords appear for documents with extracted keywords
8. Test with documents edge cases (empty files, unusual extensions)
9. Verify UI displays clearly with varying document name lengths
10. Check that confidence indicator colors change based on score values

---
## Notes for the AI Agent
This phase makes the inventory analysis (Phase 075) user-visible and actionable. The UI should feel lightweight and quick—users should be able to scan categorizations in seconds. Confidence scores are key to building trust in AI suggestions. Consider that users may want to bulk-edit categories in a future phase, so the data model should support batch operations. The suggested folder structure from inventory analysis should hint at good organization before review or gap detection runs.

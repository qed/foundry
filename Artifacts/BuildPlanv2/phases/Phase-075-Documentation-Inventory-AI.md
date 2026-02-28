# Phase 075 — Documentation Inventory AI
## Objective
Create an AI-powered tool that analyzes uploaded documentation files to automatically identify document types, suggest categorization, and extract content snippets for further analysis. This phase enables intelligent organization of project documentation before deeper processing.

## Prerequisites
- Phase 074 — Documentation Upload Interface — Foundation for accepting files into Helix flow

## Epic Context
**Epic:** 9 — Documentation Intelligence — Steps 2.1-2.4 Automation
**Phase:** 75 of 157
**Estimated Effort:** Half-day (~3-4 hours)

## Context
Documentation inventory is the first step in automating the documentation review process. When users upload project files (specs, mockups, notes, etc.), we need to understand what they've provided before analyzing gaps, reviewing quality, or extracting knowledge. This phase implements an AI-powered inventory system that examines file metadata and content to categorize documents automatically.

The inventory serves as input for subsequent phases: gap detection (076), quality review (077), auto-categorization with confidence scores (078), and knowledge extraction (079). By automating this initial classification, we reduce manual effort and ensure consistent document handling across all projects.

---
## Detailed Requirements

### 1. File Analysis Service
#### File: `lib/helix/documentation/inventory.ts` (NEW)
Implement core inventory analysis logic using Claude API for intelligent classification:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface DocumentType {
  type:
    | "specification"
    | "mockup"
    | "wireframe"
    | "notes"
    | "code"
    | "prototype"
    | "brand_asset"
    | "other";
  confidence: number; // 0-1
  reasoning: string;
}

export interface DocumentInventoryItem {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSizeKb: number;
  uploadedAt: string;
  detectedType: DocumentType;
  suggestedCategory: string;
  contentPreview: string; // first 500 chars
  extractedKeywords: string[];
}

export interface DocumentInventoryAnalysis {
  totalFiles: number;
  analyzedAt: string;
  items: DocumentInventoryItem[];
  typeDistribution: Record<string, number>;
  suggestedStructure: {
    category: string;
    fileCount: number;
    types: string[];
  }[];
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function analyzeDocumentInventory(
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeKb: number;
    contentPreview: string;
  }>
): Promise<DocumentInventoryAnalysis> {
  const fileDescriptions = files
    .map(
      (f) =>
        `- "${f.name}" (${f.mimeType}, ${f.sizeKb}KB)\n  Preview: ${f.contentPreview.substring(0, 200)}...`
    )
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Analyze this documentation inventory and classify each file. Respond in JSON format.

Files uploaded:
${fileDescriptions}

For each file, provide:
1. Document type (specification, mockup, wireframe, notes, code, prototype, brand_asset, other)
2. Confidence score (0-1)
3. Reasoning for classification
4. Suggested category for organization
5. 3-5 extracted keywords

Also provide:
- Overall type distribution
- Suggested folder structure for organizing these documents

Respond with valid JSON matching this structure:
{
  "items": [
    {
      "fileName": "...",
      "type": "...",
      "confidence": 0.9,
      "reasoning": "...",
      "suggestedCategory": "...",
      "keywords": ["...", "..."]
    }
  ],
  "typeDistribution": { "specification": 2, ... },
  "suggestedStructure": [
    { "category": "...", "description": "..." }
  ]
}`,
      },
    ],
  });

  // Extract JSON from response
  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  // Build inventory analysis
  const inventory: DocumentInventoryAnalysis = {
    totalFiles: files.length,
    analyzedAt: new Date().toISOString(),
    items: files.map((file, index) => {
      const itemData = analysisData.items?.[index] || {};
      return {
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSizeKb: file.sizeKb,
        uploadedAt: new Date().toISOString(),
        detectedType: {
          type: (itemData.type as DocumentType["type"]) || "other",
          confidence: itemData.confidence || 0.5,
          reasoning:
            itemData.reasoning || "Unable to classify with high confidence",
        },
        suggestedCategory: itemData.suggestedCategory || "Uncategorized",
        contentPreview: file.contentPreview.substring(0, 500),
        extractedKeywords: itemData.keywords || [],
      };
    }),
    typeDistribution: analysisData.typeDistribution || {},
    suggestedStructure: analysisData.suggestedStructure || [],
  };

  return inventory;
}

export function getTypeColor(
  type: DocumentType["type"]
): "blue" | "purple" | "amber" | "green" | "red" | "slate" {
  const colorMap: Record<DocumentType["type"], any> = {
    specification: "blue",
    mockup: "purple",
    wireframe: "amber",
    notes: "green",
    code: "slate",
    prototype: "red",
    brand_asset: "purple",
    other: "slate",
  };
  return colorMap[type];
}

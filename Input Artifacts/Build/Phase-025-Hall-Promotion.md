# Phase 025 - Hall to Pattern Shop Promotion

## Objective
Enable users to promote refined ideas from The Hall into Pattern Shop as seeds. Ideas undergo a promotion workflow where users select the target seed level (epic, feature) and create the initial seed entry with references back to the origin idea.

## Prerequisites
- Phase 011: Hall Database Schema (ideas table)
- Phase 016: Idea Detail View (promotion button)
- Pattern Shop schema exists (pattern_seeds table with appropriate columns)

## Context
Not all ideas in The Hall are ready for formal requirement processing. As ideas mature and gain clarity, they're promoted to Pattern Shop where they become seeds for detailed elaboration. The promotion process captures the decision moment and maintains traceability between raw ideas and their evolved seeds.

## Detailed Requirements

### Promotion Eligibility

**Promotable Status**
- Can promote from: raw, developing, mature
- Cannot promote: promoted (already promoted), archived

**Recommendation**
- "Mature" ideas are ideal for promotion
- Provide hint: "Consider refining this idea to 'Mature' before promoting"
- Allow promotion from "developing" with warning: "This idea is still developing"

### Promotion Workflow

**Step 1: Trigger**
- User clicks "Promote" button in idea detail view
- Opens promotion wizard modal

**Step 2: Wizard - Confirm Idea**
- Display idea: title, body preview, tags
- "This idea will be promoted to Pattern Shop"
- "Continue" button to next step

**Step 3: Wizard - Select Seed Level**
- Radio buttons or dropdown:
  - **Epic Seed**
    - Description: "Large initiative spanning multiple features"
    - For: strategies, platforms, major features
  - **Feature Seed**
    - Description: "Smaller deliverable, typically 2-4 week scope"
    - For: specific features, improvements, user stories
- Default: infer from idea content (if >300 chars and broad scope, suggest Epic)
- Help text: "Choose the level that best fits this idea"

**Step 4: Wizard - Name & Confirm**
- Seed name pre-filled from idea title (editable)
- Description pre-filled from idea body (editable)
- Show tags that will transfer
- "Promote" button to confirm

**Step 5: Confirmation**
- Show success message: "Idea promoted to Pattern Shop"
- Display link to created seed: "[Epic] Mobile Authentication"
- Buttons: "View Seed", "Back to Idea", "Done"

### Promotion API

**Route**: POST /api/hall/ideas/[ideaId]/promote

**Request**
```json
{
  "seedLevel": "epic" | "feature",
  "seedName": "Mobile Authentication",
  "seedDescription": "Secure authentication for mobile apps...",
  "tags": ["Security", "Mobile"]
}
```

**Response**
```json
{
  "success": true,
  "seedId": "uuid",
  "seedUrl": "/org/slug/project/id/pattern-shop/seeds/uuid",
  "ideaId": "uuid"
}
```

### Seed Creation & Linking

**seed_ideaId Column** (In pattern_seeds table)

Add if not exists:
```sql
ALTER TABLE public.pattern_seeds
ADD COLUMN hall_idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL;
```

**Bidirectional Reference**

- Seed references idea: `pattern_seeds.hall_idea_id = ideas.id`
- Idea references seed: `ideas.promoted_to_seed_id = pattern_seeds.id` (already in Phase 011)

**Status Update**

After promotion, update idea:
```sql
UPDATE ideas SET status = 'promoted', promoted_to_seed_id = <seed_id>
WHERE id = <idea_id>
```

### Idea Status After Promotion

**Visual Changes**
- Detail view shows: "Promoted to Pattern Shop"
- Link to seed: "[View Seed]" button
- Status badge: "Promoted" (green)
- Promotion timestamp: "Promoted on Feb 20, 2025"

**UI Lock**
- After promotion, editing is limited (optional):
  - Allow editing body/tags (refinements sync to seed if desired)
  - Lock status from being downgraded
  - Show warning if editing: "Changes won't automatically sync to seed"

### Promotion Modal Component

```typescript
interface HallPromotionWizardProps {
  idea: Idea;
  isOpen: boolean;
  onClose: () => void;
  onPromoted?: (seedId: string) => void;
}

export function HallPromotionWizard({
  idea,
  isOpen,
  onClose,
  onPromoted,
}: HallPromotionWizardProps) {
  const [step, setStep] = useState<'confirm' | 'select-level' | 'details' | 'success'>(
    'confirm'
  );
  const [seedLevel, setSeedLevel] = useState<'epic' | 'feature'>(
    inferSeedLevel(idea) // intelligent default
  );
  const [seedName, setSeedName] = useState(idea.title);
  const [seedDescription, setSeedDescription] = useState(idea.body || '');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotedSeedId, setPromotedSeedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePromote = async () => {
    setIsPromoting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/hall/ideas/${idea.id}/promote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seedLevel,
            seedName: seedName.trim(),
            seedDescription: seedDescription.trim(),
            tags: idea.idea_tags?.map(it => it.tags.name) || [],
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Promotion failed');
      }

      const data = await response.json();
      setPromotedSeedId(data.seedId);
      setStep('success');
      onPromoted?.(data.seedId);
    } catch (err) {
      console.error('Promotion error:', err);
      setError('Failed to promote idea. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl p-6">
        {/* Step 1: Confirm Idea */}
        {step === 'confirm' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Promote Idea to Pattern Shop
            </h2>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{idea.title}</h3>
              <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                {idea.body}
              </p>
              <div className="flex flex-wrap gap-2">
                {idea.idea_tags?.map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: tag.tags.color }}
                  >
                    {tag.tags.name}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              This idea will be promoted to Pattern Shop as a seed, where it can be elaborated into detailed requirements.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('select-level')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: Select Seed Level */}
        {step === 'select-level' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Choose Seed Level
            </h2>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-4 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                     style={{ borderColor: seedLevel === 'epic' ? '#3B82F6' : undefined,
                              backgroundColor: seedLevel === 'epic' ? '#EFF6FF' : undefined }}>
                <input
                  type="radio"
                  name="seedLevel"
                  value="epic"
                  checked={seedLevel === 'epic'}
                  onChange={(e) => setSeedLevel(e.target.value as 'epic')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Epic Seed</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Large initiative spanning multiple features or platforms. Estimated effort: 4+ weeks.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                     style={{ borderColor: seedLevel === 'feature' ? '#3B82F6' : undefined,
                              backgroundColor: seedLevel === 'feature' ? '#EFF6FF' : undefined }}>
                <input
                  type="radio"
                  name="seedLevel"
                  value="feature"
                  checked={seedLevel === 'feature'}
                  onChange={(e) => setSeedLevel(e.target.value as 'feature')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Feature Seed</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Smaller deliverable or specific feature. Estimated effort: 1-2 weeks.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep('confirm')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('details')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 3: Edit Details */}
        {step === 'details' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Confirm Seed Details
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seed Name
                </label>
                <input
                  type="text"
                  value={seedName}
                  onChange={(e) => setSeedName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isPromoting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={seedDescription}
                  onChange={(e) => setSeedDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isPromoting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (will transfer to seed)
                </label>
                <div className="flex flex-wrap gap-2">
                  {idea.idea_tags?.map(tag => (
                    <span
                      key={tag.tag_id}
                      className="px-3 py-1 rounded-full text-sm text-white"
                      style={{ backgroundColor: tag.tags.color }}
                    >
                      {tag.tags.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep('select-level')}
                disabled={isPromoting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handlePromote}
                disabled={isPromoting || !seedName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isPromoting && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                Promote Idea
              </button>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === 'success' && promotedSeedId && (
          <>
            <div className="text-center mb-6">
              <svg className="w-12 h-12 text-green-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Idea Promoted!
              </h2>
              <p className="text-gray-600">
                {seedName} is now available in Pattern Shop as a {seedLevel} seed.
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <p className="text-sm text-green-700">
                The idea has been promoted and you can continue elaborating it in Pattern Shop.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Done
              </button>
              <a
                href={`/org/[slug]/project/[id]/pattern-shop/seeds/${promotedSeedId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                View Seed
              </a>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
```

## API Route Implementation

**POST /api/hall/ideas/[ideaId]/promote**

```typescript
export async function POST(
  request: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seedLevel, seedName, seedDescription, tags } = await request.json();

    // Fetch idea
    const ideaResponse = await supabase
      .from('ideas')
      .select('id, project_id, title, body, status')
      .eq('id', params.ideaId)
      .single();

    if (!ideaResponse.data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const idea = ideaResponse.data;

    // Verify user has access to project
    const memberCheck = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', session.user.id)
      .single();

    if (!memberCheck.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create seed in Pattern Shop
    const seedResponse = await supabase
      .from('pattern_seeds')
      .insert({
        project_id: idea.project_id,
        level: seedLevel,
        name: seedName,
        description: seedDescription,
        status: 'draft', // New seeds start as draft
        created_by: session.user.id,
        hall_idea_id: idea.id, // Link back to Hall idea
      })
      .select()
      .single();

    if (seedResponse.error) {
      console.error('Error creating seed:', seedResponse.error);
      return NextResponse.json(
        { error: 'Failed to create seed' },
        { status: 500 }
      );
    }

    const seed = seedResponse.data;

    // Update idea status and link to seed
    await supabase
      .from('ideas')
      .update({
        status: 'promoted',
        promoted_to_seed_id: seed.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idea.id);

    // Transfer tags to seed (if applicable; depends on Pattern Shop schema)
    // This may require a different approach depending on how Pattern Shop tags work

    return NextResponse.json({
      success: true,
      seedId: seed.id,
      seedUrl: `/org/[slug]/project/[id]/pattern-shop/seeds/${seed.id}`,
      ideaId: idea.id,
    });
  } catch (error) {
    console.error('Promotion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function inferSeedLevel(idea: Idea): 'epic' | 'feature' {
  // Simple heuristic: if body >500 chars and title suggests scope, suggest epic
  const bodyLength = (idea.body || '').length;
  const isComplex = bodyLength > 500;
  const broadTerms = ['system', 'platform', 'infrastructure', 'redesign'];
  const isBroad = broadTerms.some(term =>
    (idea.title + idea.body).toLowerCase().includes(term)
  );

  return isBroad && isComplex ? 'epic' : 'feature';
}
```

## Promoted Idea Display

**In Idea Detail View**

```typescript
{idea.status === 'promoted' && idea.promoted_to_seed_id && (
  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-sm text-green-700 font-medium">
      ✓ Promoted to Pattern Shop
    </p>
    <a
      href={`/org/${orgSlug}/project/${projectId}/pattern-shop/seeds/${idea.promoted_to_seed_id}`}
      className="text-sm text-green-600 hover:text-green-700 font-medium"
    >
      View seed →
    </a>
  </div>
)}
```

## Acceptance Criteria
1. "Promote" button visible in idea detail view
2. Promotion wizard opens with 4-step flow
3. Step 1 confirms idea details
4. Step 2 allows epic/feature selection
5. Step 3 allows name/description editing
6. Step 4 shows success with link to seed
7. Seed created in Pattern Shop database
8. Bidirectional link: idea → seed, seed → idea
9. Idea status changes to "promoted"
10. All tags transfer to seed
11. Error handling: show message if creation fails
12. Cannot promote already-promoted ideas
13. Can promote from raw/developing/mature
14. Cannot promote archived ideas
15. Success message with link to seed
16. Cancel at any step returns to idea view
17. Promoted idea detail shows "View seed" link
18. Inference heuristic suggests level
19. Name pre-filled from title (editable)
20. Description pre-filled from body (editable)

## Testing Instructions

### Promotion Flow
1. Open idea detail
2. Click "Promote" button
3. Verify step 1: confirm idea details
4. Click "Continue"
5. Verify step 2: select epic/feature
6. Click "Continue"
7. Verify step 3: edit details
8. Click "Promote"
9. Verify step 4: success message
10. Verify link to created seed

### Seed Creation
1. Promote idea to epic seed
2. Navigate to Pattern Shop
3. Verify seed exists with correct name/level
4. Verify seed has idea's description
5. Verify tags transferred

### Bidirectional Link
1. In Hall, view promoted idea
2. Verify "View seed" link present
3. Click link
4. In seed detail, verify link back to Hall idea

### Status Update
1. Promote idea
2. Open idea detail
3. Verify status = "promoted"
4. Verify "Promoted on [date]"
5. Verify cannot downgrade status

### Error Handling
1. Simulate API error during promotion
2. Verify error message in step 3
3. Verify can cancel and try again

### Edge Cases
1. Try to promote already-promoted idea
2. Verify "already promoted" message or hidden button
3. Try to promote archived idea
4. Verify button disabled or error

### Inference
1. Create short, focused idea (<200 chars)
2. Promote
3. Verify "Feature" suggested
4. Create broad, long idea (>500 chars, "system" in title)
5. Verify "Epic" suggested

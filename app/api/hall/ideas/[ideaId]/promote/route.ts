import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { IdeaStatus } from '@/types/database'

const PROMOTABLE_STATUSES: IdeaStatus[] = ['raw', 'developing', 'mature']

/**
 * POST /api/hall/ideas/[ideaId]/promote
 * Promote an idea from The Hall to Pattern Shop by creating a feature_node.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const user = await requireAuth()
    const { ideaId } = await params
    const { seedLevel, seedName, seedDescription } = await request.json()

    if (!ideaId) {
      return Response.json({ error: 'Idea ID is required' }, { status: 400 })
    }
    if (!seedLevel || !['epic', 'feature'].includes(seedLevel)) {
      return Response.json({ error: 'seedLevel must be "epic" or "feature"' }, { status: 400 })
    }
    if (!seedName || typeof seedName !== 'string' || !seedName.trim()) {
      return Response.json({ error: 'seedName is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, project_id, status, promoted_to_seed_id')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return Response.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', idea.project_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if already promoted
    if (idea.status === 'promoted' || idea.promoted_to_seed_id) {
      return Response.json({ error: 'Idea is already promoted' }, { status: 400 })
    }

    // Check promotable status
    if (!PROMOTABLE_STATUSES.includes(idea.status as IdeaStatus)) {
      return Response.json(
        { error: `Cannot promote idea with status "${idea.status}"` },
        { status: 400 }
      )
    }

    // Get max position for root-level nodes of this level in the project
    const { data: maxPosRow } = await supabase
      .from('feature_nodes')
      .select('position')
      .eq('project_id', idea.project_id)
      .eq('level', seedLevel)
      .is('parent_id', null)
      .is('deleted_at', null)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosRow?.position ?? -1) + 1

    // Create feature_node (seed) in Pattern Shop
    const { data: seed, error: seedError } = await supabase
      .from('feature_nodes')
      .insert({
        project_id: idea.project_id,
        title: seedName.trim(),
        description: seedDescription?.trim() || null,
        level: seedLevel,
        status: 'not_started',
        position: nextPosition,
        created_by: user.id,
        hall_idea_id: idea.id,
      })
      .select('id')
      .single()

    if (seedError || !seed) {
      console.error('Error creating seed:', seedError)
      return Response.json({ error: 'Failed to create seed' }, { status: 500 })
    }

    // Update idea: mark as promoted and link to seed
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        status: 'promoted' as IdeaStatus,
        promoted_to_seed_id: seed.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)

    if (updateError) {
      console.error('Error updating idea status:', updateError)
      // Seed was created but idea not updated — not ideal but recoverable
    }

    return Response.json({
      success: true,
      seedId: seed.id,
      ideaId: idea.id,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

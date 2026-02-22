import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { markdownToTipTap } from '@/lib/agent/markdown-to-tiptap'
import type { Json } from '@/types/database'

/**
 * POST /api/agent/room/apply-draft
 * Apply a generated blueprint draft (markdown) to a blueprint's content.
 * Converts markdown to TipTap JSON and saves.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { blueprintId, projectId, markdownContent } = await request.json()

    if (!blueprintId || !projectId || !markdownContent) {
      return Response.json(
        { error: 'blueprintId, projectId, and markdownContent are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Verify blueprint exists and belongs to project
    const { data: blueprint } = await supabase
      .from('blueprints')
      .select('id, blueprint_type')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!blueprint) {
      return Response.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    // Convert markdown to TipTap JSON
    const content = markdownToTipTap(markdownContent)

    // Update blueprint content
    const { error: updateErr } = await supabase
      .from('blueprints')
      .update({ content: content as unknown as Json })
      .eq('id', blueprintId)

    if (updateErr) {
      console.error('Error applying draft:', updateErr)
      return Response.json({ error: 'Failed to apply draft' }, { status: 500 })
    }

    // Log activity (fire-and-forget)
    supabase.from('blueprint_activities').insert({
      blueprint_id: blueprintId,
      user_id: user.id,
      action: 'content_updated' as const,
      action_details: { source: 'agent_generation' },
    }).then()

    return Response.json({ success: true, content })
  } catch (err) {
    return handleAuthError(err)
  }
}

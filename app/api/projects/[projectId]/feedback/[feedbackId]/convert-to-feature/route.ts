import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import type { FeatureLevel } from '@/types/database'

const CHILD_LEVELS: Record<string, FeatureLevel | null> = {
  epic: 'feature',
  feature: 'sub_feature',
  sub_feature: 'task',
  task: null,
}

/**
 * POST /api/projects/[projectId]/feedback/[feedbackId]/convert-to-feature
 * Creates a feature node from feedback, links them, and marks feedback as converted.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; feedbackId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, feedbackId } = await params
    const body = await request.json()
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized for this project' }, { status: 403 })
    }

    // Verify feedback exists and isn't already converted to a feature
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('id, converted_to_feature_id')
      .eq('id', feedbackId)
      .eq('project_id', projectId)
      .single()

    if (!feedback) {
      return Response.json({ error: 'Feedback not found' }, { status: 404 })
    }

    if (feedback.converted_to_feature_id) {
      return Response.json({ error: 'Feedback already converted to a feature' }, { status: 409 })
    }

    // Validate fields
    const title = (body.title || '').trim()
    if (!title || title.length < 3 || title.length > 255) {
      return Response.json({ error: 'Title must be between 3 and 255 characters' }, { status: 400 })
    }

    const description = (body.description || '').trim()
    if (description.length < 10) {
      return Response.json({ error: 'Description must be at least 10 characters' }, { status: 400 })
    }

    const parentId = body.parent_id
    let level: FeatureLevel

    if (parentId) {
      // Determine child level from parent
      const { data: parent, error: parentErr } = await supabase
        .from('feature_nodes')
        .select('id, level, project_id')
        .eq('id', parentId)
        .is('deleted_at', null)
        .single()

      if (parentErr || !parent) {
        return Response.json({ error: 'Parent node not found' }, { status: 404 })
      }
      if (parent.project_id !== projectId) {
        return Response.json({ error: 'Parent node does not belong to this project' }, { status: 400 })
      }

      const childLevel = CHILD_LEVELS[parent.level]
      if (!childLevel) {
        return Response.json({ error: 'Cannot add children to task nodes' }, { status: 400 })
      }
      level = childLevel
    } else {
      // Root-level = epic
      level = 'epic'
    }

    // Calculate next position among siblings
    const posQuery = supabase
      .from('feature_nodes')
      .select('position')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('position', { ascending: false })
      .limit(1)

    if (parentId) {
      posQuery.eq('parent_id', parentId)
    } else {
      posQuery.is('parent_id', null)
    }

    const { data: posRows } = await posQuery
    const nextPosition = posRows && posRows.length > 0 ? posRows[0].position + 1 : 0

    // Create feature node
    const { data: featureNode, error: nodeErr } = await supabase
      .from('feature_nodes')
      .insert({
        project_id: projectId,
        parent_id: parentId || null,
        title,
        description,
        level,
        status: 'not_started' as const,
        position: nextPosition,
        created_by: user.id,
      })
      .select()
      .single()

    if (nodeErr) {
      console.error('Error creating feature node from feedback:', nodeErr)
      return Response.json({ error: 'Failed to create feature node' }, { status: 500 })
    }

    // Link feedback → feature and mark as converted
    const { data: updatedFeedback, error: fbErr } = await supabase
      .from('feedback_submissions')
      .update({
        converted_to_feature_id: featureNode.id,
        status: 'converted' as const,
      })
      .eq('id', feedbackId)
      .select()
      .single()

    if (fbErr) {
      console.error('Error linking feedback to feature:', fbErr)
    }

    return Response.json({
      featureNode,
      feedback: updatedFeedback || null,
    }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}

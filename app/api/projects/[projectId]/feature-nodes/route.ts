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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const { title, description, parentId } = await request.json()
    const supabase = createServiceClient()

    // Verify project membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json(
        { error: 'Not authorized for this project' },
        { status: 403 }
      )
    }

    let level: FeatureLevel

    if (parentId) {
      // Fetch parent to determine child level
      const { data: parent, error: parentErr } = await supabase
        .from('feature_nodes')
        .select('id, level, project_id')
        .eq('id', parentId)
        .is('deleted_at', null)
        .single()

      if (parentErr || !parent) {
        return Response.json(
          { error: 'Parent node not found' },
          { status: 404 }
        )
      }

      if (parent.project_id !== projectId) {
        return Response.json(
          { error: 'Parent node does not belong to this project' },
          { status: 400 }
        )
      }

      const childLevel = CHILD_LEVELS[parent.level]
      if (!childLevel) {
        return Response.json(
          { error: 'Task nodes cannot have children' },
          { status: 400 }
        )
      }

      level = childLevel
    } else {
      // Root-level node = epic
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

    const nextPosition = posRows && posRows.length > 0
      ? posRows[0].position + 1
      : 0

    // Insert the node
    const { data: node, error: insertErr } = await supabase
      .from('feature_nodes')
      .insert({
        project_id: projectId,
        parent_id: parentId || null,
        title: title?.trim() || 'Untitled',
        description: description?.trim() || null,
        level,
        status: 'not_started' as const,
        position: nextPosition,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Error creating feature node:', insertErr)
      return Response.json(
        { error: 'Failed to create feature node' },
        { status: 500 }
      )
    }

    return Response.json(node, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}

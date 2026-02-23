import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { logActivity } from '@/lib/activity/logging'
import type { Json } from '@/types/database'

/**
 * POST /api/projects/[projectId]/blueprints/[blueprintId]/versions/[versionNumber]/restore
 * Restore a blueprint to a previous version.
 * Creates a backup version of current content before restoring.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string; versionNumber: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId, versionNumber: versionStr } = await params
    const supabase = createServiceClient()

    const versionNumber = parseInt(versionStr, 10)
    if (isNaN(versionNumber) || versionNumber < 1) {
      return Response.json({ error: 'Invalid version number' }, { status: 400 })
    }

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

    // Get current blueprint content
    const { data: blueprint } = await supabase
      .from('blueprints')
      .select('id, content, status')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!blueprint) {
      return Response.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    // Get the version to restore
    const { data: targetVersion } = await supabase
      .from('blueprint_versions')
      .select('content, version_number')
      .eq('blueprint_id', blueprintId)
      .eq('version_number', versionNumber)
      .single()

    if (!targetVersion) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    // Get next version number
    const { data: latestVersion } = await supabase
      .from('blueprint_versions')
      .select('version_number')
      .eq('blueprint_id', blueprintId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1

    // Create backup version of current content
    const { error: backupError } = await supabase
      .from('blueprint_versions')
      .insert({
        blueprint_id: blueprintId,
        version_number: nextVersionNumber,
        content: blueprint.content as Json,
        created_by: user.id,
        trigger_type: 'restore',
        change_note: `Restored to version ${versionNumber} (backup of previous content)`,
      })

    if (backupError) {
      console.error('Error creating backup version:', backupError)
      return Response.json({ error: 'Failed to create backup' }, { status: 500 })
    }

    // Update blueprint content with restored version
    const { error: updateError } = await supabase
      .from('blueprints')
      .update({ content: targetVersion.content as Json })
      .eq('id', blueprintId)

    if (updateError) {
      console.error('Error restoring blueprint:', updateError)
      return Response.json({ error: 'Failed to restore blueprint' }, { status: 500 })
    }

    // Log activity (fire-and-forget)
    supabase.from('blueprint_activities').insert({
      blueprint_id: blueprintId,
      user_id: user.id,
      action: 'content_updated' as const,
      action_details: { source: 'restore', restored_from_version: versionNumber },
    }).then()

    logActivity({
      projectId,
      userId: user.id,
      entityType: 'blueprint',
      entityId: blueprintId,
      action: 'restored_version',
      details: { restored_from_version: versionNumber, new_version_number: nextVersionNumber },
    })

    return Response.json({
      message: `Restored to version ${versionNumber}`,
      new_version_number: nextVersionNumber,
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

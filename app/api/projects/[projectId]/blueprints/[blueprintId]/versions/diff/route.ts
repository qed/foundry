import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { computeBlueprintDiff, extractTextFromContent } from '@/lib/blueprints/version-utils'

/**
 * GET /api/projects/[projectId]/blueprints/[blueprintId]/versions/diff
 * Compare two blueprint versions.
 * Query: from_version (number), to_version (number, or "current" for current content)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; blueprintId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId, blueprintId } = await params
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

    const { searchParams } = new URL(request.url)
    const fromVersionStr = searchParams.get('from_version')
    const toVersionStr = searchParams.get('to_version')

    if (!fromVersionStr || !toVersionStr) {
      return Response.json(
        { error: 'from_version and to_version are required' },
        { status: 400 }
      )
    }

    const fromVersionNum = parseInt(fromVersionStr, 10)
    const isCurrentTo = toVersionStr === 'current'
    const toVersionNum = isCurrentTo ? -1 : parseInt(toVersionStr, 10)

    if (isNaN(fromVersionNum) || fromVersionNum < 1) {
      return Response.json({ error: 'Invalid from_version' }, { status: 400 })
    }
    if (!isCurrentTo && (isNaN(toVersionNum) || toVersionNum < 1)) {
      return Response.json({ error: 'Invalid to_version' }, { status: 400 })
    }

    // Get the "from" version
    const { data: fromVersion } = await supabase
      .from('blueprint_versions')
      .select('version_number, content, created_at')
      .eq('blueprint_id', blueprintId)
      .eq('version_number', fromVersionNum)
      .single()

    if (!fromVersion) {
      return Response.json({ error: 'From version not found' }, { status: 404 })
    }

    // Get the "to" content (either a version or current blueprint content)
    let toContent: unknown
    let toVersionNumber: number | 'current'

    if (isCurrentTo) {
      const { data: blueprint } = await supabase
        .from('blueprints')
        .select('content')
        .eq('id', blueprintId)
        .eq('project_id', projectId)
        .single()

      if (!blueprint) {
        return Response.json({ error: 'Blueprint not found' }, { status: 404 })
      }
      toContent = blueprint.content
      toVersionNumber = 'current'
    } else {
      const { data: toVersion } = await supabase
        .from('blueprint_versions')
        .select('version_number, content')
        .eq('blueprint_id', blueprintId)
        .eq('version_number', toVersionNum)
        .single()

      if (!toVersion) {
        return Response.json({ error: 'To version not found' }, { status: 404 })
      }
      toContent = toVersion.content
      toVersionNumber = toVersion.version_number
    }

    // Compute diff
    const diff = computeBlueprintDiff(fromVersion.content, toContent)

    // Stats
    const additions = diff.filter((d) => d.type === 'addition').length
    const deletions = diff.filter((d) => d.type === 'deletion').length
    const fromText = extractTextFromContent(fromVersion.content)
    const toText = extractTextFromContent(toContent)

    return Response.json({
      from: { version_number: fromVersion.version_number },
      to: { version_number: toVersionNumber },
      diff,
      stats: {
        additions,
        deletions,
        from_chars: fromText.length,
        to_chars: toText.length,
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

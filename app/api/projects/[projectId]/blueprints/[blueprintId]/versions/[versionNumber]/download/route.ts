import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { contentToMarkdown } from '@/lib/blueprints/version-utils'

/**
 * GET /api/projects/[projectId]/blueprints/[blueprintId]/versions/[versionNumber]/download
 * Download a blueprint version as a markdown file.
 */
export async function GET(
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

    // Get blueprint title
    const { data: blueprint } = await supabase
      .from('blueprints')
      .select('title')
      .eq('id', blueprintId)
      .eq('project_id', projectId)
      .single()

    if (!blueprint) {
      return Response.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    // Get the version
    const { data: version } = await supabase
      .from('blueprint_versions')
      .select('content, created_at, created_by')
      .eq('blueprint_id', blueprintId)
      .eq('version_number', versionNumber)
      .single()

    if (!version) {
      return Response.json({ error: 'Version not found' }, { status: 404 })
    }

    // Get author name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', version.created_by)
      .single()

    // Convert content to markdown
    const bodyMarkdown = contentToMarkdown(version.content)

    const header = [
      `# ${blueprint.title}`,
      '',
      `**Version:** ${versionNumber}`,
      `**Date:** ${new Date(version.created_at).toISOString().split('T')[0]}`,
      `**Author:** ${profile?.display_name || 'Unknown'}`,
      '',
      '---',
      '',
    ].join('\n')

    const markdown = header + bodyMarkdown

    // Sanitize filename
    const safeName = blueprint.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50)

    const filename = `${safeName}_v${versionNumber}.md`

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return handleAuthError(err)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getProjectAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { ForbiddenError, handleAuthError } from '@/lib/auth/errors'
import { logActivity } from '@/lib/activity/logging'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const { project, user, isOrgAdmin, isProjectLeader } =
      await getProjectAndValidateAccess(projectId)

    if (!isOrgAdmin && !isProjectLeader) {
      throw new ForbiddenError('Only org admins and project leaders can restore projects')
    }

    if (!project.is_archived) {
      return NextResponse.json(
        { error: 'Project is not archived' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: updated, error } = await supabase
      .from('projects')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
      })
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error

    await logActivity({
      projectId,
      userId: user.id,
      entityType: 'project',
      entityId: projectId,
      action: 'project_restored',
      details: { project_name: project.name },
      request,
    })

    return NextResponse.json({ success: true, project: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}

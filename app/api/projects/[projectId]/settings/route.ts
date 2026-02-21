import { NextRequest, NextResponse } from 'next/server'
import { requireProjectPermission } from '@/lib/auth/permission-guards'
import { ProjectPermissions } from '@/lib/permissions/definitions'
import { handleAuthError } from '@/lib/auth/errors'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const _body = await request.json()

    // Require MANAGE_PROJECT permission
    const { project } = await requireProjectPermission(
      projectId,
      ProjectPermissions.MANAGE_PROJECT
    )

    // TODO: Update project settings in a future phase
    return NextResponse.json({ success: true, project })
  } catch (error) {
    return handleAuthError(error)
  }
}

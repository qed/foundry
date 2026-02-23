import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  try {
    const { orgId, invitationId } = await params
    const { isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      return Response.json({ error: 'Only admins can revoke invitations' }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('id', invitationId)
      .eq('organization_id', orgId)
      .single()

    if (!invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return Response.json(
        { error: 'Can only revoke pending invitations' },
        { status: 400 }
      )
    }

    await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)

    return Response.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}

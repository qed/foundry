import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { sendEmail } from '@/lib/email/service'
import { invitationEmailHtml, invitationEmailText } from '@/lib/email/templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  try {
    const { orgId, invitationId } = await params
    const { org, user, isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      return Response.json({ error: 'Only admins can resend invitations' }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('organization_id', orgId)
      .single()

    if (!invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return Response.json(
        { error: 'Can only resend pending invitations' },
        { status: 400 }
      )
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.display_name || 'A team member'

    const acceptUrl = `${APP_URL}/invitations/${invitation.token}`
    const expiresDate = new Date(invitation.expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    await sendEmail({
      to: invitation.email,
      subject: `Reminder: You're invited to join ${org.name} on Helix Foundry`,
      html: invitationEmailHtml({
        inviterName,
        organizationName: org.name,
        role: invitation.role,
        acceptUrl,
        expiresDate,
      }),
      text: invitationEmailText({
        inviterName,
        organizationName: org.name,
        role: invitation.role,
        acceptUrl,
        expiresDate,
      }),
      userId: user.id,
      eventType: 'invitation_resend',
      templateName: 'invitation',
    })

    return Response.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}

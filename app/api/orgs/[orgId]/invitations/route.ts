import { NextRequest } from 'next/server'
import { getOrgAndValidateAccess } from '@/lib/auth/org-validation'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { canAddSeat } from '@/lib/billing/seats'
import { sendEmail } from '@/lib/email/service'
import { invitationEmailHtml, invitationEmailText } from '@/lib/email/templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    await getOrgAndValidateAccess(orgId)

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let query = supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invitations, error } = await query

    if (error) {
      return Response.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Enrich with inviter names
    const inviterIds = [...new Set((invitations || []).map((i) => i.invited_by))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', inviterIds)

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name]))

    const enriched = (invitations || []).map((inv) => ({
      ...inv,
      invited_by_name: profileMap.get(inv.invited_by) || 'Unknown',
    }))

    return Response.json({ invitations: enriched })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const { org, user, isAdmin } = await getOrgAndValidateAccess(orgId)

    if (!isAdmin) {
      return Response.json({ error: 'Only admins can send invitations' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (role && !['admin', 'member'].includes(role)) {
      return Response.json({ error: 'Role must be admin or member' }, { status: 400 })
    }

    // Check seat limit before creating invitation
    const seatCheck = await canAddSeat(orgId)
    if (!seatCheck.allowed) {
      return Response.json({ error: seatCheck.reason }, { status: 403 })
    }

    const supabase = createServiceClient()
    const normalizedEmail = email.trim().toLowerCase()

    // Check if already a member (by checking auth users with this email)
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const existingUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('org_members')
        .select('id')
        .eq('org_id', orgId)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        return Response.json(
          { error: 'This user is already a member of the organization' },
          { status: 409 }
        )
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('email', normalizedEmail)
      .single()

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return Response.json(
          { error: 'An invitation is already pending for this email' },
          { status: 409 }
        )
      }
      // If previously revoked/expired, delete it so a new one can be created
      await supabase.from('invitations').delete().eq('id', existingInvite.id)
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.display_name || 'A team member'

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        organization_id: orgId,
        email: normalizedEmail,
        role: role || 'member',
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[Invitations] Failed to create:', error)
      return Response.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Send invitation email
    const acceptUrl = `${APP_URL}/invitations/${invitation.token}`
    const expiresDate = new Date(invitation.expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    sendEmail({
      to: normalizedEmail,
      subject: `You're invited to join ${org.name} on Helix Foundry`,
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
      eventType: 'invitation',
      templateName: 'invitation',
    }).catch(() => {})

    return Response.json(invitation, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}

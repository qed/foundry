import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return Response.json({ valid: false, invitation: null })
  }

  const supabase = createServiceClient()

  const { data: invitation } = await supabase
    .from('invitations')
    .select('email, role, expires_at, status, organization_id, invited_by')
    .eq('token', token)
    .single()

  if (!invitation) {
    return Response.json({ valid: false, invitation: null })
  }

  // Fetch org name separately
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', invitation.organization_id)
    .single()

  // Check expiration
  const isExpired = invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()
  const isValid = invitation.status === 'pending' && !isExpired

  // Get inviter name
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', invitation.invited_by)
    .single()

  return Response.json({
    valid: isValid,
    invitation: {
      email: invitation.email,
      organization_name: org?.name || 'Unknown Organization',
      role: invitation.role,
      inviter_name: inviterProfile?.display_name || 'A team member',
      expires_at: invitation.expires_at,
      status: invitation.status,
    },
  })
}

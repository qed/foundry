import { AcceptInvitationClient } from '@/components/invitations/accept-invitation-client'

interface AcceptPageProps {
  params: Promise<{ token: string }>
}

export default async function AcceptInvitationPage({ params }: AcceptPageProps) {
  const { token } = await params

  return <AcceptInvitationClient token={token} />
}

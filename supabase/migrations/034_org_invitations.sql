-- Phase 114: Team Invitation System
-- Email-based invitation system for organization membership

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, email),
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  CHECK (role IN ('admin', 'member'))
);

-- Indexes
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(organization_id, status);
CREATE INDEX idx_invitations_created_at ON invitations(created_at DESC);

-- Auto-update trigger
CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view invitations for their org
CREATE POLICY "Org members can view invitations"
  ON invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = invitations.organization_id
        AND org_members.user_id = auth.uid()
    )
  );

-- Org admins can create invitations
CREATE POLICY "Org admins can insert invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = invitations.organization_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
    )
  );

-- Org admins can update invitations (revoke, etc.)
CREATE POLICY "Org admins can update invitations"
  ON invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = invitations.organization_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
    )
  );

-- Org admins can delete invitations
CREATE POLICY "Org admins can delete invitations"
  ON invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = invitations.organization_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
    )
  );

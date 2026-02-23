-- Phase 115: Seat Management & Billing Schema

CREATE TABLE org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  seat_limit INTEGER NOT NULL DEFAULT 3,
  current_seats INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  billing_email VARCHAR(255),
  billing_status VARCHAR(50) NOT NULL DEFAULT 'active',
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (plan IN ('free', 'pro', 'enterprise')),
  CHECK (billing_status IN ('active', 'past_due', 'unpaid', 'cancelled', 'trialing')),
  CHECK (seat_limit > 0),
  CHECK (current_seats >= 0)
);

CREATE INDEX idx_org_subscriptions_org ON org_subscriptions(organization_id);
CREATE INDEX idx_org_subscriptions_plan ON org_subscriptions(plan);

-- Auto-update trigger
CREATE TRIGGER set_org_subscriptions_updated_at
  BEFORE UPDATE ON org_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's subscription
CREATE POLICY "Org members can view subscription"
  ON org_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_subscriptions.organization_id
        AND org_members.user_id = auth.uid()
    )
  );

-- Org admins can update subscription
CREATE POLICY "Org admins can update subscription"
  ON org_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_subscriptions.organization_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
    )
  );

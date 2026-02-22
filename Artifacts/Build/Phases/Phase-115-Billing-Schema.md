# Phase 115 - Seat Management & Billing Schema

## Objective
Implement organization subscription schema with seat limits, seat enforcement, and billing information storage for subscription management.

## Prerequisites
- Phase 005 (Organizations & Project Membership) completed
- Phase 113 (Organization Console) completed
- Phase 114 (Invitations) completed

## Context
SaaS platforms need seat-based billing to control costs and enforce subscription limits. The billing schema tracks organization subscriptions, current seat usage, and integrates with payment processing (Stripe).

## Detailed Requirements

### Database Schema

#### org_subscriptions table
```sql
CREATE TABLE org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  seat_limit INTEGER NOT NULL,
  current_seats INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  billing_email VARCHAR(255),
  billing_status VARCHAR(50) DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT TRUE,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (plan IN ('free', 'pro', 'enterprise')),
  CHECK (billing_status IN ('active', 'past_due', 'unpaid', 'cancelled', 'trialing')),
  CHECK (seat_limit > 0),
  CHECK (current_seats >= 0 AND current_seats <= seat_limit)
);

CREATE INDEX idx_org_subscriptions_org ON org_subscriptions(organization_id);
CREATE INDEX idx_org_subscriptions_stripe_customer ON org_subscriptions(stripe_customer_id);
CREATE INDEX idx_org_subscriptions_plan ON org_subscriptions(plan);
```

### Plan Definitions

#### Free Plan
- Seat limit: 3
- Cost: $0
- Features:
  - All core features
  - 5GB storage
  - Community support
- No credit card required

#### Pro Plan
- Seat limit: 10
- Cost: $99/month (billed annually: $990)
- Features:
  - All Free features
  - 100GB storage
  - Email support
  - API access
  - Advanced reporting

#### Enterprise Plan
- Seat limit: Unlimited (or custom)
- Cost: Custom pricing
- Features:
  - All Pro features
  - Unlimited storage
  - Phone + email support
  - Custom integrations
  - SLA

### Seat Enforcement

#### When Adding Member
```typescript
async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: string
) {
  // Get current subscription
  const subscription = await getOrgSubscription(organizationId);

  // Check seat limit
  if (subscription.current_seats >= subscription.seat_limit) {
    throw new Error(
      `Cannot add member. Seat limit (${subscription.seat_limit}) reached.`
    );
  }

  // Add member
  await createOrgMembership({
    organization_id: organizationId,
    user_id: userId,
    role,
  });

  // Increment current_seats
  await updateSubscription(organizationId, {
    current_seats: subscription.current_seats + 1,
  });
}
```

#### When Removing Member
```typescript
async function removeOrganizationMember(
  organizationId: string,
  userId: string
) {
  // Remove member
  await deleteOrgMembership(organizationId, userId);

  // Decrement current_seats
  const subscription = await getOrgSubscription(organizationId);
  await updateSubscription(organizationId, {
    current_seats: Math.max(0, subscription.current_seats - 1),
  });
}
```

#### When Accepting Invitation
Same as adding member - increment seat count.

### Billing Information

#### payment_methods table (Placeholder)
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  type VARCHAR(50),
  last_four VARCHAR(4),
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### invoices table (Placeholder)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50),
  issued_date TIMESTAMP,
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  pdf_url VARCHAR(2048),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subscription Lifecycle

#### Create Organization Subscription
When organization created, create free plan subscription:
```typescript
async function createOrgSubscription(organizationId: string) {
  await db.insert('org_subscriptions', {
    organization_id: organizationId,
    plan: 'free',
    seat_limit: 3,
    current_seats: 1, // Owner counts as first seat
    billing_status: 'active',
  });
}
```

#### Upgrade Plan
```typescript
async function upgradePlan(
  organizationId: string,
  newPlan: string
) {
  const plans = {
    pro: { seat_limit: 10 },
    enterprise: { seat_limit: 999 }, // Effectively unlimited
  };

  const subscription = await getOrgSubscription(organizationId);

  // Check if downgrade would violate seat count
  if (newPlan === 'free' && subscription.current_seats > 3) {
    throw new Error(
      'Cannot downgrade to free plan. Remove members to <= 3 seats.'
    );
  }

  await updateSubscription(organizationId, {
    plan: newPlan,
    seat_limit: plans[newPlan].seat_limit,
    stripe_subscription_id: stripeSubId, // From Stripe API
    current_period_start: new Date(),
    current_period_end: addMonths(new Date(), 1),
  });
}
```

### Billing Dashboard UI

#### UsageTab Component (Phase 113)
```typescript
interface UsageTabProps {
  organization: Organization;
  subscription: Subscription;
  onUpgradePlan?: () => void;
}

export function UsageTab({
  organization,
  subscription,
  onUpgradePlan,
}: UsageTabProps) {
  // Seats: 3 / 10 used
  // Storage: 45 GB / 100 GB
  // Plan: Pro
  // Billing period: Jan 1 - Jan 31
  // Upgrade button (if on lower plan)
  // Manage billing link
}
```

#### Upgrade Plan Modal
- Show current plan details
- Show target plan details
- Price and features comparison
- Billing frequency selector (monthly/annual)
- "Upgrade" button
- Confirmation: charge amount and billing period

## File Structure
```
src/
├── lib/
│   ├── billing/
│   │   ├── subscriptions.ts    (subscription queries/mutations)
│   │   ├── seats.ts            (seat enforcement)
│   │   ├── plans.ts            (plan definitions)
│   │   └── stripe.ts           (Stripe integration, future)
│   └── types/
│       └── billing.ts          (TypeScript types)
├── components/
│   ├── billing/
│   │   ├── UpgradePlanModal.tsx
│   │   ├── SeatUsageCard.tsx
│   │   ├── StorageUsageCard.tsx
│   │   ├── BillingStatus.tsx
│   │   └── PlanSelector.tsx
│   └── org-console/
│       └── UsageTab.tsx        (integrate into console)
└── app/api/
    └── organizations/
        ├── [slug]/
        │   └── subscription/
        │       ├── route.ts    (GET subscription)
        │       ├── upgrade/
        │       │   └── route.ts
        │       ├── usage/
        │       │   └── route.ts
        │       └── billing/
        │           └── route.ts
        └── plans/
            └── route.ts        (GET available plans)
```

## API Routes

### GET /api/organizations/[slug]/subscription
Get organization subscription:

```
Headers: Authorization: Bearer token

Response:
{
  id: string,
  organization_id: string,
  plan: 'free' | 'pro' | 'enterprise',
  seat_limit: number,
  current_seats: number,
  billing_status: string,
  auto_renew: boolean,
  current_period_start: string,
  current_period_end: string,
  stripe_customer_id?: string,
  features: {
    storage_limit_gb: number,
    api_access: boolean,
    support_level: string
  }
}
```

### GET /api/organizations/[slug]/usage
Get usage statistics:

```
Response:
{
  seats: {
    used: number,
    limit: number,
    percentage: number
  },
  storage: {
    used_bytes: number,
    limit_bytes: number,
    percentage: number
  },
  projects: {
    active: number,
    archived: number
  }
}
```

### POST /api/organizations/[slug]/subscription/upgrade
Upgrade organization plan:

```
Headers: Authorization: Bearer token

Body:
{
  plan: 'pro' | 'enterprise',
  billing_frequency?: 'monthly' | 'annual'
}

Response:
{
  success: true,
  subscription: Subscription,
  stripe_checkout_session_id?: string  // For payment
}

Errors:
- 400: Invalid plan
- 403: Not organization admin
- 409: Cannot downgrade, too many seats
```

### GET /api/organizations/plans
Get available plans:

```
Response:
{
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      seat_limit: 3,
      features: [...]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 99,
      seat_limit: 10,
      features: [...]
    },
    ...
  ]
}
```

## Acceptance Criteria
- [ ] org_subscriptions table created with constraints
- [ ] All plans defined with seat limits
- [ ] Subscription created on organization creation
- [ ] Seat enforcement prevents over-limit additions
- [ ] Seat count increments/decrements correctly
- [ ] Cannot downgrade if current_seats exceeds new limit
- [ ] Billing status tracked and updated
- [ ] Stripe integration fields present (but not implemented in this phase)
- [ ] UsageTab shows accurate seat usage
- [ ] UsageTab shows seat limit
- [ ] UsageTab shows storage usage
- [ ] UpgradePlanModal functional
- [ ] Can upgrade to higher plan
- [ ] Cannot downgrade with too many seats
- [ ] Billing period dates displayed
- [ ] API endpoints return correct data
- [ ] Authorization checks for admin access
- [ ] Performance: queries < 100ms
- [ ] Email billing@ address configurable
- [ ] Plan definitions easily updatable

## Testing Instructions

### Database Tests
```sql
-- Create subscription
INSERT INTO org_subscriptions
  (organization_id, plan, seat_limit, current_seats)
VALUES
  ('{org-id}', 'free', 3, 1);

-- Check seat constraint
UPDATE org_subscriptions
SET current_seats = 5
WHERE organization_id = '{org-id}';
-- Should fail (exceeds seat_limit)

-- Upgrade plan
UPDATE org_subscriptions
SET plan = 'pro', seat_limit = 10
WHERE organization_id = '{org-id}';
```

### API Tests
```bash
# Get subscription
curl http://localhost:3000/api/organizations/{slug}/subscription \
  -H "Authorization: Bearer {token}"

# Get usage
curl http://localhost:3000/api/organizations/{slug}/usage \
  -H "Authorization: Bearer {token}"

# Get available plans
curl http://localhost:3000/api/organizations/plans

# Upgrade plan
curl -X POST http://localhost:3000/api/organizations/{slug}/subscription/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"plan": "pro"}'
```

### Manual Testing
1. Create new organization
2. Verify subscription created with free plan (3 seats)
3. Navigate to organization console > Usage tab
4. Verify seats showing "1 / 3"
5. Add two members
6. Verify seats showing "3 / 3"
7. Try to add fourth member
8. Verify error: "Seat limit reached"
9. Click "Upgrade Plan"
10. Select Pro plan (10 seats)
11. Click upgrade
12. Verify plan changed to Pro
13. Verify seat limit now 10
14. Add more members to test new limit
15. Try to downgrade to free with 5 members
16. Verify error: "Too many seats for free plan"
17. Remove members to 3
18. Try to downgrade again
19. Verify downgrade succeeds
20. Verify all counts update correctly

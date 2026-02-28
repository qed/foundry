# Phase 114 - Team Invitation System

## Objective
Implement email-based invitation system allowing organization admins to invite new members with role assignment, tracking pending invitations, and accepting invitations via unique links.

## Prerequisites
- Phase 113 (Organization Console) completed
- Phase 108 (Email Notifications) completed
- Email service (Resend/SendGrid) configured

## Context
Organizations need ability to add team members efficiently. The invitation system provides secure token-based invitations with email delivery, ensuring only intended users can join with correct permissions.

## Detailed Requirements

### Database Schema

#### invitations table
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'pending',
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  accepted_at TIMESTAMP,
  UNIQUE(organization_id, email),
  CHECK (status IN ('pending', 'accepted', 'expired', 'rejected')),
  CHECK (role IN ('admin', 'editor', 'viewer'))
);

CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_created_at ON invitations(created_at DESC);
```

### Invitation Flow

#### Step 1: Send Invitation
1. Admin enters email and selects role
2. Click "Send Invite" button
3. Validation: email format, not already member, not duplicate pending invite
4. Create invitation record with unique token
5. Send invitation email with acceptance link
6. Show confirmation: "Invitation sent to user@example.com"

#### Step 2: Accept Invitation
1. User receives email with link: `https://app.helix-foundry.com/invitations/{token}`
2. User clicks link (or manually navigates with token)
3. If not logged in: redirect to login first
4. Show invitation acceptance page with:
   - Organization name
   - Inviter name
   - Assigned role (read-only)
   - "Accept Invitation" button
5. Click accept: Create organization membership and mark invitation accepted
6. Redirect to organization

#### Step 3: Manage Invitations
- Org console "Members" tab shows pending invitations
- Columns: Email, Role, Invited By, Invited Date, Expires, Actions
- Actions: Resend (email), Revoke (delete), View details
- Auto-revoke expired invitations (or show as expired)

### Invitation Management UI

#### PendingInvitationsSection Component
```typescript
interface PendingInvitationsProps {
  orgSlug: string;
  invitations: Invitation[];
  onResend: (invitationId: string) => void;
  onRevoke: (invitationId: string) => void;
}

export function PendingInvitationsSection({
  orgSlug,
  invitations,
  onResend,
  onRevoke,
}: PendingInvitationsProps) {
  // List pending invitations
  // Resend/revoke buttons
  // Expiration dates
}
```

#### InviteUserDialog Component
```typescript
interface InviteUserDialogProps {
  orgSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
  isLoading?: boolean;
}

export function InviteUserDialog({
  orgSlug,
  isOpen,
  onClose,
  onInvite,
  isLoading = false,
}: InviteUserDialogProps) {
  // Email input
  // Role dropdown
  // Invite button
  // Validation
}
```

#### AcceptInvitationPage Component
```typescript
// Route: /invitations/[token]
// Shows invitation details
// Accept button
// Links to login if needed
```

### Email Template

#### Invitation Email Template
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>You've been invited to {{organizationName}}</h2>
    <p>{{inviterName}} invited you to join {{organizationName}} on Helix Foundry as an {{role}}.</p>
    <p>You have 30 days to accept this invitation.</p>
    <a href="{{acceptUrl}}" class="button">Accept Invitation</a>
    <div class="footer">
      <p>If you don't recognize this invitation, you can safely ignore this email.</p>
      <p>This invitation expires on {{expiresDate}}.</p>
    </div>
  </div>
</body>
</html>
```

## File Structure
```
src/
├── app/
│   ├── invitations/
│   │   └── [token]/
│   │       └── page.tsx         (accept invitation page)
│   └── org/
│       └── [slug]/
│           └── settings/
│               └── page.tsx     (includes members tab with invites)
├── components/
│   ├── invitations/
│   │   ├── InviteUserDialog.tsx
│   │   ├── PendingInvitationsSection.tsx
│   │   ├── AcceptInvitationPage.tsx
│   │   ├── InvitationCard.tsx
│   │   └── ResendInvitationDialog.tsx
│   └── dialogs/
│       ├── RevokeInvitationDialog.tsx
│       └── ConfirmAcceptDialog.tsx
├── lib/
│   ├── invitations/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── email.ts
│   └── types/
│       └── invitations.ts
└── app/api/
    └── invitations/
        ├── route.ts             (GET/POST invitations)
        ├── [id]/
        │   ├── route.ts         (DELETE revoke)
        │   └── resend/
        │       └── route.ts     (POST resend)
        └── accept/
            └── route.ts         (POST accept)
```

## API Routes

### POST /api/invitations
Send invitation:

```
Headers: Authorization: Bearer token

Body:
{
  organization_id: string,
  email: string,
  role: 'admin' | 'editor' | 'viewer'
}

Response:
{
  id: string,
  email: string,
  role: string,
  token: string,
  expires_at: string,
  status: 'pending'
}

Errors:
- 400: Invalid email or role
- 401: Unauthorized
- 403: Not organization admin
- 409: User already member or invitation already sent
```

### GET /api/invitations
List invitations for organization:

```
Query params:
- organization_id: string (required)
- status?: string (pending, accepted, expired)
- limit: number (default 20)

Response:
{
  invitations: [
    {
      id: string,
      email: string,
      role: string,
      invited_by: { name },
      status: string,
      created_at: string,
      expires_at: string
    }
  ],
  total_count: number
}
```

### DELETE /api/invitations/[id]
Revoke invitation:

```
Headers: Authorization: Bearer token

Response: { success: true }

Errors:
- 403: Not organization admin
- 404: Invitation not found
```

### POST /api/invitations/[id]/resend
Resend invitation email:

```
Headers: Authorization: Bearer token

Response:
{
  success: true,
  sent_at: string
}
```

### POST /api/invitations/accept
Accept invitation:

```
Headers: Authorization: Bearer token (authenticated user)

Body:
{
  token: string
}

Response:
{
  success: true,
  organization_id: string,
  message: "Welcome to Organization!"
}

Errors:
- 400: Invalid or expired token
- 401: Unauthorized
- 409: Invitation already accepted or revoked
```

### GET /api/invitations/validate-token
Validate invitation token (before login):

```
Query params:
- token: string (required)

Response:
{
  valid: boolean,
  invitation: {
    email: string,
    organization_name: string,
    role: string,
    inviter_name: string,
    expires_at: string
  } | null
}
```

## Invitation Validation

### Acceptance Requirements
- Logged-in user email must match invitation email
- Invitation must not be expired (expires_at > now)
- Invitation must be pending status
- Organization must still exist

### Pre-Invitation Checks
```typescript
function validateInvitation(
  email: string,
  organizationId: string
): ValidationResult {
  // Email format valid
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // User not already member
  if (isOrgMember(email, organizationId)) {
    return { valid: false, error: 'User is already an organization member' };
  }

  // No pending invitation already
  if (hasPendingInvitation(email, organizationId)) {
    return { valid: false, error: 'Invitation already pending for this email' };
  }

  return { valid: true };
}
```

## Acceptance Criteria
- [ ] invitations table created with proper constraints
- [ ] Unique constraint on (organization_id, email) prevents duplicates
- [ ] InviteUserDialog functional with email and role inputs
- [ ] Invitation email sent with valid token
- [ ] AcceptInvitationPage renders with invitation details
- [ ] Accept button creates organization membership
- [ ] Invitation marked as accepted with timestamp
- [ ] Expired invitations handled gracefully
- [ ] Revoke button removes invitation
- [ ] Resend button re-sends invitation email
- [ ] Token-based acceptance secure
- [ ] User cannot accept invitation for different email
- [ ] Pending invitations visible in org console
- [ ] Pending invitations expiration shown
- [ ] Auto-cleanup of expired invitations
- [ ] Email template matches branding
- [ ] Acceptance link works after logout
- [ ] Cannot accept same invitation twice
- [ ] Role properly assigned on acceptance
- [ ] Toast notifications show on success/error
- [ ] Mobile responsive

## Testing Instructions

### Database Tests
```sql
-- Create invitation
INSERT INTO invitations
  (organization_id, email, role, invited_by, token)
VALUES
  ('{org-id}', 'newuser@example.com', 'editor', '{admin-id}', '{token-uuid}');

-- Test unique constraint
INSERT INTO invitations
  (organization_id, email, role, invited_by)
VALUES
  ('{org-id}', 'newuser@example.com', 'editor', '{admin-id}');
-- Should fail

-- Accept invitation
UPDATE invitations
SET status = 'accepted', accepted_by = '{user-id}', accepted_at = NOW()
WHERE token = '{token-uuid}';
```

### API Tests
```bash
# Send invitation
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "organization_id": "{org-id}",
    "email": "newuser@example.com",
    "role": "editor"
  }'

# Get invitations
curl http://localhost:3000/api/invitations?organization_id={org-id} \
  -H "Authorization: Bearer {token}"

# Validate token (public endpoint)
curl "http://localhost:3000/api/invitations/validate-token?token={token-uuid}"

# Accept invitation
curl -X POST http://localhost:3000/api/invitations/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {logged-in-user-token}" \
  -d '{"token": "{token-uuid}"}'

# Revoke invitation
curl -X DELETE http://localhost:3000/api/invitations/{invitation-id} \
  -H "Authorization: Bearer {admin-token}"

# Resend invitation
curl -X POST http://localhost:3000/api/invitations/{invitation-id}/resend \
  -H "Authorization: Bearer {admin-token}"
```

### Manual Testing
1. Login as organization admin
2. Navigate to /org/[slug]/settings#members
3. Click "Invite User" button
4. Enter email and select role
5. Click "Send Invitation"
6. Verify success message
7. Check email inbox for invitation email
8. Click invitation link
9. If not logged in, redirect to login
10. Login as invited user (with matching email)
11. Accept invitation page appears
12. Click "Accept Invitation"
13. Verify added to organization
14. Verify correct role assigned
15. Go back to members tab
16. Verify new member listed
17. Verify invitation no longer in pending
18. Test resend invitation (resend email)
19. Test revoke invitation
20. Test invitation expiration (modify expires_at in DB)
21. Try to accept expired invitation → error
22. Test duplicate invitation prevention
23. Test invalid email format
24. Test with multiple invitations

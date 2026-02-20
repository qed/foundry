# Phase 116 - User Profile & Settings

## Objective
Implement user profile editing, settings management, password change, notification preferences, and theme preferences accessible at `/settings/profile`.

## Prerequisites
- Phase 004 (Authentication & User Management) completed
- Phase 107 (Notification System) completed
- User authentication system functional

## Context
Users need ability to manage their profile information, security, and preferences. A dedicated settings page provides centralized control over personal account configuration.

## Detailed Requirements

### Database Schema Changes

#### Update auth.users (Supabase)
Standard Supabase auth.users includes:
- id (UUID)
- email
- password_hash (encrypted)
- created_at
- updated_at

Add custom user_profiles table:
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(2048),
  bio TEXT,
  theme_preference VARCHAR(20) DEFAULT 'system',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
```

### Settings Page Sections

#### 1. Profile Tab
- Display name (editable, 1-255 chars)
- Avatar (upload, max 5MB, png/jpg)
- Bio (editable, optional, max 500 chars)
- Email (read-only, from auth.users)
- User ID (read-only)

#### 2. Security Tab
- Change password
- Current password → New password → Confirm password
- Password requirements display
- Two-factor authentication (toggle, future)
- Active sessions (future)
- Trusted devices (future)

#### 3. Preferences Tab
- Theme preference: Light, Dark, System (default)
- Notification preferences (toggle per type)
- Email digest: Daily, Weekly, Never

#### 4. Connected Accounts Tab
- OAuth connections (GitHub, Google, etc., if applicable)
- Disconnect buttons
- Placeholder for future SSO integration

#### 5. Danger Zone Tab
- Delete account (with confirmation)
- Deactivate account (if applicable)

### UI Components

#### ProfileSection Component
```typescript
interface ProfileSectionProps {
  user: User;
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
  isLoading?: boolean;
}

export function ProfileSection({
  user,
  profile,
  onUpdate,
  isLoading = false,
}: ProfileSectionProps) {
  // Display name edit
  // Avatar upload
  // Bio edit
  // Save button
}
```

#### ChangePasswordSection Component
```typescript
interface ChangePasswordSectionProps {
  onPasswordChanged: (currentPassword: string, newPassword: string) => void;
  isLoading?: boolean;
}

export function ChangePasswordSection({
  onPasswordChanged,
  isLoading = false,
}: ChangePasswordSectionProps) {
  // Current password input
  // New password input with requirements
  // Confirm password input
  // Change button with validation
}
```

#### PreferencesSection Component
```typescript
interface PreferencesSectionProps {
  preferences: UserPreferences;
  onUpdate: (prefs: Partial<UserPreferences>) => void;
  isLoading?: boolean;
}

export function PreferencesSection({
  preferences,
  onUpdate,
  isLoading = false,
}: PreferencesSectionProps) {
  // Theme toggle
  // Notification toggles
  // Email digest selector
}
```

#### ThemeSwitcher Component
```typescript
interface ThemeSwitcherProps {
  currentTheme: 'light' | 'dark' | 'system';
  onChange: (theme: string) => void;
}

export function ThemeSwitcher({
  currentTheme,
  onChange,
}: ThemeSwitcherProps) {
  // Radio buttons or toggle for theme
  // Instant preview if possible
}
```

## File Structure
```
src/
├── app/settings/
│   ├── profile/
│   │   └── page.tsx             (main settings page)
│   └── layout.tsx
├── components/
│   ├── settings/
│   │   ├── SettingsLayout.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── ChangePasswordSection.tsx
│   │   ├── PreferencesSection.tsx
│   │   ├── SecuritySection.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   ├── NotificationPreferences.tsx
│   │   └── DangerZoneSection.tsx
│   └── shared/
│       ├── AvatarUpload.tsx
│       └── TabNavigation.tsx
├── lib/
│   ├── user/
│   │   ├── profile.ts           (profile queries/mutations)
│   │   ├── security.ts          (password, 2FA)
│   │   └── preferences.ts       (theme, notifications)
│   └── types/
│       └── user-profile.ts      (TypeScript types)
└── app/api/
    └── user/
        ├── profile/
        │   ├── route.ts         (GET/PATCH profile)
        │   ├── avatar/
        │   │   └── route.ts     (POST avatar upload)
        │   └── password/
        │       └── route.ts     (POST change password)
        └── preferences/
            ├── theme/
            │   └── route.ts
            └── notifications/
                └── route.ts
```

## API Routes

### GET /api/user/profile
Get user profile:

```
Headers: Authorization: Bearer token

Response:
{
  user: {
    id: string,
    email: string,
    created_at: string
  },
  profile: {
    display_name: string,
    avatar_url: string,
    bio: string,
    theme_preference: string
  }
}
```

### PATCH /api/user/profile
Update profile:

```
Headers: Authorization: Bearer token

Body:
{
  display_name?: string,
  bio?: string
}

Response:
{
  success: true,
  profile: UserProfile
}

Errors:
- 400: Invalid data
- 401: Unauthorized
```

### POST /api/user/profile/avatar
Upload avatar:

```
Headers:
- Authorization: Bearer token
- Content-Type: multipart/form-data

Body:
- file: File (image)

Response:
{
  avatar_url: string,
  success: true
}

Errors:
- 400: Invalid file type or size
- 413: File too large (> 5MB)
```

### POST /api/user/profile/password
Change password:

```
Headers: Authorization: Bearer token

Body:
{
  current_password: string,
  new_password: string,
  confirm_password: string
}

Response:
{
  success: true,
  message: "Password changed successfully"
}

Errors:
- 400: Passwords don't match or invalid
- 401: Current password incorrect
- 422: Password doesn't meet requirements
```

### PATCH /api/user/preferences/theme
Update theme preference:

```
Headers: Authorization: Bearer token

Body:
{
  theme: 'light' | 'dark' | 'system'
}

Response:
{
  success: true,
  theme: string
}
```

### GET /api/user/preferences/notifications
Get notification preferences (see Phase 108)

### PATCH /api/user/preferences/notifications
Update notification preferences (see Phase 108)

## Password Requirements

### Rules
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)
- Cannot contain email or username
- Cannot be previous 5 passwords (password history)

### Validation Display
Show strength meter:
- Red: Weak
- Orange: Fair
- Yellow: Good
- Green: Strong

```typescript
function validatePassword(password: string, email: string): ValidationResult {
  if (password.length < 12) {
    return { valid: false, error: 'Minimum 12 characters required' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Must contain uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Must contain lowercase letter' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, error: 'Must contain number' };
  }

  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Must contain special character' };
  }

  if (password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    return { valid: false, error: 'Cannot contain email username' };
  }

  return { valid: true };
}
```

## Theme Implementation

### Preference Storage
- Save theme_preference to user_profiles table
- Default: 'system' (respects OS preference)

### Client-Side Application
```typescript
function applyTheme(preference: string) {
  let theme = preference;

  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}
```

## Avatar Upload

### Process
1. User clicks avatar to open file picker
2. Select image file (png, jpg, jpeg)
3. Compress/resize to 400x400px
4. Upload to Supabase Storage: `/avatars/{user-id}/{filename}`
5. Update user_profiles.avatar_url
6. Show preview immediately

## Acceptance Criteria
- [ ] Settings page accessible at /settings/profile
- [ ] Profile tab functional with all editable fields
- [ ] Avatar upload working with validation
- [ ] Avatar preview shows after upload
- [ ] Display name editable with validation
- [ ] Bio editable with character limit
- [ ] Email shown as read-only
- [ ] Security tab shows password change form
- [ ] Password validation rules displayed
- [ ] Password strength meter functional
- [ ] Change password works with validation
- [ ] Preferences tab shows theme selector
- [ ] Theme changes applied instantly
- [ ] Notification preferences toggles functional
- [ ] Email digest selector working
- [ ] Save buttons functional
- [ ] Success/error toast messages shown
- [ ] All changes persisted to database
- [ ] Authorization checks prevent unauthorized access
- [ ] Mobile responsive
- [ ] Accessibility: ARIA labels, semantic HTML
- [ ] Performance: load settings page < 500ms

## Testing Instructions

### API Tests
```bash
# Get profile
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer {token}"

# Update profile
curl -X PATCH http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"display_name": "John Doe", "bio": "Product manager"}'

# Upload avatar
curl -X POST http://localhost:3000/api/user/profile/avatar \
  -H "Authorization: Bearer {token}" \
  -F "file=@avatar.jpg"

# Change password
curl -X POST http://localhost:3000/api/user/profile/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "current_password": "OldPassword123!",
    "new_password": "NewPassword456!",
    "confirm_password": "NewPassword456!"
  }'

# Update theme
curl -X PATCH http://localhost:3000/api/user/preferences/theme \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"theme": "dark"}'
```

### Manual Testing
1. Login and navigate to /settings/profile
2. Update display name
3. Verify change persists on reload
4. Upload new avatar
5. Verify avatar displays
6. Update bio
7. Click security tab
8. Try to change password with weak password
9. Verify validation error
10. Enter strong password
11. Verify password change succeeds
12. Try to login with old password → fails
13. Login with new password → succeeds
14. Click preferences tab
15. Select dark theme
16. Verify dark theme applied
17. Select light theme
18. Verify light theme applied
19. Select system theme
20. Verify respects OS preference
21. Toggle notification preferences
22. Verify changes persist
23. Test on mobile viewport
24. Verify responsive layout

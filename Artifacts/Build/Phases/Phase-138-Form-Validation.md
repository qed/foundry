# Phase 138: Form Validation & Error Messages

## Objective
Implement comprehensive client-side and server-side form validation using Zod, with consistent inline error messages across all forms.

## Prerequisites
- All form pages (user registration, project settings, content editors)
- Next.js API routes
- React hook forms capability

## Context
Invalid data causes confusing errors and poor user experience. Client-side validation provides instant feedback, server-side validation prevents malicious submissions. Zod schemas provide type-safe validation and error messages.

## Detailed Requirements

### Validation Libraries
- **Zod:** schema validation (https://zod.dev)
- **React Hook Form:** form state management
- Integration: use Zod with React Hook Form

### Example Zod Schemas
```ts
// userSchema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  passwordConfirm: z.string(),
  name: z.string().min(1, 'Name required'),
}).refine(data => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  visibility: z.enum(['private', 'public']),
});

export const ideaSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  tags: z.array(z.string()).min(1, 'At least one tag required'),
  status: z.enum(['draft', 'published']),
});
```

### Client-Side Validation with React Hook Form
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ideaSchema } from '@/lib/schemas';

export function IdeaForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ideaSchema),
    mode: 'onBlur', // validate on blur, not on change
  });

  const onSubmit = async (data) => {
    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      // handle response
    } catch (error) {
      // handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          {...register('title')}
          className={`mt-1 block w-full px-3 py-2 border rounded ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          {...register('description')}
          className={`mt-1 block w-full px-3 py-2 border rounded ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={4}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Styled Form Components
```tsx
// FormField.tsx - Reusable component
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Usage
<FormField label="Title" error={errors.title?.message} required>
  <input {...register('title')} className="..." />
</FormField>
```

### Server-Side Validation
```ts
// API route: /api/ideas
import { ideaSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  const body = await request.json();

  // Validate with Zod
  const result = ideaSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: 'Validation failed',
        issues: result.error.issues, // array of validation errors
      },
      { status: 400 }
    );
  }

  // Validated data is now type-safe
  const data = result.data;

  // Process request
  // ...

  return Response.json({ success: true });
}
```

### Error Message Display
- **Inline errors:** below each field in red text
- **Summary errors:** list of all errors at top of form (optional)
- **Toast notifications:** for async submission success/error

### Form States
- **Idle:** no validation yet
- **Validating:** validation in progress (async validators)
- **Valid:** all fields valid
- **Invalid:** one or more fields invalid
- **Submitting:** form being submitted
- **Submitted:** form submitted (success or error)

### Validation Timing
- **On blur:** validate when user leaves field (most common)
- **On change:** validate as user types (annoying for long inputs)
- **On submit:** validate when user submits form
- **Hybrid:** use blur for non-required fields, submit for required

### Form Error Summary Component
```tsx
export function FormErrorSummary({ errors }: { errors: FieldError[] }) {
  if (!errors.length) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-sm font-semibold text-red-900 mb-3">
        Please fix the following errors:
      </h3>
      <ul className="space-y-1">
        {errors.map((error, i) => (
          <li key={i} className="text-sm text-red-700">
            • {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Async Validation
```ts
// Check if email already exists
export const userSchema = z.object({
  email: z
    .string()
    .email('Invalid email')
    .refine(
      async (email) => {
        const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        return !existing.length; // true = valid (no duplicate)
      },
      { message: 'Email already registered' }
    ),
});
```

### Cross-Field Validation
```ts
export const passwordSchema = z.object({
  password: z.string().min(8),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwords must match',
  path: ['passwordConfirm'], // which field gets the error
});
```

### Forms to Validate
1. User signup
2. User login
3. Project creation
4. Project settings
5. Idea creation
6. Feature creation
7. Blueprint creation/edit
8. Work order creation
9. Feedback submission
10. Settings forms

## File Structure
```
/app/lib/schemas/index.ts
/app/lib/schemas/user.ts
/app/lib/schemas/project.ts
/app/lib/schemas/hall.ts
/app/lib/schemas/patternShop.ts
/app/lib/schemas/controlRoom.ts
/app/lib/schemas/assemblyFloor.ts
/app/lib/schemas/insightsLab.ts
/app/components/Forms/FormField.tsx
/app/components/Forms/FormErrorSummary.tsx
/app/components/Forms/FormSubmitButton.tsx
```

## Acceptance Criteria
- [ ] Zod schemas created for all form types
- [ ] Client-side validation works with React Hook Form
- [ ] Errors display inline below each field
- [ ] Error messages are user-friendly
- [ ] Server-side validation prevents invalid data
- [ ] API returns validation errors (400 status)
- [ ] Matching field validation (passwords, confirms) works
- [ ] Required fields show asterisk (*)
- [ ] Async validators (email exists check) work
- [ ] Cross-field validation works
- [ ] Form disabled during submission
- [ ] Success message shown on successful submit
- [ ] Error summary displays all errors
- [ ] Validation doesn't interfere with required fields
- [ ] All form pages validated
- [ ] XSS prevention (input sanitization)
- [ ] Test with 50+ form submissions

## Testing Instructions
1. **Test Required Field:**
   - Leave title empty
   - Click outside field (blur)
   - Verify error message: "Title must be at least 5 characters"
   - Fill in title
   - Verify error disappears

2. **Test Min Length:**
   - Enter "abc" in title field
   - Blur
   - Verify error: "Title must be at least 5 characters"

3. **Test Max Length:**
   - Enter 150+ character description
   - Verify error (if max is 100): "Description too long"

4. **Test Email Format:**
   - Enter invalid email: "notanemail"
   - Blur
   - Verify error: "Invalid email address"
   - Enter valid email: "user@example.com"
   - Verify error clears

5. **Test Matching Fields:**
   - In signup form, enter password: "MyPass123"
   - Enter confirmation: "MyPass456"
   - Blur confirmation field
   - Verify error: "Passwords must match"
   - Enter matching confirmation
   - Verify error clears

6. **Test Multiple Errors:**
   - Leave multiple required fields empty
   - Try to submit
   - Verify all errors displayed
   - Verify error summary shows all issues

7. **Test Async Validation:**
   - In signup, enter existing email
   - Blur email field
   - Wait for async validation
   - Verify error: "Email already registered"

8. **Test Form Submission:**
   - Fill all fields correctly
   - Click Submit
   - Verify button shows "Submitting..."
   - Verify button disabled during submission
   - Wait for response
   - Verify success message or error message

9. **Test Server Validation:**
   - Bypass client validation (DevTools console)
   - Manually submit invalid data
   - Verify server rejects with 400 status
   - Verify error response includes validation issues

10. **Test XSS Prevention:**
    - In title field, try: `<script>alert('xss')</script>`
    - Submit
    - Verify script doesn't execute
    - Verify input is sanitized

11. **Test Mobile Validation:**
    - Resize to mobile (375px)
    - Fill form with errors
    - Verify error messages readable on mobile
    - Verify layout doesn't break

12. **Test Enum Validation:**
    - In project visibility field, try to set invalid value
    - Verify error if not valid enum
    - Verify dropdown only shows valid options

13. **Test Array Validation:**
    - In tags field, try to add zero tags
    - Try to submit
    - Verify error: "At least one tag required"
    - Add tags
    - Verify error clears

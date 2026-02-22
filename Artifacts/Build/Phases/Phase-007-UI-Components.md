# Phase 007 - Global UI Components

## Objective
Build a comprehensive library of reusable UI components with TypeScript types and consistent styling. Create button, input, select, card, modal, badge, tooltip, spinner, avatar, and notification components. All components should support dark theme and follow Tailwind CSS patterns.

## Prerequisites
- Phase 001 - Next.js Project Setup
- Phase 006 - Core UI Shell & Layout

## Context
A well-designed component library reduces code duplication and ensures visual consistency throughout the application. Type-safe components with clear prop interfaces make components easier to use and prevent bugs. These base components will be used extensively in all subsequent phases.

## Detailed Requirements

### 1. Button Component

#### File: `components/ui/button.tsx`
Flexible button component with multiple variants and sizes.

```typescript
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
        secondary: 'bg-slate-700 text-slate-50 hover:bg-slate-600 active:bg-slate-800',
        ghost: 'text-slate-300 hover:bg-slate-800 hover:text-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        outline: 'border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-50',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

/**
 * Button component with multiple variants and sizes.
 *
 * @param variant - Visual style: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * @param size - Button size: 'sm' | 'md' | 'lg'
 * @param isLoading - Show loading state (disables button)
 * @param children - Button content
 *
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      ref={ref}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
```

**Usage:**
```tsx
<Button variant="primary" size="md">Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="ghost">Cancel</Button>
<Button isLoading>Processing...</Button>
```

### 2. Input Component

#### File: `components/ui/input.tsx`
Text input with consistent styling and validation states.

```typescript
import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

/**
 * Input component with label, error, and helper text support.
 *
 * @param label - Optional label text
 * @param error - Error message to display
 * @param helperText - Helper text below input
 * @param placeholder - Placeholder text
 * @param type - Input type (text, email, password, etc.)
 *
 * @example
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="you@example.com"
 *   error={emailError}
 * />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 placeholder-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  )
)

Input.displayName = 'Input'
```

**Usage:**
```tsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
/>
```

### 3. Textarea Component

#### File: `components/ui/textarea.tsx`
Multi-line text input component.

```typescript
import React from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

/**
 * Textarea component for multi-line input.
 *
 * @param label - Optional label text
 * @param error - Error message to display
 * @param helperText - Helper text below textarea
 * @param rows - Number of visible rows
 *
 * @example
 * <Textarea
 *   label="Description"
 *   rows={4}
 *   placeholder="Enter description..."
 * />
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 placeholder-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'resize-none',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  )
)

Textarea.displayName = 'Textarea'
```

### 4. Select Component

#### File: `components/ui/select.tsx`
Dropdown select component.

```typescript
import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  placeholder?: string
}

/**
 * Select component with label and error states.
 *
 * @param label - Optional label text
 * @param options - Array of { value, label } objects
 * @param placeholder - Placeholder text
 * @param error - Error message to display
 *
 * @example
 * <Select
 *   label="Role"
 *   options={[
 *     { value: 'admin', label: 'Admin' },
 *     { value: 'user', label: 'User' }
 *   ]}
 * />
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-50 appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  )
)

Select.displayName = 'Select'
```

### 5. Card Component

#### File: `components/ui/card.tsx`
Container component with optional header and footer.

```typescript
import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * Card container component.
 *
 * @example
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Title</Card.Title>
 *   </Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>Footer</Card.Footer>
 * </Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-slate-800 rounded-lg border border-slate-700', className)}
      {...props}
    />
  )
)

Card.displayName = 'Card'

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-slate-700', className)}
      {...props}
    />
  )
}

CardHeader.displayName = 'CardHeader'

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-slate-50', className)}
      {...props}
    />
  )
}

CardTitle.displayName = 'CardTitle'

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

CardBody.displayName = 'CardBody'

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-slate-700', className)}
      {...props}
    />
  )
}

CardFooter.displayName = 'CardFooter'
```

**Usage:**
```tsx
<Card>
  <Card.Header>
    <Card.Title>Project Settings</Card.Title>
  </Card.Header>
  <Card.Body>Content here</Card.Body>
  <Card.Footer>Actions here</Card.Footer>
</Card>
```

### 6. Badge Component

#### File: `components/ui/badge.tsx`
Small label for status, tags, or categories.

```typescript
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white',
        secondary: 'bg-slate-700 text-slate-200',
        success: 'bg-green-600 text-white',
        warning: 'bg-yellow-600 text-white',
        danger: 'bg-red-600 text-white',
        outline: 'border border-slate-700 text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge component for status, tags, and categories.
 *
 * @param variant - Visual style: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
 * @param children - Badge content
 *
 * @example
 * <Badge variant="success">Active</Badge>
 */
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'
```

**Usage:**
```tsx
<Badge variant="success">Completed</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="danger">Failed</Badge>
```

### 7. Modal/Dialog Component

#### File: `components/ui/dialog.tsx`
Modal dialog with overlay and close button.

```typescript
'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Dialog (modal) component with overlay.
 *
 * @example
 * const [open, setOpen] = useState(false)
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Title</Dialog.Title>
 *     </Dialog.Header>
 *     <Dialog.Body>Content</Dialog.Body>
 *   </Dialog.Content>
 * </Dialog>
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false)
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative">{children}</div>
    </div>
  )
}

export function DialogContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-slate-800 rounded-lg shadow-lg border border-slate-700 max-w-md w-full mx-4',
        className
      )}
      {...props}
    />
  )
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between p-6 border-b border-slate-700', className)}
      {...props}
    />
  )
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-slate-50', className)}
      {...props}
    />
  )
}

export function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex justify-end gap-2 p-6 border-t border-slate-700', className)}
      {...props}
    />
  )
}

export function DialogClose({
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="p-1 hover:bg-slate-700 rounded transition-colors"
      {...props}
    >
      <X className="w-5 h-5" />
    </button>
  )
}
```

**Usage:**
```tsx
const [open, setOpen] = useState(false)
<Dialog open={open} onOpenChange={setOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm Delete</Dialog.Title>
      <Dialog.Close onClick={() => setOpen(false)} />
    </Dialog.Header>
    <Dialog.Body>Are you sure?</Dialog.Body>
    <Dialog.Footer>
      <Button onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="danger">Delete</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

### 8. Spinner/Loading Component

#### File: `components/ui/spinner.tsx`
Loading spinner indicator.

```typescript
import React from 'react'
import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Loading spinner component.
 *
 * @param size - Spinner size: 'sm' | 'md' | 'lg'
 *
 * @example
 * <Spinner size="md" />
 */
export function Spinner({
  size = 'md',
  className,
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <svg
        className={cn('animate-spin text-blue-500', sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}
```

**Usage:**
```tsx
<Spinner size="md" />
```

### 9. Avatar Component

#### File: `components/ui/avatar.tsx`
User avatar with initials fallback.

```typescript
import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt: string
  initials: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Avatar component with image or initials fallback.
 *
 * @param src - Optional image URL
 * @param alt - Alt text for image
 * @param initials - Fallback initials (e.g., "JD")
 * @param size - Avatar size: 'sm' | 'md' | 'lg'
 *
 * @example
 * <Avatar
 *   alt="John Doe"
 *   initials="JD"
 *   src="https://..."
 * />
 */
export function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }

  return (
    <div
      className={cn(
        'relative flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold overflow-hidden',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}
```

**Usage:**
```tsx
<Avatar
  alt="John Doe"
  initials="JD"
  src="https://example.com/john.jpg"
  size="md"
/>
```

### 10. Toast/Notification Component

#### File: `components/ui/toast.tsx`
Toast notification component.

```typescript
'use client'

import React, { useEffect } from 'react'
import { X, Check, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  id: string
  type: ToastType
  message: string
  onClose: (id: string) => void
  duration?: number
}

/**
 * Toast notification component.
 *
 * @param type - Toast type: 'success' | 'error' | 'info' | 'warning'
 * @param message - Toast message
 * @param onClose - Callback when toast should close
 * @param duration - Auto-close duration in ms (0 = no auto-close)
 */
export function Toast({
  id,
  type,
  message,
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (duration === 0) return

    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const typeConfig = {
    success: { bg: 'bg-green-900', text: 'text-green-100', icon: Check },
    error: { bg: 'bg-red-900', text: 'text-red-100', icon: AlertCircle },
    info: { bg: 'bg-blue-900', text: 'text-blue-100', icon: Info },
    warning: { bg: 'bg-yellow-900', text: 'text-yellow-100', icon: AlertCircle },
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        config.bg,
        config.text
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/20 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
```

### 11. Toast Container & Hook

#### File: `components/ui/toast-container.tsx`
Container for displaying multiple toasts.

```typescript
'use client'

import React, { useState, useCallback } from 'react'
import { Toast, type ToastType } from './toast'
import { v4 as uuid } from 'uuid'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

export interface UseToastReturn {
  toasts: ToastMessage[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

/**
 * Toast context and hook for managing notifications.
 */
const ToastContext = React.createContext<UseToastReturn | undefined>(
  undefined
)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (message: string, type: ToastType, duration = 5000) => {
      const id = uuid()
      setToasts((prev) => [...prev, { id, type, message }])

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): UseToastReturn {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
```

### 12. Empty State Component

#### File: `components/ui/empty-state.tsx`
Empty state placeholder.

```typescript
import React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Empty state component for displaying when no data is available.
 *
 * @param icon - Optional icon element
 * @param title - Title text
 * @param description - Optional description
 * @param action - Optional action button/link
 *
 * @example
 * <EmptyState
 *   icon={<Package />}
 *   title="No projects"
 *   description="Create your first project to get started"
 *   action={<Button>Create Project</Button>}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      {...props}
    >
      {icon && <div className="mb-4 text-4xl opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-50 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 mb-6 max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
```

### 13. Utility Functions

#### File: `lib/utils.ts`
Class name merging utility.

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind CSS conflict resolution.
 *
 * @example
 * cn('px-2', 'px-4') // Returns 'px-4' (tailwind-merge resolves conflict)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## File Structure
Files created in this phase:
```
components/
├── ui/
│   ├── button.tsx (NEW)
│   ├── input.tsx (NEW)
│   ├── textarea.tsx (NEW)
│   ├── select.tsx (NEW)
│   ├── card.tsx (NEW)
│   ├── badge.tsx (NEW)
│   ├── dialog.tsx (NEW)
│   ├── spinner.tsx (NEW)
│   ├── avatar.tsx (NEW)
│   ├── toast.tsx (NEW)
│   ├── toast-container.tsx (NEW)
│   └── empty-state.tsx (NEW)

lib/
└── utils.ts (NEW)
```

## Acceptance Criteria

1. **Button Component**: All 5 variants render correctly with proper styling
2. **Input Component**: Input accepts label, error, and helper text
3. **Textarea Component**: Multi-line input works with proper styling
4. **Select Component**: Dropdown displays options correctly
5. **Card Component**: Card with header, body, footer renders
6. **Badge Component**: All badge variants display correct colors
7. **Modal/Dialog**: Dialog opens/closes and overlay works
8. **Spinner**: Spinner animates continuously
9. **Avatar**: Avatar displays image or initials fallback
10. **Toast Notifications**: Toast messages display and auto-close

## Testing Instructions

1. **Create Component Showcase Page**:
   - Create `app/components/page.tsx` with all components
   - Verify each component renders without TypeScript errors

2. **Test Button Variants**:
   - Render all button variants: primary, secondary, ghost, danger, outline
   - Verify hover states work
   - Test disabled and loading states

3. **Test Input Component**:
   - Render input with label, error, and helper text
   - Verify error state shows error text
   - Verify focus ring appears

4. **Test Select Component**:
   - Render select with options
   - Verify dropdown opens
   - Select an option and verify value changes

5. **Test Card Component**:
   - Use Card with header, body, footer
   - Verify all sections render with correct spacing

6. **Test Dialog**:
   - Open dialog with state
   - Click overlay to close
   - Click close button to close
   - Verify body scroll is prevented

7. **Test Toast**:
   - Create test component using `useToast()`
   - Call `addToast()` with different types
   - Verify toasts appear in bottom right
   - Verify auto-close works

8. **Test Avatar**:
   - Render with image URL
   - Verify image displays
   - Render without image
   - Verify initials display as fallback

9. **Test Accessibility**:
   - Run axe DevTools accessibility checker
   - Verify focus states are visible
   - Test keyboard navigation (Tab, Enter, Esc)

10. **Type Safety Test**:
    - Import components in TypeScript file
    - Verify all props are type-checked
    - Try invalid prop values
    - TypeScript should show errors

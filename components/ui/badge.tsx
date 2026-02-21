import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-accent-cyan/20 text-accent-cyan',
        secondary: 'bg-bg-tertiary text-text-secondary',
        success: 'bg-accent-success/20 text-accent-success',
        warning: 'bg-accent-warning/20 text-accent-warning',
        danger: 'bg-accent-error/20 text-accent-error',
        outline: 'border border-border-default text-text-secondary',
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

export { badgeVariants }

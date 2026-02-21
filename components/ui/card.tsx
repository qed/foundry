import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-bg-secondary rounded-lg border border-border-default', className)}
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
      className={cn('px-6 py-4 border-b border-border-default', className)}
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
      className={cn('text-lg font-semibold text-text-primary', className)}
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
      className={cn('px-6 py-4 border-t border-border-default', className)}
      {...props}
    />
  )
}

CardFooter.displayName = 'CardFooter'

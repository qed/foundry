import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt: string
  initials: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        'relative flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold overflow-hidden',
        sizeClasses[size],
        className
      )}
      style={!src ? { background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' } : undefined}
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

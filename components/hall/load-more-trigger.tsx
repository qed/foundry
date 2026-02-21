'use client'

import { useEffect, useRef } from 'react'

interface LoadMoreTriggerProps {
  onLoadMore: () => void
  isLoading: boolean
}

export function LoadMoreTrigger({ onLoadMore, isLoading }: LoadMoreTriggerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onLoadMoreRef = useRef(onLoadMore)

  // Sync the ref in an effect (not during render) for React 19 compliance
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMoreRef.current()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoading])

  return <div ref={ref} className="h-4" aria-hidden="true" />
}

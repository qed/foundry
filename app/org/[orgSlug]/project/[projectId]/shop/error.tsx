'use client'

import { ErrorFallback } from '@/components/error/error-fallback'

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorFallback error={error} reset={reset} moduleName="Pattern Shop" />
}

'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { isValidStageSlug } from '@/types/helix-routes'
import type { HelixStageSlug } from '@/types/helix-routes'
import { HelixStagePage } from '@/components/helix/helix-stage-page'

interface HelixCatchAllPageProps {
  params: Promise<{ slug: string[] }>
}

export default function HelixCatchAllPage({ params }: HelixCatchAllPageProps) {
  const { slug } = use(params)

  // Single-segment slug that is a valid stage → render the stage page
  if (slug.length === 1 && isValidStageSlug(slug[0])) {
    return <HelixStagePage stageSlug={slug[0] as HelixStageSlug} />
  }

  notFound()
}

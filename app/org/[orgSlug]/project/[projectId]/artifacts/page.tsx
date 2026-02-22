import { ArtifactBrowser } from '@/components/artifacts/artifact-browser'

interface ArtifactsPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ArtifactsPage({ params }: ArtifactsPageProps) {
  const { projectId } = await params

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <ArtifactBrowser projectId={projectId} />
    </div>
  )
}

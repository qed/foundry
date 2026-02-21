import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

interface FloorPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function FloorPage({ params }: FloorPageProps) {
  const { orgSlug, projectId } = await params

  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto p-8">
        <Link
          href={`/org/${orgSlug}/project/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <Image src="/icon-floor.png" alt="Assembly Floor" width={48} height={48} />
          <h1 className="text-2xl font-bold text-text-primary">Assembly Floor</h1>
        </div>
        <p className="text-text-secondary mb-8">
          Execution & building workspace. Coming soon.
        </p>

        <div className="glass-panel rounded-lg p-12 text-center">
          <p className="text-text-tertiary">
            This module will be built in a future phase.
          </p>
        </div>
      </div>
    </main>
  )
}

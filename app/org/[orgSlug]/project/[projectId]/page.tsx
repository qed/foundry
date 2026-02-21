import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const MODULES = [
  {
    name: 'The Hall',
    slug: 'hall',
    description: 'Ideation & brainstorming',
    icon: '/icon-hall.png',
  },
  {
    name: 'Pattern Shop',
    slug: 'shop',
    description: 'Requirements & patterns',
    icon: '/icon-shop.png',
  },
  {
    name: 'Control Room',
    slug: 'room',
    description: 'Blueprints & management',
    icon: '/icon-room.png',
  },
  {
    name: 'Assembly Floor',
    slug: 'floor',
    description: 'Execution & building',
    icon: '/icon-floor.png',
  },
  {
    name: 'Insights Lab',
    slug: 'lab',
    description: 'Feedback & analytics',
    icon: '/icon-lab.png',
  },
]

interface ProjectPageProps {
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { orgSlug, projectId } = await params

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/org/${orgSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            {project.name}
          </h1>
          <p className="text-text-secondary text-sm mt-1">Project Dashboard</p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {MODULES.map((mod) => (
            <Link
              key={mod.slug}
              href={`/org/${orgSlug}/project/${projectId}/${mod.slug}`}
              className="glass-panel rounded-lg p-6 hover:border-accent-cyan/30 transition-all group text-center"
            >
              <div className="h-20 flex items-center justify-center mb-3">
                <Image
                  src={mod.icon}
                  alt={mod.name}
                  width={72}
                  height={72}
                  className="max-h-20 w-auto object-contain group-hover:scale-110 transition-transform"
                />
              </div>
              <h3 className="font-semibold text-text-primary text-sm">
                {mod.name}
              </h3>
              <p className="text-xs text-text-tertiary mt-1">
                {mod.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

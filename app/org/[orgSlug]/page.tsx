import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/server'
import { CreateProjectForm } from '@/components/org/create-project-form'
import { TopBar } from '@/components/layout/top-bar'
import Link from 'next/link'

interface OrgPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { orgSlug } = await params
  await requireAuth()
  const supabase = await createClient()

  // Get org (layout already validated access, but we need the data)
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  // Get projects in this org
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-bg-primary">
      <TopBar />
      <main className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">{org.name}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {projects && projects.length > 0
              ? `${projects.length} project${projects.length === 1 ? '' : 's'}`
              : 'No projects yet'}
          </p>
        </div>

        {/* Projects grid or create form */}
        {!projects || projects.length === 0 ? (
          <div className="max-w-md mx-auto">
            <div className="glass-panel rounded-xl p-8">
              <div className="text-center mb-6">
                <p className="text-text-secondary">
                  Create your first project to start building.
                </p>
              </div>
              <CreateProjectForm orgId={org.id} orgSlug={orgSlug} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/org/${orgSlug}/project/${project.id}`}
                className="glass-panel rounded-lg p-6 hover:border-accent-cyan/30 transition-colors group"
              >
                <h2 className="font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-text-tertiary mt-3">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}

            {/* New project card */}
            <NewProjectCard orgId={org.id} orgSlug={orgSlug} />
          </div>
        )}
      </main>
    </div>
  )
}

function NewProjectCard({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  return (
    <div className="glass-panel rounded-lg p-6 border-dashed">
      <CreateProjectForm orgId={orgId} orgSlug={orgSlug} />
    </div>
  )
}

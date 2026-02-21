import { notFound } from 'next/navigation'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectProvider } from '@/lib/context/project-context'
import { CurrentUserProvider } from '@/lib/context/current-user-context'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string; projectId: string }>
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params
  const { user, profile } = await requireAuthWithProfile()

  if (!profile) {
    notFound()
  }

  const supabase = await createClient()

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Verify user is member of project
  const { data: projectMember, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !projectMember) {
    notFound()
  }

  // Get org membership to determine if user is org admin
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', project.org_id)
    .eq('user_id', user.id)
    .single()

  return (
    <ProjectProvider
      project={project}
      userRole={projectMember.role as 'leader' | 'developer'}
    >
      <CurrentUserProvider
        user={profile}
        isOrgAdmin={orgMember?.role === 'admin'}
        isProjectLeader={projectMember.role === 'leader'}
      >
        {children}
      </CurrentUserProvider>
    </ProjectProvider>
  )
}

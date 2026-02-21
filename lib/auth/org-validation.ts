import { createClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, NotFoundError } from './errors'
import { getUser } from './server'

export async function getOrgAndValidateAccess(orgId: string) {
  const user = await getUser()
  if (!user) {
    throw new UnauthorizedError('Not authenticated')
  }

  const supabase = await createClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    throw new NotFoundError('Organization not found')
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    throw new ForbiddenError('No access to this organization')
  }

  return {
    org,
    user,
    role: membership.role as 'admin' | 'member',
    isAdmin: membership.role === 'admin',
  }
}

export async function getProjectAndValidateAccess(projectId: string) {
  const user = await getUser()
  if (!user) {
    throw new UnauthorizedError('Not authenticated')
  }

  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new NotFoundError('Project not found')
  }

  const { data: projectMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (!projectMember) {
    throw new ForbiddenError('No access to this project')
  }

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', project.org_id)
    .eq('user_id', user.id)
    .single()

  return {
    project,
    user,
    projectRole: projectMember.role as 'leader' | 'developer',
    orgRole: orgMember?.role as 'admin' | 'member' | undefined,
    isProjectLeader: projectMember.role === 'leader',
    isOrgAdmin: orgMember?.role === 'admin',
  }
}

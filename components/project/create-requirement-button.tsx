'use client'

import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'

interface CreateRequirementButtonProps {
  onCreateClick: () => void
}

/**
 * Button that only shows if user has permission to create requirements.
 */
export function CreateRequirementButton({
  onCreateClick,
}: CreateRequirementButtonProps) {
  const { canProject } = usePermission()

  if (!canProject(ProjectPermissions.CREATE_REQUIREMENT)) {
    return null
  }

  return <Button onClick={onCreateClick}>Create Requirement</Button>
}

'use client'

import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import { ProjectPermissions } from '@/lib/permissions/definitions'
import { Edit, Trash2 } from 'lucide-react'

interface RequirementListItemProps {
  id: string
  title: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

/**
 * List item that shows edit/delete buttons only if user has permissions.
 */
export function RequirementListItem({
  id,
  title,
  onEdit,
  onDelete,
}: RequirementListItemProps) {
  const { canProject } = usePermission()

  const canEdit = canProject(ProjectPermissions.EDIT_REQUIREMENT)
  const canDelete = canProject(ProjectPermissions.DELETE_REQUIREMENT)

  return (
    <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
      <h4 className="font-medium text-text-primary">{title}</h4>

      <div className="flex gap-2">
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => onEdit?.(id)}>
            <Edit className="w-4 h-4" />
          </Button>
        )}

        {canDelete && (
          <Button size="sm" variant="ghost" onClick={() => onDelete?.(id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

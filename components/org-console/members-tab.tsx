'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Shield, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { cn } from '@/lib/utils'

interface MemberWithProfile {
  id: string
  user_id: string
  role: string
  joined_at: string
  profile: { id: string; display_name: string; avatar_url: string | null } | null
}

interface MembersTabProps {
  orgId: string
  currentUserId: string
  initialMembers: MemberWithProfile[]
}

export function MembersTab({ orgId, currentUserId, initialMembers }: MembersTabProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)

  const filtered = members.filter((m) => {
    const name = m.profile?.display_name || ''
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || m.role === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleRoleChange(memberId: string, newRole: string) {
    setChangingRoleId(memberId)
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change role')
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
      addToast('Role updated', 'success')
      router.refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to change role', 'error')
    } finally {
      setChangingRoleId(null)
    }
  }

  async function handleRemove() {
    if (!removingId) return
    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${removingId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      setMembers((prev) => prev.filter((m) => m.id !== removingId))
      addToast('Member removed', 'success')
      router.refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  const memberToRemove = members.find((m) => m.id === removingId)

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </div>

      {/* Member count */}
      <p className="text-xs text-text-tertiary">
        {filtered.length} member{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Member list */}
      <div className="glass-panel rounded-xl divide-y divide-border-default overflow-hidden">
        {filtered.map((member) => {
          const isSelf = member.user_id === currentUserId
          const isOnlyAdmin =
            member.role === 'admin' &&
            members.filter((m) => m.role === 'admin').length <= 1

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Avatar
                alt={member.profile?.display_name || 'User'}
                initials={(member.profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                src={member.profile?.avatar_url || undefined}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {member.profile?.display_name || 'Unknown'}
                  {isSelf && (
                    <span className="text-text-tertiary font-normal ml-1">(you)</span>
                  )}
                </p>
                <p className="text-xs text-text-tertiary">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>

              {/* Role badge / selector */}
              <div className="flex items-center gap-2">
                {isSelf || isOnlyAdmin ? (
                  <Badge variant={member.role === 'admin' ? 'purple' : 'default'}>
                    {member.role === 'admin' ? (
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> Member
                      </span>
                    )}
                  </Badge>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    disabled={changingRoleId === member.id}
                    className={cn(
                      'px-2 py-1 bg-bg-tertiary border border-border-default rounded text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan',
                      changingRoleId === member.id && 'opacity-50'
                    )}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                )}

                {/* Remove button */}
                {!isSelf && !isOnlyAdmin && (
                  <button
                    onClick={() => setRemovingId(member.id)}
                    className="p-1.5 text-text-tertiary hover:text-accent-error rounded transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-text-tertiary">
            No members found
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <Dialog open={!!removingId} onOpenChange={() => setRemovingId(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">Remove member</h2>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-text-secondary">
              Are you sure you want to remove{' '}
              <strong className="text-text-primary">
                {memberToRemove?.profile?.display_name || 'this member'}
              </strong>{' '}
              from the organization? They will lose access to all projects.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemovingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

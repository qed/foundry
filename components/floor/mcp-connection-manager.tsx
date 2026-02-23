'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Copy, Trash2, Plus, Check, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'

interface McpConnectionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

interface Connection {
  id: string
  name: string
  description: string | null
  api_key_preview: string
  agent_type: string
  status: string
  rate_limit: number
  scopes: string[]
  last_used_at: string | null
  created_at: string
}

const AGENT_TYPES = [
  { value: 'code_assistant', label: 'Code Assistant', description: 'Cursor, Claude Code, VS Code' },
  { value: 'ci_cd', label: 'CI/CD', description: 'GitHub Actions, Jenkins' },
  { value: 'github_action', label: 'GitHub Action', description: 'Automated workflows' },
  { value: 'custom', label: 'Custom', description: 'Other integrations' },
]

const SCOPE_GROUPS = [
  {
    label: 'Read',
    scopes: [
      { value: 'read:work-orders', label: 'Work Orders' },
      { value: 'read:blueprints', label: 'Blueprints' },
      { value: 'read:requirements', label: 'Requirements' },
      { value: 'read:features', label: 'Features' },
      { value: 'read:phases', label: 'Phases' },
    ],
  },
  {
    label: 'Write',
    scopes: [
      { value: 'write:status', label: 'Update Status' },
      { value: 'write:assignment', label: 'Assign WOs' },
      { value: 'write:priority', label: 'Change Priority' },
      { value: 'write:create-work-orders', label: 'Create WOs' },
    ],
  },
  {
    label: 'Admin',
    scopes: [
      { value: 'admin:project', label: 'Full Access' },
    ],
  },
]

type ViewMode = 'list' | 'create'

export function McpConnectionManager({ open, onOpenChange, projectId }: McpConnectionManagerProps) {
  const { addToast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agentType, setAgentType] = useState('code_assistant')
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['read:work-orders', 'read:blueprints', 'read:requirements', 'read:features', 'read:phases']))

  // Newly created key (shown once)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)

  // Fetch connections on open
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/mcp/connections`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setConnections(data.connections || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, projectId])

  // Reset create form when switching to create mode
  const handleStartCreate = useCallback(() => {
    setName('')
    setDescription('')
    setAgentType('code_assistant')
    setSelectedScopes(new Set(['read:work-orders', 'read:blueprints', 'read:requirements', 'read:features', 'read:phases']))
    setNewApiKey(null)
    setKeyCopied(false)
    setKeyVisible(false)
    setViewMode('create')
  }, [])

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  const handleCreate = useCallback(async () => {
    if (!name.trim() || selectedScopes.size === 0) return
    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/mcp/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          agent_type: agentType,
          scopes: Array.from(selectedScopes),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        addToast(data.error || 'Failed to create connection', 'error')
        return
      }

      const data = await res.json()
      setNewApiKey(data.api_key)
      addToast('Connection created', 'success')

      // Refresh list
      const listRes = await fetch(`/api/projects/${projectId}/mcp/connections`)
      if (listRes.ok) {
        const listData = await listRes.json()
        setConnections(listData.connections || [])
      }
    } catch {
      addToast('Failed to create connection', 'error')
    } finally {
      setCreating(false)
    }
  }, [projectId, name, description, agentType, selectedScopes, addToast])

  const handleRevoke = useCallback(async (connectionId: string) => {
    setRevoking(connectionId)
    try {
      const res = await fetch(`/api/projects/${projectId}/mcp/connections/${connectionId}/revoke`, {
        method: 'POST',
      })

      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId))
        addToast('Connection revoked', 'success')
      } else {
        addToast('Failed to revoke connection', 'error')
      }
    } catch {
      addToast('Failed to revoke connection', 'error')
    } finally {
      setRevoking(null)
    }
  }, [projectId, addToast])

  const handleCopyKey = useCallback(async () => {
    if (!newApiKey) return
    await navigator.clipboard.writeText(newApiKey)
    setKeyCopied(true)
    addToast('API key copied to clipboard', 'success')
    setTimeout(() => setKeyCopied(false), 3000)
  }, [newApiKey, addToast])

  const handleClose = useCallback(() => {
    setViewMode('list')
    setNewApiKey(null)
    onOpenChange(false)
  }, [onOpenChange])

  const activeConnections = connections.filter((c) => c.status === 'active')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent-cyan" />
            {viewMode === 'list' ? 'API Connections' : newApiKey ? 'Connection Created' : 'New API Connection'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto space-y-3">
          {/* List mode */}
          {viewMode === 'list' && (
            <>
              <p className="text-xs text-text-secondary">
                API connections allow external tools (Cursor, Claude Code, CI/CD) to interact with this project.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeConnections.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">No active connections</p>
                  <p className="text-xs text-text-tertiary mt-1">Create one to connect external tools</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border-default"
                    >
                      <Shield className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-text-primary font-medium truncate">{conn.name}</p>
                          <span className="text-[10px] text-text-tertiary font-mono">
                            fnd_...{conn.api_key_preview}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-text-tertiary capitalize">
                            {conn.agent_type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-text-tertiary">
                            {conn.scopes.length} scope{conn.scopes.length !== 1 ? 's' : ''}
                          </span>
                          {conn.last_used_at && (
                            <span className="text-[10px] text-text-tertiary">
                              Last used {timeAgo(conn.last_used_at)}
                            </span>
                          )}
                          <span className="text-[10px] text-text-tertiary">
                            Created {timeAgo(conn.created_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(conn.id)}
                        disabled={revoking === conn.id}
                        className="p-1 text-text-tertiary hover:text-accent-error transition-colors rounded flex-shrink-0"
                        title="Revoke connection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Create mode — show new key */}
          {viewMode === 'create' && newApiKey && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent-warning/10 border border-accent-warning/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0" />
                <p className="text-xs text-accent-warning">
                  Copy this API key now. It will not be shown again.
                </p>
              </div>

              <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-accent-cyan font-mono break-all">
                    {keyVisible ? newApiKey : `fnd_${'*'.repeat(56)}${newApiKey.slice(-8)}`}
                  </code>
                  <button
                    onClick={() => setKeyVisible(!keyVisible)}
                    className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                    title={keyVisible ? 'Hide key' : 'Show key'}
                  >
                    {keyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleCopyKey}
                    className={cn(
                      'p-1 transition-colors rounded',
                      keyCopied ? 'text-accent-success' : 'text-text-tertiary hover:text-text-primary'
                    )}
                    title="Copy to clipboard"
                  >
                    {keyCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default text-xs text-text-secondary space-y-2">
                <p className="font-medium text-text-primary">Usage with Claude Code / Cursor:</p>
                <p>Add to your MCP config:</p>
                <code className="block text-[10px] text-accent-purple whitespace-pre">
{`{
  "helix-foundry": {
    "url": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1",
    "headers": {
      "Authorization": "Bearer <your-api-key>"
    }
  }
}`}
                </code>
              </div>
            </div>
          )}

          {/* Create mode — form */}
          {viewMode === 'create' && !newApiKey && (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Connection Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-cyan transition-colors"
                  placeholder="e.g., My Cursor Integration"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Description (optional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-cyan transition-colors"
                  placeholder="What this connection is for"
                />
              </div>

              {/* Agent type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Agent Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_TYPES.map((at) => (
                    <button
                      key={at.value}
                      onClick={() => setAgentType(at.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-left transition-colors',
                        agentType === at.value
                          ? 'border-accent-cyan/40 bg-accent-cyan/5'
                          : 'border-border-default hover:bg-bg-tertiary'
                      )}
                    >
                      <p className={cn(
                        'text-xs font-medium',
                        agentType === at.value ? 'text-accent-cyan' : 'text-text-primary'
                      )}>
                        {at.label}
                      </p>
                      <p className="text-[10px] text-text-tertiary">{at.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Permissions</label>
                <div className="space-y-2">
                  {SCOPE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.scopes.map((scope) => {
                          const isSelected = selectedScopes.has(scope.value)
                          return (
                            <button
                              key={scope.value}
                              onClick={() => toggleScope(scope.value)}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors',
                                isSelected
                                  ? 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
                                  : 'border-border-default text-text-secondary hover:text-text-primary'
                              )}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                              {scope.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {viewMode === 'list' && (
            <>
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Close
              </Button>
              <Button size="sm" onClick={handleStartCreate}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Connection
              </Button>
            </>
          )}
          {viewMode === 'create' && !newApiKey && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                isLoading={creating}
                disabled={!name.trim() || selectedScopes.size === 0}
              >
                Create Connection
              </Button>
            </>
          )}
          {viewMode === 'create' && newApiKey && (
            <Button size="sm" onClick={() => { setNewApiKey(null); setViewMode('list') }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

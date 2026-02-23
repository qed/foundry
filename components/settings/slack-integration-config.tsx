'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast-container'

const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'ux_issue', label: 'UX Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
]

interface SlackConfig {
  webhook_url: string
  channel_name: string | null
  notify_critical: boolean
  notify_high_score: boolean
  high_score_threshold: number
  notify_categories: string[]
  is_active: boolean
}

interface SlackIntegrationConfigProps {
  projectId: string
}

export function SlackIntegrationConfig({ projectId }: SlackIntegrationConfigProps) {
  const { addToast } = useToast()
  const [config, setConfig] = useState<SlackConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [webhookUrl, setWebhookUrl] = useState('')
  const [channelName, setChannelName] = useState('')
  const [notifyCritical, setNotifyCritical] = useState(true)
  const [notifyHighScore, setNotifyHighScore] = useState(false)
  const [highScoreThreshold, setHighScoreThreshold] = useState(75)
  const [notifyCategories, setNotifyCategories] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  // Load config
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/projects/${projectId}/integrations/slack`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (data.config) {
          setConfig(data.config)
          setWebhookUrl(data.config.webhook_url)
          setChannelName(data.config.channel_name || '')
          setNotifyCritical(data.config.notify_critical)
          setNotifyHighScore(data.config.notify_high_score)
          setHighScoreThreshold(data.config.high_score_threshold)
          setNotifyCategories(data.config.notify_categories || [])
          setIsActive(data.config.is_active)
        }
      } catch {
        addToast('Failed to load Slack configuration', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId, addToast])

  const handleSave = useCallback(async () => {
    if (isSaving) return

    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      addToast('Webhook URL must start with https://hooks.slack.com/', 'error')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/slack`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          channelName: channelName || undefined,
          notifyCritical,
          notifyHighScore,
          highScoreThreshold,
          notifyCategories,
          isActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Failed to save', 'error')
        return
      }

      const data = await res.json()
      setConfig(data.config)
      addToast('Slack integration saved', 'success')
    } catch {
      addToast('Failed to save Slack configuration', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [projectId, webhookUrl, channelName, notifyCritical, notifyHighScore, highScoreThreshold, notifyCategories, isActive, isSaving, addToast])

  const handleTest = useCallback(async () => {
    if (isTesting) return
    setIsTesting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/slack/test`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || 'Test notification failed', 'error')
        return
      }
      addToast('Test notification sent to Slack', 'success')
    } catch {
      addToast('Failed to send test notification', 'error')
    } finally {
      setIsTesting(false)
    }
  }, [projectId, isTesting, addToast])

  const handleDelete = useCallback(async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/slack`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        addToast('Failed to remove integration', 'error')
        return
      }
      setConfig(null)
      setWebhookUrl('')
      setChannelName('')
      setNotifyCritical(true)
      setNotifyHighScore(false)
      setHighScoreThreshold(75)
      setNotifyCategories([])
      setIsActive(true)
      addToast('Slack integration removed', 'success')
    } catch {
      addToast('Failed to remove integration', 'error')
    } finally {
      setIsDeleting(false)
    }
  }, [projectId, isDeleting, addToast])

  const toggleCategory = (cat: string) => {
    setNotifyCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6 flex items-center justify-center min-h-[200px]">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <div className="glass-panel rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Slack Webhook Integration
          </h3>
          <p className="text-sm text-text-tertiary mt-1">
            Send feedback notifications to a Slack channel via an Incoming Webhook.
            Create one in your Slack workspace under Apps &gt; Incoming Webhooks.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              className={cn(
                'w-full rounded-lg bg-bg-tertiary border border-border-default px-3 py-2 text-sm text-text-primary',
                'placeholder:text-text-tertiary/50',
                'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Channel Name <span className="text-text-tertiary">(optional, for display only)</span>
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="#feedback-alerts"
              className={cn(
                'w-full rounded-lg bg-bg-tertiary border border-border-default px-3 py-2 text-sm text-text-primary',
                'placeholder:text-text-tertiary/50',
                'focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent'
              )}
            />
          </div>
        </div>
      </div>

      {/* Notification Rules */}
      <div className="glass-panel rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Notification Rules</h3>

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded bg-bg-tertiary border-border-default text-accent-cyan focus:ring-accent-cyan"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">Integration Active</span>
            <p className="text-xs text-text-tertiary">Disable to pause all Slack notifications</p>
          </div>
        </label>

        {/* Critical feedback */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyCritical}
            onChange={(e) => setNotifyCritical(e.target.checked)}
            className="w-4 h-4 rounded bg-bg-tertiary border-border-default text-accent-cyan focus:ring-accent-cyan"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">Critical Feedback</span>
            <p className="text-xs text-text-tertiary">Notify when feedback scores 90 or above</p>
          </div>
        </label>

        {/* High score */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyHighScore}
              onChange={(e) => setNotifyHighScore(e.target.checked)}
              className="w-4 h-4 rounded bg-bg-tertiary border-border-default text-accent-cyan focus:ring-accent-cyan"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">High-Score Feedback</span>
              <p className="text-xs text-text-tertiary">Notify when feedback exceeds a threshold</p>
            </div>
          </label>
          {notifyHighScore && (
            <div className="ml-7 flex items-center gap-3">
              <label className="text-sm text-text-secondary">Threshold:</label>
              <input
                type="number"
                min={50}
                max={100}
                value={highScoreThreshold}
                onChange={(e) => setHighScoreThreshold(Number(e.target.value))}
                className="w-20 rounded-lg bg-bg-tertiary border border-border-default px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
              />
              <span className="text-xs text-text-tertiary">/ 100</span>
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-text-primary">Category Filter</span>
            <p className="text-xs text-text-tertiary">Notify for specific feedback categories (leave empty for no category filter)</p>
          </div>
          <div className="flex flex-wrap gap-2 ml-0.5">
            {FEEDBACK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  notifyCategories.includes(cat.value)
                    ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                    : 'bg-bg-tertiary text-text-tertiary border-border-default hover:border-border-hover'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !webhookUrl}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            webhookUrl
              ? 'bg-accent-cyan text-bg-primary hover:bg-accent-cyan/80'
              : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
          )}
        >
          {isSaving ? <Spinner size="sm" /> : config ? 'Update Integration' : 'Save Integration'}
        </button>

        {config && (
          <>
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-tertiary text-text-secondary border border-border-default hover:border-accent-cyan/40 transition-colors"
            >
              {isTesting ? <Spinner size="sm" /> : 'Send Test'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-accent-error hover:bg-accent-error/10 transition-colors"
            >
              {isDeleting ? <Spinner size="sm" /> : 'Remove'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

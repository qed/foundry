'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, FolderKanban, Check, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-container'
import { cn } from '@/lib/utils'

interface SubscriptionData {
  subscription: {
    id: string
    plan: string
    seat_limit: number
    current_seats: number
    billing_status: string
    auto_renew: boolean
    current_period_start: string | null
    current_period_end: string | null
  }
  plan: {
    id: string
    name: string
    price: number
    priceAnnual: number
    seatLimit: number
    features: string[]
  } | null
  usage: {
    seats: { used: number; limit: number; percentage: number }
    projects: { active: number; archived: number }
  }
}

const PLAN_INFO = [
  { id: 'free', name: 'Free', price: 0, seats: 3, badge: 'default' as const },
  { id: 'pro', name: 'Pro', price: 99, seats: 10, badge: 'success' as const },
  { id: 'enterprise', name: 'Enterprise', price: 0, seats: 999, badge: 'purple' as const },
]

interface BillingTabProps {
  orgId: string
}

export function BillingTab({ orgId }: BillingTabProps) {
  const { addToast } = useToast()
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  useEffect(() => {
    async function doFetch() {
      try {
        const res = await fetch(`/api/orgs/${orgId}/subscription`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }
    doFetch()
  }, [orgId])

  async function handleUpgrade() {
    if (!selectedPlan) return
    setUpgrading(true)
    try {
      const res = await fetch(`/api/orgs/${orgId}/subscription/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to change plan')
      }

      addToast(result.message, 'success')
      setShowUpgrade(false)
      setSelectedPlan(null)

      // Refresh data
      const refreshRes = await fetch(`/api/orgs/${orgId}/subscription`)
      if (refreshRes.ok) {
        setData(await refreshRes.json())
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to change plan', 'error')
    } finally {
      setUpgrading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        Unable to load subscription data
      </p>
    )
  }

  const { subscription, usage } = data
  const currentPlanInfo = PLAN_INFO.find((p) => p.id === subscription.plan)

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Current Plan</h2>
          <Badge variant={currentPlanInfo?.badge || 'default'}>
            {currentPlanInfo?.name || subscription.plan}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Seat Usage */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Users className="w-4 h-4" />
                Seats
              </div>
              <span className="text-sm text-text-primary font-medium">
                {usage.seats.used} / {usage.seats.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  usage.seats.percentage >= 90
                    ? 'bg-accent-error'
                    : usage.seats.percentage >= 70
                      ? 'bg-accent-warning'
                      : 'bg-accent-cyan'
                )}
                style={{ width: `${Math.min(100, usage.seats.percentage)}%` }}
              />
            </div>
          </div>

          {/* Projects */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <FolderKanban className="w-4 h-4" />
              Projects
            </div>
            <span className="text-sm text-text-primary">
              {usage.projects.active} active
              {usage.projects.archived > 0 && (
                <span className="text-text-tertiary ml-1">
                  ({usage.projects.archived} archived)
                </span>
              )}
            </span>
          </div>

          {/* Billing status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Status</span>
            <Badge
              variant={
                subscription.billing_status === 'active'
                  ? 'success'
                  : subscription.billing_status === 'trialing'
                    ? 'default'
                    : 'warning'
              }
            >
              {subscription.billing_status}
            </Badge>
          </div>
        </div>

        {subscription.plan !== 'enterprise' && (
          <div className="mt-6 pt-4 border-t border-border-default">
            <Button
              size="sm"
              onClick={() => {
                setSelectedPlan(null)
                setShowUpgrade(true)
              }}
            >
              <ArrowUp className="w-4 h-4 mr-1.5" />
              Change Plan
            </Button>
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLAN_INFO.map((plan) => {
            const isCurrent = plan.id === subscription.plan

            return (
              <div
                key={plan.id}
                className={cn(
                  'p-4 rounded-lg border',
                  isCurrent
                    ? 'border-accent-cyan bg-accent-cyan/5'
                    : 'border-border-default bg-bg-secondary'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-text-primary">{plan.name}</span>
                  {isCurrent && (
                    <span className="text-[10px] text-accent-cyan font-medium">CURRENT</span>
                  )}
                </div>
                <p className="text-lg font-bold text-text-primary mb-1">
                  {plan.price > 0 ? `$${plan.price}` : plan.id === 'enterprise' ? 'Custom' : 'Free'}
                  {plan.price > 0 && (
                    <span className="text-xs font-normal text-text-tertiary">/mo</span>
                  )}
                </p>
                <p className="text-xs text-text-tertiary">
                  {plan.seats >= 999 ? 'Unlimited' : `Up to ${plan.seats}`} seats
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={() => setShowUpgrade(false)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">Change Plan</h2>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              {PLAN_INFO.filter((p) => p.id !== subscription.plan).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border text-left transition-colors',
                    selectedPlan === plan.id
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default bg-bg-secondary hover:border-text-tertiary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{plan.name}</p>
                      <p className="text-xs text-text-tertiary">
                        {plan.seats >= 999 ? 'Unlimited' : `${plan.seats}`} seats
                        {plan.price > 0 ? ` · $${plan.price}/mo` : ''}
                      </p>
                    </div>
                    {selectedPlan === plan.id && (
                      <Check className="w-5 h-5 text-accent-cyan" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {subscription.plan !== 'free' && selectedPlan === 'free' && (
              <p className="mt-3 text-xs text-accent-warning">
                Downgrading to Free requires {PLAN_INFO[0].seats} or fewer members.
                You currently have {usage.seats.used}.
              </p>
            )}

            {selectedPlan === 'enterprise' && (
              <p className="mt-3 text-xs text-text-tertiary">
                Enterprise plans include custom pricing. Contact us for details.
                For now, this will set unlimited seats.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpgrade(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              isLoading={upgrading}
              disabled={!selectedPlan}
            >
              Switch Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

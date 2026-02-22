'use client'

import { useState } from 'react'
import { CheckCircle, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG } from './types'
import type { IdeaWithDetails } from './types'
import type { IdeaStatus } from '@/types/database'

type Step = 'confirm' | 'select-level' | 'details' | 'success'
type SeedLevel = 'epic' | 'feature'

function inferSeedLevel(idea: IdeaWithDetails): SeedLevel {
  const bodyLength = (idea.body || '').length
  const isComplex = bodyLength > 500
  const broadTerms = ['system', 'platform', 'infrastructure', 'redesign', 'architecture']
  const text = (idea.title + ' ' + (idea.body || '')).toLowerCase()
  const isBroad = broadTerms.some((term) => text.includes(term))
  return isBroad && isComplex ? 'epic' : 'feature'
}

interface PromotionWizardProps {
  idea: IdeaWithDetails
  isOpen: boolean
  onClose: () => void
  onPromoted: (seedId: string) => void
  orgSlug: string
  projectId: string
}

export function PromotionWizard({
  idea,
  isOpen,
  onClose,
  onPromoted,
  orgSlug,
  projectId,
}: PromotionWizardProps) {
  const [step, setStep] = useState<Step>('confirm')
  const [seedLevel, setSeedLevel] = useState<SeedLevel>(inferSeedLevel(idea))
  const [seedName, setSeedName] = useState(idea.title)
  const [seedDescription, setSeedDescription] = useState(idea.body || '')
  const [isPromoting, setIsPromoting] = useState(false)
  const [promotedSeedId, setPromotedSeedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const statusCfg = STATUS_CONFIG[idea.status as IdeaStatus]

  function handleClose() {
    // Reset state on close
    setStep('confirm')
    setSeedLevel(inferSeedLevel(idea))
    setSeedName(idea.title)
    setSeedDescription(idea.body || '')
    setError(null)
    setPromotedSeedId(null)
    onClose()
  }

  async function handlePromote() {
    setIsPromoting(true)
    setError(null)

    try {
      const res = await fetch(`/api/hall/ideas/${idea.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedLevel,
          seedName: seedName.trim(),
          seedDescription: seedDescription.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Promotion failed')
      }

      const data = await res.json()
      setPromotedSeedId(data.seedId)
      setStep('success')
      onPromoted(data.seedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote idea')
    } finally {
      setIsPromoting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        {/* Step 1: Confirm */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-warning" />
                Promote to Pattern Shop
              </h2>
            </DialogHeader>

            <DialogBody>
              <div className="glass-panel rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={statusCfg.variant} className="text-[10px]">
                    {statusCfg.label}
                  </Badge>
                </div>
                <h3 className="font-semibold text-text-primary text-sm mb-1">
                  {idea.title}
                </h3>
                {idea.body && (
                  <p className="text-text-tertiary text-xs line-clamp-3">{idea.body}</p>
                )}
                {idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {idea.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-text-secondary">
                This idea will be promoted to Pattern Shop as a seed, where it can be
                elaborated into detailed requirements.
              </p>

              {idea.status === 'developing' && (
                <p className="text-xs text-accent-warning mt-2">
                  This idea is still developing. Consider refining it to &ldquo;Mature&rdquo; before promoting.
                </p>
              )}
              {idea.status === 'raw' && (
                <p className="text-xs text-accent-warning mt-2">
                  This is a raw idea. Consider developing it further before promoting.
                </p>
              )}
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep('select-level')}>Continue</Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Select Level */}
        {step === 'select-level' && (
          <>
            <DialogHeader>
              <h2 className="text-lg font-semibold text-text-primary">
                Choose Seed Level
              </h2>
            </DialogHeader>

            <DialogBody>
              <p className="text-sm text-text-secondary mb-4">
                Select the level that best fits this idea.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setSeedLevel('epic')}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    seedLevel === 'epic'
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-primary text-sm">Epic Seed</span>
                    {seedLevel === 'epic' && (
                      <span className="text-[10px] text-accent-cyan font-medium">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Large initiative spanning multiple features or platforms. Estimated effort: 4+ weeks.
                  </p>
                </button>

                <button
                  onClick={() => setSeedLevel('feature')}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    seedLevel === 'feature'
                      ? 'border-accent-cyan bg-accent-cyan/5'
                      : 'border-border-default hover:border-border-default/80 hover:bg-bg-tertiary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-primary text-sm">Feature Seed</span>
                    {seedLevel === 'feature' && (
                      <span className="text-[10px] text-accent-cyan font-medium">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Smaller deliverable or specific feature. Estimated effort: 1-2 weeks.
                  </p>
                </button>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('confirm')}>Back</Button>
              <Button onClick={() => setStep('details')}>Continue</Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Edit Details */}
        {step === 'details' && (
          <>
            <DialogHeader>
              <h2 className="text-lg font-semibold text-text-primary">
                Confirm Seed Details
              </h2>
            </DialogHeader>

            <DialogBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Seed Name
                  </label>
                  <input
                    type="text"
                    value={seedName}
                    onChange={(e) => setSeedName(e.target.value)}
                    disabled={isPromoting}
                    maxLength={200}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Description
                  </label>
                  <textarea
                    value={seedDescription}
                    onChange={(e) => setSeedDescription(e.target.value)}
                    rows={4}
                    disabled={isPromoting}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan disabled:opacity-50 resize-y"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-text-secondary mb-1.5">
                    Level
                  </span>
                  <Badge variant="purple" className="text-xs capitalize">
                    {seedLevel}
                  </Badge>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg border border-accent-error/30 bg-accent-error/5">
                  <p className="text-sm text-accent-error">{error}</p>
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('select-level')} disabled={isPromoting}>
                Back
              </Button>
              <Button
                onClick={handlePromote}
                isLoading={isPromoting}
                disabled={!seedName.trim()}
              >
                Promote Idea
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Success */}
        {step === 'success' && promotedSeedId && (
          <>
            <DialogHeader>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent-success" />
                Idea Promoted!
              </h2>
            </DialogHeader>

            <DialogBody>
              <p className="text-sm text-text-secondary mb-4">
                <span className="font-semibold text-text-primary">{seedName}</span> is now
                available in Pattern Shop as a {seedLevel} seed.
              </p>

              <div className="p-3 rounded-lg border border-accent-success/30 bg-accent-success/5">
                <p className="text-sm text-accent-success">
                  The idea has been promoted and you can continue elaborating it in Pattern Shop.
                </p>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Done</Button>
              <Button
                onClick={() => {
                  window.location.href = `/org/${orgSlug}/project/${projectId}/shop`
                }}
              >
                Go to Pattern Shop
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-container'

function CreateProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const orgId = searchParams.get('orgId')
  const orgSlug = searchParams.get('orgSlug')

  const [loading, setLoading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!orgId || !orgSlug) {
      setError('Organization information missing')
      setLoading(false)
      return
    }

    if (!projectName.trim()) {
      setError('Project name is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          name: projectName.trim(),
          description: description.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      addToast('Project created successfully!', 'success')
      router.push(`/org/${orgSlug}/project/${data.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!orgId || !orgSlug) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass-panel rounded-xl p-6">
          <p className="text-accent-error">
            Invalid onboarding link. Please{' '}
            <a
              href="/onboarding/org-choice"
              className="text-accent-cyan hover:text-accent-cyan/80 underline"
            >
              start over
            </a>
            .
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-xl p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Create Your First Project
          </h1>
          <p className="text-text-secondary mb-6">
            Projects help you organize your work and collaborate with your team.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-accent-error/20 text-accent-error rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4">
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={loading}
              placeholder="My First Project"
              autoFocus
            />

            <Textarea
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="What is this project about?"
              rows={3}
            />

            <Button
              type="submit"
              disabled={loading || !projectName.trim()}
              isLoading={loading}
              className="w-full"
            >
              Create Project
            </Button>
          </form>

          <p className="mt-4 text-xs text-text-tertiary text-center">
            You can create more projects later
          </p>
        </div>
      </div>
    </main>
  )
}

export default function CreateProjectPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <TopBar />
      <Suspense
        fallback={
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-text-secondary">Loading...</div>
          </main>
        }
      >
        <CreateProjectForm />
      </Suspense>
    </div>
  )
}

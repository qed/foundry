'use client'

import { useState } from 'react'
import { Package, Lightbulb, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast-container'

export default function ComponentShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inputError, setInputError] = useState('')
  const { addToast } = useToast()

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">
            Component Library
          </h1>
          <p className="text-text-secondary">
            Helix Foundry UI components — Phase 007
          </p>
        </div>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Buttons
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="outline">Outline</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button isLoading>Loading...</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Inputs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              helperText="We'll never share your email."
            />
            <Input
              label="With Error"
              type="text"
              placeholder="Type something..."
              value={inputError}
              onChange={(e) => setInputError(e.target.value)}
              error={inputError.length > 0 && inputError.length < 3 ? 'Must be at least 3 characters' : undefined}
            />
          </div>
        </section>

        {/* Textarea */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Textarea
          </h2>
          <Textarea
            label="Description"
            rows={4}
            placeholder="Enter a description..."
            helperText="Markdown is supported."
          />
        </section>

        {/* Select */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Select
          </h2>
          <div className="max-w-xs">
            <Select
              label="Role"
              placeholder="Choose a role..."
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'editor', label: 'Editor' },
                { value: 'viewer', label: 'Viewer' },
              ]}
            />
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-text-secondary">
                  Configure your project preferences and team settings.
                </p>
              </CardBody>
              <CardFooter>
                <Button size="sm">Save Changes</Button>
              </CardFooter>
            </Card>
            <Card className="glass-panel">
              <CardBody>
                <p className="text-text-secondary">
                  A card using the glass-panel class for that frosted effect.
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* Dialog */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Dialog
          </h2>
          <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogClose onClick={() => setDialogOpen(false)} />
              </DialogHeader>
              <DialogBody>
                <p className="text-text-secondary">
                  Are you sure you want to proceed? This action cannot be undone.
                </p>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => setDialogOpen(false)}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        {/* Spinner */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Spinner
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <Spinner size="sm" />
              <p className="text-xs text-text-tertiary mt-2">Small</p>
            </div>
            <div className="text-center">
              <Spinner size="md" />
              <p className="text-xs text-text-tertiary mt-2">Medium</p>
            </div>
            <div className="text-center">
              <Spinner size="lg" />
              <p className="text-xs text-text-tertiary mt-2">Large</p>
            </div>
          </div>
        </section>

        {/* Avatar */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Avatar
          </h2>
          <div className="flex items-center gap-4">
            <Avatar alt="John Doe" initials="JD" size="sm" />
            <Avatar alt="Alice Smith" initials="AS" size="md" />
            <Avatar alt="Bob Chen" initials="BC" size="lg" />
          </div>
        </section>

        {/* Toast */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Toasts
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addToast('Operation completed successfully!', 'success')}
            >
              Success Toast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addToast('Something went wrong. Please try again.', 'error')}
            >
              Error Toast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addToast('Here is some useful information.', 'info')}
            >
              Info Toast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addToast('Please check your settings.', 'warning')}
            >
              Warning Toast
            </Button>
          </div>
        </section>

        {/* Empty State */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Empty State
          </h2>
          <Card>
            <CardBody>
              <EmptyState
                icon={<Package className="w-10 h-10" />}
                title="No projects yet"
                description="Create your first project to get started building with Helix Foundry."
                action={<Button size="sm">Create Project</Button>}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <EmptyState
                icon={<Users className="w-10 h-10" />}
                title="No team members"
                description="Invite your team to collaborate on this project."
              />
            </CardBody>
          </Card>
        </section>

        {/* All Together */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary border-b border-border-default pb-2">
            Combined Example
          </h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Idea</CardTitle>
                <Badge variant="default">Draft</Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input label="Title" placeholder="Enter idea title..." />
              <Textarea label="Description" rows={3} placeholder="Describe your idea..." />
              <Select
                label="Priority"
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent-warning" />
                <span className="text-sm text-text-secondary">
                  Ideas are visible to all project members.
                </span>
              </div>
            </CardBody>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost">Cancel</Button>
              <Button>Submit Idea</Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  )
}

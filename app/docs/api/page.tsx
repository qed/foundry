'use client'

import { useEffect, useState } from 'react'

interface PathInfo {
  method: string
  summary: string
  tags: string[]
}

interface GroupedEndpoints {
  [tag: string]: { path: string; method: string; summary: string }[]
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/docs')
      const data = await res.json()
      setSpec(data)
    }
    load()
  }, [])

  if (!spec) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <p className="text-text-secondary">Loading API documentation...</p>
      </div>
    )
  }

  const info = spec.info as { title: string; version: string; description: string }
  const paths = spec.paths as Record<string, Record<string, PathInfo>>
  const tags = (spec.tags || []) as { name: string; description: string }[]

  // Group endpoints by tag
  const grouped: GroupedEndpoints = {}
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods)) {
      const tag = details.tags?.[0] || 'Other'
      if (!grouped[tag]) grouped[tag] = []
      grouped[tag].push({ path, method: method.toUpperCase(), summary: details.summary || '' })
    }
  }

  const methodColors: Record<string, string> = {
    GET: 'bg-accent-success/20 text-accent-success',
    POST: 'bg-accent-cyan/20 text-accent-cyan',
    PUT: 'bg-accent-warning/20 text-accent-warning',
    PATCH: 'bg-accent-warning/20 text-accent-warning',
    DELETE: 'bg-accent-error/20 text-accent-error',
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{info.title}</h1>
        <p className="text-text-secondary mb-1">Version {info.version}</p>
        <p className="text-text-secondary mb-8 max-w-3xl">{info.description}</p>

        <div className="space-y-10">
          {tags.map((tag) => {
            const endpoints = grouped[tag.name]
            if (!endpoints?.length) return null
            return (
              <section key={tag.name}>
                <h2 className="text-xl font-semibold mb-1">{tag.name}</h2>
                <p className="text-text-tertiary text-sm mb-4">{tag.description}</p>
                <div className="space-y-2">
                  {endpoints.map((ep, i) => (
                    <div
                      key={`${ep.path}-${ep.method}-${i}`}
                      className="glass-panel px-4 py-3 flex items-center gap-3"
                    >
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${methodColors[ep.method] || 'bg-bg-tertiary text-text-secondary'}`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-sm text-text-secondary font-mono flex-1">
                        {ep.path}
                      </code>
                      <span className="text-sm text-text-tertiary hidden sm:block">
                        {ep.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <div className="mt-12 pt-8 border-t border-border-default text-text-tertiary text-sm">
          <p>
            Full OpenAPI spec available at{' '}
            <a href="/api/docs" className="text-accent-cyan hover:underline">
              /api/docs
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

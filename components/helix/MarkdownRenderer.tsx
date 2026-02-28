'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }) => (
          <h1 className="text-3xl font-bold mt-6 mb-4 text-text-primary" {...props}>{children}</h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-2xl font-bold mt-5 mb-3 text-text-primary" {...props}>{children}</h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-xl font-semibold mt-4 mb-2 text-text-primary" {...props}>{children}</h3>
        ),
        h4: ({ children, ...props }) => (
          <h4 className="text-lg font-semibold mt-3 mb-2 text-text-primary" {...props}>{children}</h4>
        ),
        p: ({ children, ...props }) => (
          <p className="text-text-secondary leading-relaxed mb-4" {...props}>{children}</p>
        ),
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside text-text-secondary mb-4 space-y-1" {...props}>{children}</ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside text-text-secondary mb-4 space-y-1" {...props}>{children}</ol>
        ),
        li: ({ children, ...props }) => (
          <li className="text-text-secondary" {...props}>{children}</li>
        ),
        blockquote: ({ children, ...props }) => (
          <blockquote className="border-l-4 border-accent-cyan pl-4 italic text-text-secondary mb-4" {...props}>
            {children}
          </blockquote>
        ),
        code: ({ children, className, ...props }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return (
              <code
                className="block bg-bg-primary border border-bg-tertiary rounded p-4 text-sm text-text-secondary mb-4 overflow-x-auto"
                {...props}
              >
                {children}
              </code>
            )
          }
          return (
            <code className="bg-bg-tertiary px-2 py-1 rounded text-sm text-accent-cyan" {...props}>
              {children}
            </code>
          )
        },
        table: ({ children, ...props }) => (
          <table className="w-full border-collapse mb-4" {...props}>{children}</table>
        ),
        th: ({ children, ...props }) => (
          <th className="border border-bg-tertiary bg-bg-tertiary p-2 text-text-primary font-semibold text-left" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-bg-tertiary p-2 text-text-secondary" {...props}>{children}</td>
        ),
        a: ({ children, ...props }) => (
          <a className="text-accent-cyan hover:underline" {...props}>{children}</a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

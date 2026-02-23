'use client'

import { useState } from 'react'
import { Copy, Check, Code2, ExternalLink } from 'lucide-react'
import { useToast } from '@/components/ui/toast-container'

const JS_EXAMPLE = `async function submitFeedback(content, userEmail, userName) {
  const response = await fetch('/api/insights/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': process.env.NEXT_PUBLIC_FEEDBACK_KEY
    },
    body: JSON.stringify({
      content,
      submitter_email: userEmail,
      submitter_name: userName,
      metadata: {
        page_url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
  });

  if (response.ok) {
    console.log('Feedback sent successfully');
  } else {
    console.error('Failed to send feedback');
  }
}`

const CURL_EXAMPLE = `curl -X POST /api/insights/feedback \\
  -H "Content-Type: application/json" \\
  -H "X-App-Key: YOUR_APP_KEY_HERE" \\
  -d '{
    "content": "User feedback message",
    "submitter_email": "user@example.com",
    "submitter_name": "User Name"
  }'`

type Tab = 'javascript' | 'curl'

export function SetupInstructions() {
  const [activeTab, setActiveTab] = useState<Tab>('javascript')
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  const code = activeTab === 'javascript' ? JS_EXAMPLE : CURL_EXAMPLE

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    addToast('Code copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Code2 className="w-5 h-5 text-accent-purple" />
          Setup Instructions
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          Use these examples to integrate feedback collection into your application
        </p>
      </div>

      {/* Language tabs */}
      <div className="flex items-center gap-1 border-b border-border-default">
        <button
          onClick={() => setActiveTab('javascript')}
          className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'javascript'
              ? 'text-accent-cyan border-accent-cyan'
              : 'text-text-tertiary border-transparent hover:text-text-secondary'
          }`}
        >
          JavaScript
        </button>
        <button
          onClick={() => setActiveTab('curl')}
          className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'curl'
              ? 'text-accent-cyan border-accent-cyan'
              : 'text-text-tertiary border-transparent hover:text-text-secondary'
          }`}
        >
          cURL
        </button>
      </div>

      {/* Code block */}
      <div className="relative">
        <button
          onClick={copyCode}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-bg-tertiary hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-accent-success" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
        <pre className="bg-bg-primary border border-border-default rounded-lg p-4 pr-24 text-xs font-mono text-text-secondary overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>

      {/* Help links */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-text-tertiary">
          <ExternalLink className="w-3.5 h-3.5" />
          The feedback endpoint accepts POST requests with an X-App-Key header
        </span>
      </div>

      {/* Required fields info */}
      <div className="bg-bg-tertiary/50 border border-border-default rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          Required Fields
        </h3>
        <div className="space-y-1.5 text-xs text-text-secondary">
          <div className="flex items-start gap-2">
            <code className="bg-bg-primary px-1.5 py-0.5 rounded text-accent-cyan flex-shrink-0">
              content
            </code>
            <span>The feedback text (10-5000 characters)</span>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-bg-primary px-1.5 py-0.5 rounded text-accent-cyan flex-shrink-0">
              X-App-Key
            </code>
            <span>Your API key in the request header</span>
          </div>
        </div>
        <h3 className="text-sm font-medium text-text-primary mt-3 mb-2">
          Optional Fields
        </h3>
        <div className="space-y-1.5 text-xs text-text-secondary">
          <div className="flex items-start gap-2">
            <code className="bg-bg-primary px-1.5 py-0.5 rounded text-accent-purple flex-shrink-0">
              submitter_email
            </code>
            <span>Email of the person giving feedback</span>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-bg-primary px-1.5 py-0.5 rounded text-accent-purple flex-shrink-0">
              submitter_name
            </code>
            <span>Name of the person giving feedback</span>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-bg-primary px-1.5 py-0.5 rounded text-accent-purple flex-shrink-0">
              metadata
            </code>
            <span>JSON object with browser, device, page URL info</span>
          </div>
        </div>
      </div>
    </div>
  )
}

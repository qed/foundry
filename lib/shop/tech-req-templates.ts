export type TechReqCategory = 'auth_security' | 'api_integrations' | 'performance_scalability' | 'data_storage'

export const TECH_REQ_CATEGORIES: { key: TechReqCategory; label: string }[] = [
  { key: 'auth_security', label: 'Authentication & Security' },
  { key: 'api_integrations', label: 'API & Integrations' },
  { key: 'performance_scalability', label: 'Performance & Scalability' },
  { key: 'data_storage', label: 'Data & Storage' },
]

export function getCategoryLabel(key: TechReqCategory): string {
  return TECH_REQ_CATEGORIES.find((c) => c.key === key)?.label ?? key
}

export function buildTechReqTemplate(title: string, category: TechReqCategory): string {
  switch (category) {
    case 'auth_security':
      return `<h1>${escapeHtml(title)}</h1>

<h2>Overview</h2>
<p><em>Describe the security requirement and its business context.</em></p>

<h2>Specification</h2>
<p><em>Define technical specification and implementation approach.</em></p>

<h2>Compliance</h2>
<p><em>Reference applicable standards, regulations, or best practices.</em></p>

<h2>Testing Requirements</h2>
<p><em>How will this be tested and verified?</em></p>

<h2>Acceptance Criteria</h2>
<ul>
  <li>Criterion 1</li>
  <li>Criterion 2</li>
</ul>`

    case 'api_integrations':
      return `<h1>${escapeHtml(title)}</h1>

<h2>Overview</h2>
<p><em>Integration summary and business purpose.</em></p>

<h2>API Endpoint</h2>
<p><em>Endpoint URL, method, request/response format.</em></p>

<h2>Authentication</h2>
<p><em>How the API is authenticated.</em></p>

<h2>Error Handling</h2>
<p><em>How errors are handled and retried.</em></p>

<h2>Rate Limiting</h2>
<p><em>Rate limits and retry strategy.</em></p>`

    case 'performance_scalability':
      return `<h1>${escapeHtml(title)}</h1>

<h2>Requirement</h2>
<p><em>Describe the performance requirement clearly.</em></p>

<h2>SLA</h2>
<p><em>Response time, throughput, and availability targets.</em></p>

<h2>Current Capacity</h2>
<p><em>What the system currently handles.</em></p>

<h2>Scaling Strategy</h2>
<p><em>How will the system scale? Load balancing, caching, database sharding?</em></p>

<h2>Testing</h2>
<p><em>Load testing plan and success criteria.</em></p>`

    case 'data_storage':
      return `<h1>${escapeHtml(title)}</h1>

<h2>Overview</h2>
<p><em>Describe the data/storage requirement.</em></p>

<h2>Data Retention</h2>
<p><em>Retention policy and lifecycle.</em></p>

<h2>Backup & Recovery</h2>
<p><em>Backup frequency, retention, and recovery process.</em></p>

<h2>Migration Strategy</h2>
<p><em>Data migration approach if applicable.</em></p>

<h2>Testing</h2>
<p><em>How will this be tested and verified?</em></p>`
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

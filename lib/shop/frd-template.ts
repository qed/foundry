export function buildFrdTemplate(featureTitle: string): string {
  return `<h1>${featureTitle} - Feature Requirement</h1>

<h2>Overview</h2>
<p><em>Provide a brief description of what this feature does and why it matters.</em></p>
<p>Replace this with your overview...</p>

<h2>User Story</h2>
<p><em>Write user stories in the format: As a [user role], I want to [action], so that [benefit].</em></p>
<p>Replace this with your user story...</p>

<h2>Requirements</h2>
<ul>
  <li><em>Functional requirement 1</em></li>
  <li><em>Functional requirement 2</em></li>
  <li><em>Non-functional requirement 1</em></li>
</ul>
<p>Replace this with your requirements...</p>

<h2>Acceptance Criteria</h2>
<p><em>Define what "done" looks like. Use GIVEN/WHEN/THEN or checklist format.</em></p>
<ul>
  <li>Criterion 1</li>
  <li>Criterion 2</li>
</ul>

<h2>Out of Scope</h2>
<p><em>Explicitly state what is NOT included in this feature.</em></p>
<p>Replace this with out-of-scope items...</p>

<h2>Dependencies</h2>
<p><em>List other features, tasks, or systems this depends on.</em></p>
<ul>
  <li>Dependency on [Feature Name]</li>
</ul>`
}

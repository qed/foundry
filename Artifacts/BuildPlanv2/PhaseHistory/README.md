# PhaseHistory

Per-epic phase history files. Each file tracks what was actually built in
completed phases, organized by epic.

## Creating a new epic file

When the first phase in a new epic completes, create a file named:
`epic-XX-short-name.md`

Template:
```markdown
# Epic XX: Epic Name (Phases NNN-MMM)

> One-line purpose of this epic.
> Key files: `path/to/key/`, `directories/`

```

Then append the first phase entry using the standard format:
```
**NNN** -- Phase Title -- Detailed technical narrative describing what was actually
built. Include API endpoints created, components built, schemas added, patterns
established, key files created/modified, integration points, and design decisions.
```

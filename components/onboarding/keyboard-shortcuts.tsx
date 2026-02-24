'use client'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Open global search' },
  { keys: ['Ctrl', '1'], action: 'Navigate to Hall' },
  { keys: ['Ctrl', '2'], action: 'Navigate to Pattern Shop' },
  { keys: ['Ctrl', '3'], action: 'Navigate to Control Room' },
  { keys: ['Ctrl', '4'], action: 'Navigate to Assembly Floor' },
  { keys: ['Ctrl', '5'], action: 'Navigate to Insights Lab' },
  { keys: ['Esc'], action: 'Close modal / dialog' },
]

export function KeyboardShortcuts() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Keyboard Shortcuts</h3>
      <div className="space-y-1.5">
        {SHORTCUTS.map(({ keys, action }) => (
          <div key={action} className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{action}</span>
            <div className="flex gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded text-xs font-mono text-text-primary"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

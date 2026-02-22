'use client'

import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#A855F7', // Purple
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#808080', // Gray
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div>
      {/* Preset swatches */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            disabled={disabled}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed',
              value.toLowerCase() === color.toLowerCase()
                ? 'border-text-primary ring-2 ring-accent-cyan ring-offset-2 ring-offset-bg-secondary'
                : 'border-border-default hover:border-text-tertiary'
            )}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-8 h-8 rounded border border-border-default cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Custom color"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
              onChange(v)
            }
          }}
          disabled={disabled}
          placeholder="#808080"
          className="flex-1 px-3 py-1.5 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent disabled:opacity-50"
          maxLength={7}
        />
        <div
          className="w-7 h-7 rounded-full border border-border-default flex-shrink-0"
          style={{ backgroundColor: value }}
          title="Preview"
        />
      </div>
    </div>
  )
}

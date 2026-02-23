/**
 * Generate a deterministic color for a user based on their ID.
 * Colors are chosen from a palette that works well for cursors on dark backgrounds.
 */
const CURSOR_COLORS = [
  '#00d4ff', // cyan
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#06b6d4', // sky
  '#f97316', // orange
  '#84cc16', // lime
]

export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit int
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

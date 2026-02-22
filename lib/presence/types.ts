export type ModuleId = 'hall' | 'shop' | 'room' | 'floor' | 'lab'

export interface UserPresence {
  user_id: string
  display_name: string
  avatar_url: string | null
  current_module: ModuleId | null
  joined_at: number
}

export const MODULE_LABELS: Record<ModuleId, string> = {
  hall: 'The Hall',
  shop: 'Pattern Shop',
  room: 'Control Room',
  floor: 'Assembly Floor',
  lab: 'Insights Lab',
}

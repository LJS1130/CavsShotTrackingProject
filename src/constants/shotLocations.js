export const shotLocations = [
  { id: 'left-corner', label: 'Left Corner 3', normalizedX: 0.06, normalizedY: 0.20 },
  { id: 'left-wing', label: 'Left Wing 3', normalizedX: 0.22, normalizedY: 0.45   },
  { id: 'top-key', label: 'Top of the Key', normalizedX: 0.5, normalizedY: 0.68 },
  { id: 'right-wing', label: 'Right Wing 3', normalizedX: 0.78, normalizedY: 0.45 },
  { id: 'right-corner', label: 'Right Corner 3', normalizedX: 0.94, normalizedY: 0.20 }
]

export const MAX_SHOTS_PER_LOCATION = 20
export const MAX_TOTAL_SHOTS = shotLocations.length * MAX_SHOTS_PER_LOCATION
export const PLAYER_NAME_SUGGESTION = 'F. Lastname'
export const SESSION_API_ENDPOINT = import.meta.env.VITE_SESSION_API_ENDPOINT || '/api/sessions'


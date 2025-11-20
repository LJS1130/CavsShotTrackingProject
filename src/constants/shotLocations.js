export const shotLocations = [
  { id: 'left-corner', label: 'Left Corner 3', normalizedX: 0.06, normalizedY: 0.12 },
  { id: 'left-wing', label: 'Left Wing 3', normalizedX: 0.28, normalizedY: 0.22 },
  { id: 'top-key', label: 'Top of the Key', normalizedX: 0.5, normalizedY: 0.48 },
  { id: 'right-wing', label: 'Right Wing 3', normalizedX: 0.72, normalizedY: 0.23 },
  { id: 'right-corner', label: 'Right Corner 3', normalizedX: 0.94, normalizedY: 0.12 }
]

export const MAX_SHOTS_PER_LOCATION = 20
export const MAX_TOTAL_SHOTS = shotLocations.length * MAX_SHOTS_PER_LOCATION
export const PLAYER_NAME_SUGGESTION = 'F. Lastname'
export const SESSION_API_ENDPOINT = import.meta.env.VITE_SESSION_API_ENDPOINT || '/api/sessions'


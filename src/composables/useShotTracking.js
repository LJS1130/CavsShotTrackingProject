import { ref, computed } from 'vue'
import { shotLocations, MAX_SHOTS_PER_LOCATION, MAX_TOTAL_SHOTS } from '../constants/shotLocations.js'

export function useShotTracking() {
  const shots = ref([])
  const activeLocationId = ref(null)
  const currentShotType = ref('make')
  const selectionMessage = ref('')

  const clampNormalized = (value, fallback = 0.5) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback
    }
    return Math.min(Math.max(value, 0), 1)
  }

  const getLocationById = (id) => shotLocations.find((location) => location.id === id)

  const determineShotLocation = (normalizedX, normalizedY) => {
    if (normalizedX <= 0.19) {
      return getLocationById('left-corner') ?? shotLocations[0]
    }
    if (normalizedX >= 0.81) {
      return getLocationById('right-corner') ?? shotLocations[shotLocations.length - 1]
    }
    if (normalizedX < 0.44) {
      return getLocationById('left-wing') ?? shotLocations[1]
    }
    if (normalizedX > 0.56) {
      return getLocationById('right-wing') ?? shotLocations[shotLocations.length - 2]
    }
    return getLocationById('top-key') ?? shotLocations[Math.floor(shotLocations.length / 2)]
  }

  const normalizeShotRecord = (raw) => {
    if (!raw) return null

    const normalizedX = clampNormalized(raw.normalizedX)
    const normalizedY = clampNormalized(raw.normalizedY)
    const baseLocation =
      (typeof raw.locationId === 'string' && getLocationById(raw.locationId)) ||
      determineShotLocation(normalizedX, normalizedY)

    return {
      normalizedX,
      normalizedY,
      made: Boolean(raw.made),
      locationId: baseLocation.id,
      locationLabel: baseLocation.label,
      timestamp: raw.timestamp ?? new Date().toISOString()
    }
  }

  const serializeShots = (records) =>
    records
      .map((record) => normalizeShotRecord(record))
      .filter((record) => record !== null)

  const stats = computed(() => {
    const makes = shots.value.filter((shot) => shot.made).length
    const attempts = shots.value.length
    const misses = attempts - makes
    const percentage = attempts > 0 ? ((makes / attempts) * 100).toFixed(1) : '0.0'

    return {
      makes,
      misses,
      attempts,
      percentage
    }
  })

  const locationStats = computed(() =>
    shotLocations.map((location) => {
      const locationShots = shots.value.filter((shot) => shot.locationId === location.id)
      const makes = locationShots.filter((shot) => shot.made).length
      const attempts = locationShots.length
      const percentage = attempts > 0 ? ((makes / attempts) * 100).toFixed(1) : '0.0'
      const remaining = Math.max(MAX_SHOTS_PER_LOCATION - attempts, 0)

      return {
        id: location.id,
        label: location.label,
        makes,
        attempts,
        percentage,
        remaining,
        isCompleted: attempts >= MAX_SHOTS_PER_LOCATION
      }
    })
  )

  const locationStatsMap = computed(() =>
    locationStats.value.reduce((acc, stat) => {
      acc[stat.id] = stat
      return acc
    }, {})
  )

  const completedLocationIds = computed(() => 
    locationStats.value.filter((location) => location.isCompleted).map((location) => location.id)
  )
  
  const allLocationsCompleted = computed(() => 
    completedLocationIds.value.length === shotLocations.length
  )

  const getLocationStat = (locationId) => locationStatsMap.value[locationId]

  const getLocationAttempts = (locationId) => {
    const stat = getLocationStat(locationId)
    return stat ? stat.attempts : 0
  }

  const getLocationRemaining = (locationId) => {
    const stat = getLocationStat(locationId)
    return stat ? stat.remaining : MAX_SHOTS_PER_LOCATION
  }

  const isLocationCompleted = (locationId) => {
    const stat = getLocationStat(locationId)
    return stat ? stat.isCompleted : false
  }

  const updateSelectionMessage = (completedLocationLabel, sessionState) => {
    const { isSessionComplete, isSessionPaused, isPersistingSession } = sessionState

    if (completedLocationLabel) {
      selectionMessage.value = `${completedLocationLabel} complete! Select a new location.`
      return
    }

    if (isSessionComplete) {
      selectionMessage.value = 'Session complete. Start a new session or review your stats.'
      return
    }

    if (isSessionPaused) {
      selectionMessage.value = 'Session paused. Click Resume to continue.'
      return
    }

    if (isPersistingSession) {
      selectionMessage.value = 'Saving your session...'
      return
    }

    if (allLocationsCompleted.value) {
      selectionMessage.value = 'All locations complete! Mark the session complete when you are ready.'
      return
    }

    if (activeLocationId.value) {
      const activeStats = locationStats.value.find((location) => location.id === activeLocationId.value)
      if (activeStats) {
        const remaining = Math.max(MAX_SHOTS_PER_LOCATION - activeStats.attempts, 0)
        selectionMessage.value =
          remaining > 0
            ? `Tracking ${activeStats.label}: ${activeStats.attempts}/${MAX_SHOTS_PER_LOCATION} shots logged (${remaining} remaining).`
            : `${activeStats.label} complete! Select a new location.`
        return
      }
    }

    selectionMessage.value = ''
  }

  const logShot = (type, overrideCoords, sessionState) => {
    const { isSessionComplete, isSessionPaused, isPersistingSession } = sessionState

    if (isSessionComplete) {
      selectionMessage.value = 'Session complete. Start a new session to log more shots.'
      return
    }

    if (isSessionPaused) {
      selectionMessage.value = 'Session paused. Click Resume to continue logging shots.'
      return
    }

    if (isPersistingSession) {
      selectionMessage.value = 'Saving session. Please wait...'
      return
    }

    const locationId = activeLocationId.value
    if (!locationId) {
      updateSelectionMessage(null, sessionState)
      return
    }

    const location = getLocationById(locationId)
    if (!location) {
      activeLocationId.value = null
      updateSelectionMessage(null, sessionState)
      return
    }

    const stats = getLocationStat(locationId)
    if (stats?.isCompleted) {
      activeLocationId.value = null
      updateSelectionMessage(location.label, sessionState)
      return
    }

    if (shots.value.length >= MAX_TOTAL_SHOTS) {
      selectionMessage.value = 'All locations complete! Mark the session complete when you are ready.'
      return
    }

    const baseCoords = overrideCoords ?? {
      normalizedX: location.normalizedX,
      normalizedY: location.normalizedY
    }

    const shotData = normalizeShotRecord({
      normalizedX: baseCoords.normalizedX,
      normalizedY: baseCoords.normalizedY,
      made: type === 'make',
      locationId: location.id,
      timestamp: new Date().toISOString()
    })

    if (!shotData) return

    shots.value.push(shotData)

    const updatedAttempts = (stats?.attempts ?? 0) + 1
    if (updatedAttempts >= MAX_SHOTS_PER_LOCATION) {
      activeLocationId.value = null
      updateSelectionMessage(location.label, sessionState)
    } else {
      updateSelectionMessage(null, sessionState)
    }
  }

  const handleLogShot = (type, sessionState) => {
    currentShotType.value = type
    logShot(type, null, sessionState)
  }

  const selectLocation = (locationId, sessionState) => {
    const { isSessionComplete, isSessionPaused, isPersistingSession } = sessionState

    if (isSessionComplete) {
      selectionMessage.value = 'Session complete. Start a new session to log more shots.'
      return
    }

    if (isSessionPaused) {
      selectionMessage.value = 'Session paused. Click Resume to continue.'
      return
    }

    if (isPersistingSession) {
      selectionMessage.value = 'Saving session. Please wait...'
      return
    }

    const location = getLocationById(locationId)
    if (!location) return

    const stats = locationStats.value.find((entry) => entry.id === locationId)
    if (stats?.isCompleted) {
      selectionMessage.value = `${stats.label} shots are already complete. Choose another location.`
      return
    }

    activeLocationId.value = locationId
    updateSelectionMessage(null, sessionState)
  }

  const undoLastShot = (sessionState) => {
    if (shots.value.length === 0) return
    const { isSessionComplete, isSessionPaused } = sessionState
    if (isSessionComplete || isSessionPaused) return
    shots.value.pop()
    updateSelectionMessage(null, sessionState)
  }

  const clearShots = () => {
    if (!shots.value.length) return
    const confirmClear = typeof window !== 'undefined' ? window.confirm('Are you sure you want to clear all shots?') : true
    if (confirmClear) {
      shots.value = []
      activeLocationId.value = null
    }
  }

  const resetShotState = () => {
    shots.value = []
    activeLocationId.value = null
    currentShotType.value = 'make'
    selectionMessage.value = ''
  }

  const setShots = (newShots) => {
    shots.value = serializeShots(Array.isArray(newShots) ? newShots : [])
  }

  return {
    // State
    shots,
    activeLocationId,
    currentShotType,
    selectionMessage,
    
    // Computed
    stats,
    locationStats,
    locationStatsMap,
    allLocationsCompleted,
    
    // Methods
    getLocationById,
    getLocationStat,
    getLocationAttempts,
    getLocationRemaining,
    isLocationCompleted,
    logShot,
    handleLogShot,
    selectLocation,
    undoLastShot,
    clearShots,
    resetShotState,
    setShots,
    serializeShots,
    updateSelectionMessage,
    determineShotLocation,
    normalizeShotRecord
  }
}


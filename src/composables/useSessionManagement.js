import { ref, computed } from 'vue'
import { SESSION_API_ENDPOINT, MAX_TOTAL_SHOTS } from '../constants/shotLocations.js'
import {
  getSessionIdentifier,
  getSessionPlayerName,
  getSessionTimestampValue,
  formatSessionTimestamp,
  formatSessionStatus,
  getSessionAttemptCount,
  isSessionStatusComplete,
  normalizeSessionList,
  calculateSessionStats
} from './useSessionHelpers.js'
import {
  readStoredSessions,
  upsertStoredSession,
  removeStoredSession,
  getIncompleteStoredSessions
} from './useLocalStorage.js'

export function useSessionManagement() {
  const sessionId = ref(null)
  const currentPlayerName = ref('')
  const playerNameInput = ref('')
  const playerNameError = ref('')
  const isSessionSetupVisible = ref(true)
  const sessionSetupMode = ref('choice')
  const incompleteSessions = ref([])
  const isLoadingSessions = ref(false)
  const sessionsLoadError = ref('')
  const isLoadingSelectedSession = ref(false)
  const selectedSessionId = ref(null)
  const isSessionPaused = ref(false)
  const isSessionComplete = ref(false)
  const isPersistingSession = ref(false)
  const previousSessions = ref([])
  const isLoadingPreviousSessions = ref(false)

  const hasIncompleteSessions = computed(() => incompleteSessions.value.length > 0)
  const canBeginSession = computed(() => playerNameInput.value.trim().length > 0)

  const mergeSessionLists = (primary, secondary) => {
    const seen = new Set()
    const merged = []

    const addSession = (session) => {
      if (!session || typeof session !== 'object') return
      const identifier = getSessionIdentifier(session)
      const key = identifier ?? JSON.stringify(session)
      if (key && seen.has(key)) return
      if (key) {
        seen.add(key)
      }
      merged.push(session)
    }

    primary.forEach(addSession)
    secondary.forEach(addSession)

    return merged
  }

  const sortSessionsByTimestamp = (sessions) =>
    [...sessions].sort((a, b) => {
      const aTime = new Date(getSessionTimestampValue(a) ?? 0).getTime()
      const bTime = new Date(getSessionTimestampValue(b) ?? 0).getTime()

      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
      if (Number.isNaN(aTime)) return 1
      if (Number.isNaN(bTime)) return -1
      return bTime - aTime
    })

  const loadIncompleteSessions = async () => {
    isLoadingSessions.value = true
    sessionsLoadError.value = ''

    const localSessions = getIncompleteStoredSessions(isSessionStatusComplete)
    let remoteSessions = []
    let remoteError = null

    const shouldRequestApi =
      typeof fetch !== 'undefined' &&
      typeof SESSION_API_ENDPOINT === 'string' &&
      SESSION_API_ENDPOINT.trim().length > 0

    if (shouldRequestApi) {
      try {
        const response = await fetch(`${SESSION_API_ENDPOINT}?status=incomplete`)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = await response.json()
        const sessions = normalizeSessionList(payload)
        remoteSessions = sessions
          .filter((session) => {
            if (!session || typeof session !== 'object') return false
            return !isSessionStatusComplete(session.status)
          })
          .map((session) => ({ ...session, __source: 'remote' }))
      } catch (error) {
        console.error('Unable to load sessions', error)
        remoteError = error
      }
    } else {
      remoteError = new Error('Session service is unavailable in this environment.')
    }

    const combinedSessions = mergeSessionLists(remoteSessions, localSessions)
    incompleteSessions.value = sortSessionsByTimestamp(combinedSessions)

    if (remoteError) {
      if (localSessions.length) {
        sessionsLoadError.value = 'Working offline. Showing locally saved sessions.'
      } else {
        sessionsLoadError.value = 'Unable to reach the session service. Sessions will be saved locally.'
      }
    } else {
      sessionsLoadError.value = ''
    }

    isLoadingSessions.value = false
  }

  const ensureSessionId = () => {
    if (sessionId.value) return sessionId.value

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      sessionId.value = crypto.randomUUID()
    } else {
      const randomSuffix = Math.random().toString(16).slice(2, 10)
      sessionId.value = `session-${Date.now()}-${randomSuffix}`
    }

    return sessionId.value
  }

  const persistSession = async (status, shots, stats, locationStats, selectionMessage) => {
    if (!shots.length) return { savedLocally: false, savedRemotely: false }
    if (isPersistingSession.value) return { savedLocally: false, savedRemotely: false }

    const statusMessageMap = {
      paused: 'Saving your session and pausing progress...',
      active: 'Resuming your session...',
      complete: 'Saving your session and marking it complete...'
    }

    if (selectionMessage) {
      selectionMessage.value = statusMessageMap[status] ?? 'Saving your session...'
    }

    const hadExistingId = Boolean(sessionId.value)
    const currentSessionId = ensureSessionId()
    const timestamp = new Date().toISOString()

    const payload = {
      id: currentSessionId,
      status,
      playerName: currentPlayerName.value,
      shots,
      stats,
      locations: locationStats,
      sessionId: currentSessionId,
      timestamp,
      updatedAt: timestamp
    }

    let localSaveSucceeded = upsertStoredSession(payload)

    const canPersistRemotely =
      typeof fetch !== 'undefined' &&
      typeof SESSION_API_ENDPOINT === 'string' &&
      SESSION_API_ENDPOINT.trim().length > 0

    if (!canPersistRemotely) {
      if (selectionMessage) {
        selectionMessage.value = 'Session saved locally. Connect to the internet to sync.'
      }
      return { savedLocally: localSaveSucceeded, savedRemotely: false, offline: true }
    }

    try {
      isPersistingSession.value = true

      const endpoint = hadExistingId ? `${SESSION_API_ENDPOINT}/${currentSessionId}` : SESSION_API_ENDPOINT
      const method = hadExistingId ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      if (!hadExistingId) {
        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          try {
            const body = await response.json()
            if (body?.id) {
              sessionId.value = body.id
            }
          } catch (responseParseError) {
            console.warn('Unable to parse session response body.', responseParseError)
          }
        }
      }

      if (isSessionStatusComplete(status)) {
        removeStoredSession(currentSessionId)
      } else {
        upsertStoredSession(payload)
      }

      return { savedLocally: localSaveSucceeded, savedRemotely: true }
    } catch (error) {
      console.error('Unable to persist session', error)
      console.error('API Endpoint:', SESSION_API_ENDPOINT)
      
      if (!localSaveSucceeded) {
        localSaveSucceeded = upsertStoredSession(payload)
      }
      if (localSaveSucceeded) {
        if (selectionMessage) {
          selectionMessage.value = 'Session saved locally. Connect to the internet to sync.'
        }
        return { savedLocally: true, savedRemotely: false, offline: true, error }
      }
      if (typeof window !== 'undefined') {
        const errorMsg = `Unable to write the session to the database.\n\n` +
          `API Endpoint: ${SESSION_API_ENDPOINT}\n` +
          `Error: ${error.message}\n\n` +
          `Please check:\n` +
          `1. Is your backend API server running?\n` +
          `2. Is localStorage enabled in your browser?\n` +
          `3. Check the browser console for more details.`
        window.alert(errorMsg)
      }
      throw error
    } finally {
      isPersistingSession.value = false
    }
  }

  const processPlayerSessions = (sessions, includeTimestamp = false) => {
    const currentSessionId = sessionId.value
    const currentPlayerNameTrimmed = currentPlayerName.value.trim()
    
    const playerSessions = sessions
      .filter((session) => {
        const sessionPlayerName = getSessionPlayerName(session)
        const sessionIdValue = getSessionIdentifier(session)
        return sessionPlayerName === currentPlayerNameTrimmed &&
               (includeTimestamp || isSessionStatusComplete(session?.status)) &&
               sessionIdValue !== currentSessionId
      })
      .sort((a, b) => {
        const aTime = new Date(getSessionTimestampValue(a) ?? 0).getTime()
        const bTime = new Date(getSessionTimestampValue(b) ?? 0).getTime()
        return bTime - aTime
      })
      .slice(0, 5)
    
    return playerSessions.map((session) => {
      const calculatedStats = calculateSessionStats(session)
      const result = {
        ...session,
        stats: {
          attempts: calculatedStats.attempts,
          makes: calculatedStats.makes,
          misses: calculatedStats.misses
        },
        percentage: calculatedStats.percentage
      }
      if (includeTimestamp) {
        result.timestamp = getSessionTimestampValue(session)
      }
      return result
    })
  }

  const loadPreviousSessions = async () => {
    if (!currentPlayerName.value) return
    
    isLoadingPreviousSessions.value = true
    previousSessions.value = []
    
    try {
      const canRequestApi =
        typeof fetch !== 'undefined' &&
        typeof SESSION_API_ENDPOINT === 'string' &&
        SESSION_API_ENDPOINT.trim().length > 0

      if (!canRequestApi) {
        const allStoredSessions = readStoredSessions()
        previousSessions.value = processPlayerSessions(allStoredSessions, false)
        isLoadingPreviousSessions.value = false
        return
      }

      const response = await fetch(`${SESSION_API_ENDPOINT}?status=complete`)
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const payload = await response.json()
      const sessions = normalizeSessionList(payload)
      previousSessions.value = processPlayerSessions(sessions, true)
    } catch (error) {
      console.error('Unable to load previous sessions', error)
      const allStoredSessions = readStoredSessions()
      previousSessions.value = processPlayerSessions(allStoredSessions, false)
    } finally {
      isLoadingPreviousSessions.value = false
    }
  }

  const resetSessionState = () => {
    sessionId.value = null
    isSessionPaused.value = false
    isSessionComplete.value = false
    isPersistingSession.value = false
  }

  return {
    // State
    sessionId,
    currentPlayerName,
    playerNameInput,
    playerNameError,
    isSessionSetupVisible,
    sessionSetupMode,
    incompleteSessions,
    isLoadingSessions,
    sessionsLoadError,
    isLoadingSelectedSession,
    selectedSessionId,
    isSessionPaused,
    isSessionComplete,
    isPersistingSession,
    previousSessions,
    isLoadingPreviousSessions,
    
    // Computed
    hasIncompleteSessions,
    canBeginSession,
    
    // Methods
    loadIncompleteSessions,
    persistSession,
    loadPreviousSessions,
    resetSessionState,
    ensureSessionId,
    processPlayerSessions,
    
    // Helpers (re-exported for convenience)
    getSessionIdentifier,
    getSessionPlayerName,
    formatSessionTimestamp,
    formatSessionStatus,
    getSessionAttemptCount
  }
}


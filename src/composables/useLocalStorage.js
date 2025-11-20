import { getSessionIdentifier } from './useSessionHelpers.js'

const LOCAL_SESSION_STORAGE_KEY = 'cavs.offlineSessions'

export const supportsLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const sanitizeSessionForStorage = (session) => {
  if (!session || typeof session !== 'object') return null
  const sanitized = { ...session }
  delete sanitized.__source
  return sanitized
}

export const readStoredSessions = () => {
  if (!supportsLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('Unable to read stored sessions', error)
    return []
  }
}

export const writeStoredSessions = (sessions) => {
  if (!supportsLocalStorage()) {
    console.error('localStorage is not supported in this browser')
    return false
  }
  try {
    const serialized = JSON.stringify(sessions)
    window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, serialized)
    return true
  } catch (error) {
    console.error('Unable to write stored sessions', error)
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.error('localStorage quota exceeded. Try clearing old sessions or browser data.')
    } else if (error.name === 'SecurityError' || error.code === 18) {
      console.error('localStorage access denied. Check browser security settings.')
    }
    return false
  }
}

export const upsertStoredSession = (session) => {
  if (!supportsLocalStorage()) {
    console.error('localStorage is not supported, cannot save session locally')
    return false
  }
  const identifier = getSessionIdentifier(session)
  if (!identifier) {
    console.error('Session missing identifier, cannot save:', session)
    return false
  }
  const sanitized = sanitizeSessionForStorage({
    ...session,
    updatedAt: session?.updatedAt ?? new Date().toISOString()
  })
  if (!sanitized) {
    console.error('Session sanitization failed, cannot save')
    return false
  }
  try {
    const existingSessions = readStoredSessions()
    const filtered = existingSessions.filter((entry) => getSessionIdentifier(entry) !== identifier)
    filtered.push(sanitized)
    return writeStoredSessions(filtered)
  } catch (error) {
    console.error('Error in upsertStoredSession:', error)
    return false
  }
}

export const removeStoredSession = (identifier) => {
  if (!supportsLocalStorage()) return false
  if (!identifier) return false
  const existingSessions = readStoredSessions()
  const filtered = existingSessions.filter((session) => getSessionIdentifier(session) !== identifier)
  return writeStoredSessions(filtered)
}

export const getIncompleteStoredSessions = (isSessionStatusCompleteFn) => {
  return readStoredSessions()
    .filter((session) => !isSessionStatusCompleteFn(session?.status))
    .map((session) => ({ ...session, __source: 'local' }))
}


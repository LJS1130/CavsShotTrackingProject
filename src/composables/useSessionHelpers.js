// Helper functions for session data manipulation

export const getSessionIdentifier = (session) => {
  if (!session || typeof session !== 'object') return null
  return (
    session.id ??
    session.sessionId ??
    session.session_id ??
    session.identifier ??
    null
  )
}

export const getSessionPlayerName = (session) => {
  if (!session || typeof session !== 'object') return ''
  return (session.playerName ?? session.player ?? '').trim()
}

export const getSessionTimestampValue = (session) => {
  if (!session || typeof session !== 'object') return null
  return (
    session.updatedAt ??
    session.updated_at ??
    session.lastModified ??
    session.last_modified ??
    session.timestamp ??
    session.createdAt ??
    session.created_at ??
    null
  )
}

export const formatSessionTimestamp = (session) => {
  const raw = getSessionTimestampValue(session)
  if (!raw) return 'Time not available'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return typeof raw === 'string' ? raw : 'Time not available'
  }
  try {
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return date.toISOString()
  }
}

export const isSessionStatusComplete = (status) => {
  if (!status) return false
  const normalized = String(status).toLowerCase()
  return normalized === 'complete' || normalized === 'completed'
}

export const formatSessionStatus = (status) => {
  if (!status) return 'Unknown'
  const normalized = String(status).toLowerCase()
  if (normalized === 'paused') return 'Paused'
  if (normalized === 'active') return 'In Progress'
  if (isSessionStatusComplete(normalized)) return 'Completed'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export const getSessionAttemptCount = (session) => {
  if (!session || typeof session !== 'object') return 0
  if (Array.isArray(session.shots)) return session.shots.length
  if (session.stats && typeof session.stats.attempts === 'number') return session.stats.attempts
  if (typeof session.totalShots === 'number') return session.totalShots
  if (typeof session.attempts === 'number') return session.attempts
  return 0
}

export const normalizeSessionList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.sessions)) return payload.sessions
    if (Array.isArray(payload.data)) return payload.data
    if (Array.isArray(payload.items)) return payload.items
    if (Array.isArray(payload.incompleteSessions)) return payload.incompleteSessions
    if (Array.isArray(payload.openSessions)) return payload.openSessions
    if (Array.isArray(payload.results)) return payload.results
  }
  return []
}

export const calculateSessionStats = (session) => {
  // If shots array exists, calculate from it (most accurate)
  if (Array.isArray(session.shots) && session.shots.length > 0) {
    const attempts = session.shots.length
    const makes = session.shots.filter((shot) => shot.made === true || shot.made === 'true').length
    return {
      attempts,
      makes,
      misses: attempts - makes,
      percentage: attempts > 0 ? ((makes / attempts) * 100).toFixed(1) : '0.0'
    }
  }
  
  // Otherwise use stored stats
  const attempts = session.stats?.attempts ?? 0
  const makes = session.stats?.makes ?? 0
  return {
    attempts,
    makes,
    misses: attempts - makes,
    percentage: attempts > 0 ? ((makes / attempts) * 100).toFixed(1) : '0.0'
  }
}


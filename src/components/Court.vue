<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ShotCounter from './ShotCounter.vue'
import SessionSetup from './SessionSetup.vue'
import StatsPanel from './StatsPanel.vue'
import ShotMapping from './ShotMapping.vue'
import CompleteSessionModal from './CompleteSessionModal.vue'
import { MAX_TOTAL_SHOTS, SESSION_API_ENDPOINT } from '../constants/shotLocations.js'
import { useShotTracking } from '../composables/useShotTracking.js'
import { useSessionManagement } from '../composables/useSessionManagement.js'
import { getSessionIdentifier, getSessionPlayerName, normalizeSessionList } from '../composables/useSessionHelpers.js'
import { readStoredSessions } from '../composables/useLocalStorage.js'

// Composables
const shotTracking = useShotTracking()
const sessionManagement = useSessionManagement()

// Local state
const imageWidth = ref(0)
const imageHeight = ref(0)
const isSmallScreen = ref(false)
const showComparisonView = ref(false)
const showCompleteConfirm = ref(false)

// Destructure from composables for easier access
const {
  shots,
  activeLocationId,
  currentShotType,
  selectionMessage,
  stats,
  locationStats,
  allLocationsCompleted,
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
  updateSelectionMessage
} = shotTracking

const {
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
  hasIncompleteSessions,
  canBeginSession,
  loadIncompleteSessions,
  persistSession,
  loadPreviousSessions,
  resetSessionState,
  getSessionIdentifier: getSessionId,
  formatSessionTimestamp
} = sessionManagement

// Session state object for shot tracking
const sessionState = computed(() => ({
  isSessionComplete: isSessionComplete.value,
  isSessionPaused: isSessionPaused.value,
  isPersistingSession: isPersistingSession.value
}))

const updateDimensions = (event) => {
  if (typeof window !== 'undefined') {
    isSmallScreen.value = window.innerWidth <= 600
  }

  if (event?.target) {
    const rect = event.target.getBoundingClientRect()
    imageWidth.value = rect.width
    imageHeight.value = rect.height
  }
}

const handleShotRecorded = (coords) => {
  if (!activeLocationId.value) return
  
  const tappedLocation = shotTracking.determineShotLocation(coords.normalizedX, coords.normalizedY)
  
  if (activeLocationId.value !== tappedLocation.id) {
    selectLocation(tappedLocation.id, sessionState.value)
    return
  }
  
  logShot(currentShotType.value, coords, sessionState.value)
}

const handleLocationSelected = (locationId) => {
  selectLocation(locationId, sessionState.value)
}

const handleLogShotClick = (type) => {
  handleLogShot(type, sessionState.value)
}

const handleUndoShot = () => {
  undoLastShot(sessionState.value)
}

const handleClearShots = () => {
  clearShots()
}

// Session setup handlers
const openNewSessionForm = () => {
  playerNameInput.value = currentPlayerName.value || ''
  playerNameError.value = ''
  sessionSetupMode.value = 'new'
}

const openResumeSessionList = () => {
  sessionSetupMode.value = 'resume'
  sessionsLoadError.value = ''
  loadIncompleteSessions()
}

const returnToSessionChoice = () => {
  sessionSetupMode.value = 'choice'
  playerNameError.value = ''
}

const startSessionWithPlayer = () => {
  const trimmedName = playerNameInput.value.trim()
  if (!trimmedName) {
    playerNameError.value = 'Player name is required.'
    return
  }

  currentPlayerName.value = trimmedName
  playerNameError.value = ''
  resetShotState()
  resetSessionState()
  isSessionSetupVisible.value = false
  sessionSetupMode.value = 'choice'
  playerNameInput.value = ''
  updateSelectionMessage(null, sessionState.value)
}

const applySessionPayload = (sessionData, fallbackId) => {
  setShots(Array.isArray(sessionData?.shots) ? sessionData.shots : [])
  sessionId.value = sessionData?.id ?? sessionData?.sessionId ?? fallbackId ?? null

  const normalizedStatus = String(sessionData?.status ?? '').toLowerCase()
  isSessionPaused.value = normalizedStatus === 'paused'
  isSessionComplete.value = normalizedStatus === 'complete' || normalizedStatus === 'completed'

  isPersistingSession.value = false
  currentShotType.value = 'make'
  activeLocationId.value = null

  const resolvedName = getSessionPlayerName(sessionData)
  if (resolvedName) {
    currentPlayerName.value = resolvedName
  }

  updateSelectionMessage(null, sessionState.value)
}

const resumeExistingSession = async (sessionSummary) => {
  if (!sessionSummary || typeof sessionSummary !== 'object') return

  const identifier = getSessionId(sessionSummary)
  if (!identifier) {
    sessionsLoadError.value = 'Session is missing an identifier.'
    return
  }

  if (sessionSummary.__source === 'local') {
    sessionsLoadError.value = ''
    applySessionPayload(sessionSummary, identifier)
    isSessionPaused.value = false
    isSessionSetupVisible.value = false
    sessionSetupMode.value = 'choice'
    playerNameError.value = ''
    return
  }

  selectedSessionId.value = identifier
  isLoadingSelectedSession.value = true
  sessionsLoadError.value = ''
  let resumedSuccessfully = false

  try {
    const canRequestSession =
      typeof fetch !== 'undefined' &&
      typeof SESSION_API_ENDPOINT === 'string' &&
      SESSION_API_ENDPOINT.trim().length > 0

    if (!canRequestSession) {
      throw new Error('Session service unavailable')
    }

    const response = await fetch(`${SESSION_API_ENDPOINT}/${identifier}`)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    const payload = await response.json()
    const sessionData = payload && typeof payload === 'object' ? payload : sessionSummary
    applySessionPayload(sessionData, identifier)
    isSessionPaused.value = false
    resumedSuccessfully = true
  } catch (error) {
    console.error('Unable to resume session', error)
    if (sessionSummary && typeof sessionSummary === 'object') {
      applySessionPayload(sessionSummary, identifier)
      isSessionPaused.value = false
      resumedSuccessfully = true
      sessionsLoadError.value = 'Loaded locally saved session.'
    } else {
      sessionsLoadError.value = 'Unable to load the selected session. Please try again.'
    }
  } finally {
    isLoadingSelectedSession.value = false
    selectedSessionId.value = null
  }

  if (resumedSuccessfully) {
    isSessionSetupVisible.value = false
    sessionSetupMode.value = 'choice'
    playerNameError.value = ''
  }
}

const pauseSession = async () => {
  if (!shots.value.length) return
  if (isSessionComplete.value || isSessionPaused.value || isPersistingSession.value) return

  try {
    const result = await persistSession('paused', serializeShots(shots.value), stats.value, locationStats.value, selectionMessage)
    if (result?.savedLocally || result?.savedRemotely) {
      resetShotState()
      resetSessionState()
      currentPlayerName.value = ''
      isSessionSetupVisible.value = true
      sessionSetupMode.value = 'choice'
      loadIncompleteSessions()
    }
    updateSelectionMessage(null, sessionState.value)
  } catch {
    updateSelectionMessage(null, sessionState.value)
  }
}

const resumeSession = async () => {
  if (!isSessionPaused.value) return
  if (isSessionComplete.value || isPersistingSession.value) return

  try {
    const result = await persistSession('active', serializeShots(shots.value), stats.value, locationStats.value, selectionMessage)
    if (result?.savedLocally || result?.savedRemotely) {
      isSessionPaused.value = false
    }
    updateSelectionMessage(null, sessionState.value)
  } catch {
    updateSelectionMessage(null, sessionState.value)
  }
}

const completeSession = async () => {
  if (!shots.value.length) return
  if (isSessionComplete.value || isPersistingSession.value) return

  if (shots.value.length < MAX_TOTAL_SHOTS) {
    showCompleteConfirm.value = true
    return
  }

  await performCompleteSession()
}

const performCompleteSession = async () => {
  showCompleteConfirm.value = false
  
  try {
    const result = await persistSession('complete', serializeShots(shots.value), stats.value, locationStats.value, selectionMessage)
    if (result?.savedLocally || result?.savedRemotely) {
      resetShotState()
      resetSessionState()
      currentPlayerName.value = ''
      isSessionSetupVisible.value = true
      sessionSetupMode.value = 'choice'
      loadIncompleteSessions()
    }
  } catch {
    updateSelectionMessage(null, sessionState.value)
  }
}

const cancelCompleteSession = () => {
  showCompleteConfirm.value = false
}

const toggleComparisonView = async () => {
  if (!showComparisonView.value) {
    await loadPreviousSessions()
  }
  showComparisonView.value = !showComparisonView.value
}

onMounted(() => {
  window.addEventListener('resize', updateDimensions)
  if (typeof window !== 'undefined') {
    isSmallScreen.value = window.innerWidth <= 600
  }
  loadIncompleteSessions()
  updateSelectionMessage(null, sessionState.value)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
})
</script>

<template>
  <div class="session-container">
    <SessionSetup
      v-if="isSessionSetupVisible"
      :mode="sessionSetupMode"
      v-model:player-name-input="playerNameInput"
      :player-name-error="playerNameError"
      :can-begin-session="canBeginSession"
      :incomplete-sessions="incompleteSessions"
      :is-loading-sessions="isLoadingSessions"
      :sessions-load-error="sessionsLoadError"
      :is-loading-selected-session="isLoadingSelectedSession"
      :selected-session-id="selectedSessionId"
      :has-incomplete-sessions="hasIncompleteSessions"
      @start-session="startSessionWithPlayer"
      @resume-session="resumeExistingSession"
      @open-new-form="openNewSessionForm"
      @open-resume-list="openResumeSessionList"
      @return-to-choice="returnToSessionChoice"
      @refresh-sessions="loadIncompleteSessions"
    />

    <div
      v-else
      class="shot-tracker"
    >
      <div
        v-if="currentPlayerName"
        class="player-banner"
        role="status"
      >
        Logging shots for <span>{{ currentPlayerName }}</span>
      </div>

      <ShotCounter
        :shots-made="stats.makes"
        :shots-missed="stats.misses"
        :total-shots="stats.attempts"
        :goal="MAX_TOTAL_SHOTS"
      />

      <div class="top-controls">
        <button
          @click="handleLogShotClick('make')"
          :class="{ active: currentShotType === 'make' }"
          :disabled="
            !activeLocationId ||
            isLocationCompleted(activeLocationId) ||
            isSessionPaused ||
            isSessionComplete ||
            isPersistingSession
          "
        >
          Make
        </button>
        <button
          @click="handleLogShotClick('miss')"
          :class="{ active: currentShotType === 'miss' }"
          :disabled="
            !activeLocationId ||
            isLocationCompleted(activeLocationId) ||
            isSessionPaused ||
            isSessionComplete ||
            isPersistingSession
          "
        >
          Miss
        </button>
      </div>

      <ShotMapping
        :active-location-id="activeLocationId"
        :image-width="imageWidth"
        :image-height="imageHeight"
        :is-location-completed="isLocationCompleted"
        :get-location-attempts="getLocationAttempts"
        :get-location-remaining="getLocationRemaining"
        :is-session-paused="isSessionPaused"
        :is-session-complete="isSessionComplete"
        :is-persisting-session="isPersistingSession"
        @location-selected="handleLocationSelected"
        @shot-recorded="handleShotRecorded"
        @image-loaded="updateDimensions"
      />

      <div class="save-controls">
        <button
          @click="pauseSession"
          :disabled="!shots.length || isSessionPaused || isSessionComplete || isPersistingSession"
        >
          Pause
        </button>
        <button
          class="primary"
          @click="completeSession"
          :disabled="!shots.length || isSessionComplete || isPersistingSession"
        >
          Session Complete
        </button>
      </div>

      <div class="bottom-controls">
        <div class="actions">
          <button
            @click="handleUndoShot"
            :disabled="!shots.length || isSessionPaused || isSessionComplete || isPersistingSession"
          >
            {{ isSmallScreen ? 'Undo' : 'Undo Last Shot' }}
          </button>
          <button
            class="danger"
            @click="handleClearShots"
            :disabled="!shots.length || isPersistingSession"
          >
            Clear All
          </button>
        </div>
      </div>

      <StatsPanel
        :stats="stats"
        :location-stats="locationStats"
        :show-comparison-view="showComparisonView"
        :previous-sessions="previousSessions"
        :is-loading-previous-sessions="isLoadingPreviousSessions"
        :current-player-name="currentPlayerName"
        @toggle-comparison="toggleComparisonView"
      />

      <div class="save-controls">
        <button
          v-if="isSessionPaused && !isSessionComplete"
          class="primary"
          @click="resumeSession"
          :disabled="isPersistingSession"
        >
          Resume
        </button>
      </div>
    </div>

    <CompleteSessionModal
      :show="showCompleteConfirm"
      :shots-count="shots.length"
      @confirm="performCompleteSession"
      @cancel="cancelCompleteSession"
    />
  </div>
</template>

<style scoped>
.session-container {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20px;
}

.session-container .shot-tracker {
  padding-top: 0;
}

.player-banner {
  align-self: stretch;
  text-align: center;
  font-weight: 600;
  color: #1a1a1a;
  background: rgba(244, 248, 255, 0.9);
  border-radius: 12px;
  padding: 12px 16px;
}

.player-banner span {
  color: #1e88e5;
}

.shot-tracker {
  padding: 0 20px 20px 20px;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.top-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.bottom-controls {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.bottom-controls .actions,
.save-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.bottom-controls .actions {
  justify-content: center;
}

.save-controls {
  justify-content: center;
  width: 100%;
  margin-top: 8px;
}

.top-controls button,
.bottom-controls button,
.save-controls button {
  padding: 12px 24px;
  border: 2px solid #ddd;
  background: #749ab9;
  cursor: pointer;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  transition: all 0.2s ease;
  transform: scale(1);
}

.bottom-controls button:hover:not(:disabled),
.save-controls button:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.top-controls button.active {
  background-color: #2196f3;
  color: #fff;
  border-color: #2196f3;
  transform: scale(1.15);
  z-index: 1;
}

.top-controls button:disabled,
.bottom-controls button:disabled,
.save-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bottom-controls .actions .danger {
  border-color: #f44336;
  background-color: #f44336;
  color: #fff;
}

.bottom-controls .actions .danger:hover:not(:disabled) {
  background-color: #f44336;
  color: #fff;
}

.bottom-controls .actions .danger:active:not(:disabled) {
  background-color: #d32f2f;
  color: #fff;
}

.save-controls .primary {
  border-color: #ddd;
  background-color: #749ab9;
  color: #1a1a1a;
}

.save-controls .primary:hover:not(:disabled) {
  background-color: #f5f5f5;
  color: #1a1a1a;
}

@media (max-width: 600px) {
  .session-container {
    padding: 16px;
  }

  .top-controls {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bottom-controls .actions,
  .save-controls {
    justify-content: center;
    width: 100%;
  }

  .top-controls button,
  .bottom-controls button,
  .save-controls button {
    flex: 1 1 calc(50% - 6px);
    max-width: none;
  }

  .bottom-controls {
    justify-content: center;
  }

  .shot-tracker {
    padding: 0 12px 12px 12px;
    gap: 10px;
  }
}
</style>

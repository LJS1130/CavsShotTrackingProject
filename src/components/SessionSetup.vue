<script setup>
import { PLAYER_NAME_SUGGESTION } from '../constants/shotLocations.js'
import {
  getSessionIdentifier,
  getSessionPlayerName,
  formatSessionTimestamp,
  formatSessionStatus,
  getSessionAttemptCount
} from '../composables/useSessionHelpers.js'

const props = defineProps({
  mode: {
    type: String,
    default: 'choice',
    validator: (value) => ['choice', 'new', 'resume'].includes(value)
  },
  playerNameInput: {
    type: String,
    default: ''
  },
  playerNameError: {
    type: String,
    default: ''
  },
  canBeginSession: {
    type: Boolean,
    default: false
  },
  incompleteSessions: {
    type: Array,
    default: () => []
  },
  isLoadingSessions: {
    type: Boolean,
    default: false
  },
  sessionsLoadError: {
    type: String,
    default: ''
  },
  isLoadingSelectedSession: {
    type: Boolean,
    default: false
  },
  selectedSessionId: {
    type: String,
    default: null
  },
  hasIncompleteSessions: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:playerNameInput',
  'start-session',
  'resume-session',
  'open-new-form',
  'open-resume-list',
  'return-to-choice',
  'refresh-sessions'
])
</script>

<template>
  <div class="session-setup">
    <div class="session-card">
      <h1>Shot Session</h1>

      <div
        v-if="mode === 'choice'"
        class="session-choice"
      >
        <button
          type="button"
          class="session-option primary"
          @click="$emit('open-new-form')"
        >
          Start New Session
        </button>
        <button
          type="button"
          class="session-option"
          @click="$emit('open-resume-list')"
        >
          Resume Previous Session
        </button>
        <p
          v-if="!isLoadingSessions && !hasIncompleteSessions"
          class="session-hint"
        >
          No incomplete sessions available yet.
        </p>
      </div>

      <form
        v-else-if="mode === 'new'"
        class="session-new"
        @submit.prevent="$emit('start-session')"
      >
        <label
          class="session-label"
          for="player-name-input"
        >
          Player Name
        </label>
        <input
          id="player-name-input"
          :value="playerNameInput"
          @input="$emit('update:playerNameInput', $event.target.value)"
          :placeholder="PLAYER_NAME_SUGGESTION"
          class="session-input"
          autocomplete="off"
          autocapitalize="words"
        />
        <p class="session-hint">Suggested format: {{ PLAYER_NAME_SUGGESTION }}</p>
        <p
          v-if="playerNameError"
          class="session-error"
        >
          {{ playerNameError }}
        </p>
        <div class="session-actions">
          <button
            type="submit"
            class="session-option primary"
            :disabled="!canBeginSession"
          >
            Begin Session
          </button>
          <button
            type="button"
            class="session-option ghost"
            @click="$emit('return-to-choice')"
          >
            Back
          </button>
        </div>
      </form>

      <div
        v-else-if="mode === 'resume'"
        class="session-resume"
      >
        <div class="session-resume-actions">
          <button
            type="button"
            class="session-option ghost"
            @click="$emit('return-to-choice')"
          >
            Back
          </button>
          <button
            type="button"
            class="session-option link"
            @click="$emit('refresh-sessions')"
            :disabled="isLoadingSessions"
          >
            Refresh
          </button>
        </div>

        <p
          v-if="sessionsLoadError"
          class="session-error"
        >
          {{ sessionsLoadError }}
        </p>
        <p
          v-if="isLoadingSessions"
          class="session-loading"
        >
          Loading sessions...
        </p>

        <ul
          v-if="!isLoadingSessions && incompleteSessions.length"
          class="session-list"
        >
          <li
            v-for="(session, index) in incompleteSessions"
            :key="getSessionIdentifier(session) || index"
          >
            <button
              type="button"
              class="session-list-item"
              :class="{
                pending: isLoadingSelectedSession && selectedSessionId === getSessionIdentifier(session)
              }"
              @click="$emit('resume-session', session)"
              :disabled="isLoadingSelectedSession"
            >
              <div class="session-list-main">
                <span class="session-player">{{ getSessionPlayerName(session) || 'Unnamed Player' }}</span>
                <span class="session-status">{{ formatSessionStatus(session.status) }}</span>
              </div>
              <div class="session-list-meta">
                <span>{{ getSessionAttemptCount(session) }} shots logged</span>
                <span>{{ formatSessionTimestamp(session) }}</span>
                <span
                  v-if="session.__source === 'local'"
                  class="session-source"
                >
                  Saved locally
                </span>
              </div>
              <span
                v-if="isLoadingSelectedSession && selectedSessionId === getSessionIdentifier(session)"
                class="session-pending"
              >
                Resuming...
              </span>
            </button>
          </li>
        </ul>

        <p
          v-else-if="!isLoadingSessions"
          class="session-empty"
        >
          No incomplete sessions available.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-setup {
  max-width: 520px;
  margin: 40px auto;
}

.session-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.session-card h1 {
  margin: 0;
  font-size: 24px;
  text-align: center;
  color: #1a1a1a;
}

.session-choice,
.session-actions,
.session-resume {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.session-option {
  padding: 14px 20px;
  border-radius: 10px;
  border: 2px solid transparent;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #f3f6fb;
  color: #1a1a1a;
  transition: all 0.2s ease;
  text-align: center;
}

.session-option.primary {
  background: #2196f3;
  color: #fff;
  border-color: #2196f3;
}

.session-option.primary:hover:not(:disabled) {
  background: #1976d2;
  border-color: #1976d2;
}

.session-option.ghost {
  background: transparent;
  border-color: #cbd5e1;
  color: #1f2937;
}

.session-option.ghost:hover:not(:disabled) {
  background: rgba(203, 213, 225, 0.3);
}

.session-option.link {
  background: transparent;
  border: none;
  color: #1e88e5;
  text-decoration: underline;
  padding: 0;
  align-self: flex-end;
}

.session-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-hint {
  text-align: center;
  font-size: 0.9rem;
  color: #607d8b;
}

.session-label {
  font-weight: 600;
  color: #1a1a1a;
}

.session-input {
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 12px 14px;
  font-size: 16px;
  width: 100%;
  box-sizing: border-box;
}

.session-input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
}

.session-error {
  color: #d32f2f;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
}

.session-loading,
.session-empty {
  text-align: center;
  color: #476082;
  font-weight: 500;
}

.session-empty {
  color: #607d8b;
}

.session-resume-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-list-item {
  width: 100%;
  border: 1px solid #d6e3f3;
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(244, 248, 255, 0.85);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  text-align: left;
  cursor: pointer;
}

.session-list-item:hover:not(:disabled) {
  border-color: #2196f3;
  box-shadow: 0 6px 18px rgba(33, 150, 243, 0.12);
  transform: translateY(-2px);
}

.session-list-item:disabled {
  cursor: not-allowed;
}

.session-list-item.pending {
  opacity: 0.65;
}

.session-list-main {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.session-player {
  max-width: 60%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-status {
  font-size: 0.9rem;
  color: #1e88e5;
  text-transform: capitalize;
}

.session-list-meta {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  color: #476082;
  flex-wrap: wrap;
}

.session-source {
  font-size: 0.78rem;
  font-weight: 600;
  color: #d97706;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.session-pending {
  font-size: 0.85rem;
  color: #1e88e5;
  font-weight: 600;
}

@media (max-width: 600px) {
  .session-setup {
    margin: 20px auto;
  }

  .session-card {
    padding: 24px 20px;
  }

  .session-option {
    width: 100%;
  }

  .session-list-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>


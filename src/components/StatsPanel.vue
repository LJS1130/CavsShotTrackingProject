<script setup>
import { formatSessionTimestamp } from '../composables/useSessionHelpers.js'

const props = defineProps({
  stats: {
    type: Object,
    required: true
  },
  locationStats: {
    type: Array,
    default: () => []
  },
  showComparisonView: {
    type: Boolean,
    default: false
  },
  previousSessions: {
    type: Array,
    default: () => []
  },
  isLoadingPreviousSessions: {
    type: Boolean,
    default: false
  },
  currentPlayerName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['toggle-comparison'])
</script>

<template>
  <div class="stats-section">
    <div
      class="stats-panel"
      v-if="stats.attempts"
    >
      <!-- Current Stats View -->
      <div v-if="!showComparisonView">
        <div class="overall">
          <div class="metric">
            <span class="metric-label">FG%</span>
            <span class="metric-value">{{ stats.percentage }}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Makes</span>
            <span class="metric-value">{{ stats.makes }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Misses</span>
            <span class="metric-value">{{ stats.misses }}</span>
          </div>
        </div>

        <div class="zone-stats">
          <div
            v-for="location in locationStats"
            :key="location.id"
            class="zone-row"
          >
            <div class="zone-name">{{ location.label }}</div>
            <div class="zone-data">
              <span>{{ location.makes }} / {{ location.attempts }}</span>
              <span>{{ location.percentage }}%</span>
              <span class="zone-remaining">{{ location.remaining }} left</span>
            </div>
          </div>
        </div>

        <div class="comparison-link">
          <span class="comparison-text">compare with previous sessions</span>
          <button
            class="comparison-arrow"
            @click="$emit('toggle-comparison')"
            type="button"
            aria-label="Compare with previous sessions"
          >
            →
          </button>
        </div>
      </div>

      <!-- Comparison View -->
      <div v-else class="comparison-view">
        <div class="comparison-header">
          <button
            class="back-button"
            @click="$emit('toggle-comparison')"
            type="button"
            aria-label="Back to current stats"
          >
            ← Back
          </button>
          <h3 class="comparison-title">Last 5 Sessions</h3>
        </div>
        
        <div v-if="isLoadingPreviousSessions" class="comparison-loading">
          Loading past sessions...
        </div>
        
        <div v-else-if="previousSessions.length === 0" class="comparison-empty">
          No sessions found for {{ currentPlayerName }}.
        </div>
        
        <div v-else class="comparison-sessions">
          <div
            v-for="(session, index) in previousSessions"
            :key="session.id || index"
            class="comparison-session"
          >
            <div class="session-date">
              {{ formatSessionTimestamp(session) }}
            </div>
            <div class="session-stats">
              <span class="session-percentage">{{ session.percentage }}%</span>
              <span class="session-details">
                {{ session.stats?.makes ?? 0 }} / {{ session.stats?.attempts ?? 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="empty-state"
      v-else
    >
      Select a highlighted location to begin logging your shots.
    </div>
  </div>
</template>

<style scoped>
.stats-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

.stats-panel {
  align-self: stretch;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overall {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.metric-label {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #666;
  text-transform: uppercase;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.zone-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.zone-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: rgba(250, 250, 250, 0.9);
}

.zone-name {
  font-weight: 600;
  color: #333;
}

.zone-data {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  font-weight: 500;
  color: #444;
  flex-wrap: wrap;
}

.zone-remaining {
  font-size: 0.85rem;
  color: #607d8b;
}

.empty-state {
  align-self: stretch;
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  color: #666;
  font-weight: 500;
}

.comparison-link {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.comparison-text {
  font-size: 0.85rem;
  color: #666;
  text-align: right;
}

.comparison-arrow {
  background: transparent;
  border: 2px solid #2196f3;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  color: #2196f3;
  font-weight: bold;
  transition: all 0.2s ease;
  padding: 0;
}

.comparison-arrow:hover {
  background: #2196f3;
  color: #fff;
  transform: scale(1.1);
}

.comparison-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.back-button {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: rgba(203, 213, 225, 0.3);
  border-color: #94a3b8;
}

.comparison-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.comparison-loading,
.comparison-empty {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.comparison-sessions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-session {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: rgba(250, 250, 250, 0.9);
}

.session-date {
  font-size: 0.9rem;
  color: #666;
}

.session-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.session-percentage {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.session-details {
  font-size: 0.85rem;
  color: #607d8b;
}

@media (max-width: 600px) {
  .metric-value {
    font-size: 20px;
  }
}
</style>


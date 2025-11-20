<script setup>
import { MAX_TOTAL_SHOTS } from '../constants/shotLocations.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  shotsCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div
    v-if="show"
    class="modal-overlay"
    @click="$emit('cancel')"
  >
    <div
      class="modal-card"
      @click.stop
    >
      <h3 class="modal-title">Complete Session?</h3>
      <p class="modal-message">
        You have only logged <strong>{{ shotsCount }}</strong> out of <strong>{{ MAX_TOTAL_SHOTS }}</strong> shots.
        <br />
        Are you sure you want to complete this session?
      </p>
      <div class="modal-actions">
        <button
          class="session-option ghost"
          @click="$emit('cancel')"
          type="button"
        >
          Cancel
        </button>
        <button
          class="session-option primary"
          @click="$emit('confirm')"
          type="button"
        >
          Complete Session
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  padding: 32px 28px;
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-title {
  margin: 0;
  font-size: 24px;
  text-align: center;
  color: #1a1a1a;
  font-weight: 600;
}

.modal-message {
  margin: 0;
  text-align: center;
  color: #4a4a4a;
  font-size: 16px;
  line-height: 1.5;
}

.modal-message strong {
  color: #1a1a1a;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
}

.session-option {
  padding: 14px 20px;
  border-radius: 10px;
  border: 2px solid transparent;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  flex: 1;
  max-width: 180px;
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

@media (max-width: 600px) {
  .modal-card {
    padding: 24px 20px;
    max-width: 100%;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions .session-option {
    max-width: 100%;
  }
}
</style>


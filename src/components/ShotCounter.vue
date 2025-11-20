<script setup>
const props = defineProps({
  totalShots: {
    type: Number,
    default: 0
  },
  shotsMade: {
    type: Number,
    default: 0
  },
  shotsMissed: {
    type: Number,
    default: 0
  },
  goal: {
    type: Number,
    default: 100
  }
})
</script>

<template>
  <div class="shot-counter">
    <div class="stat made">
      <span class="label">Shots Made</span>
      <span class="value">{{ props.shotsMade }} / {{ props.goal }}</span>
    </div>
    <div class="stat total">
      <span class="label">Shots Completed</span>
      <span class="value">{{ props.totalShots }} / {{ props.goal }}</span>
    </div>
    <div class="stat missed">
      <span class="label">Shots Missed</span>
      <span class="value">{{ props.shotsMissed }} / {{ props.goal }}</span>
    </div>
  </div>
</template>

<style scoped>
.shot-counter {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 10px;
  padding: 12px 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  padding: 6px 10px;
  border-radius: 6px;
  text-align: center;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: #5b5b5b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  font-size: 20px;
  font-weight: 700;
  margin-top: 4px;
  color: #1a1a1a;
}

.made .value {
  color: #2e7d32;
}

.missed .value {
  color: #c62828;
}

.total {
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  padding-left: 18px;
  padding-right: 18px;
}

@media (max-width: 600px) {
  .shot-counter {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .total {
    border-left: none;
    border-right: none;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    padding: 12px 0;
  }
}
</style>

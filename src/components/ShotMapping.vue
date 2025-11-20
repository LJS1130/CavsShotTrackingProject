<script setup>
import { ref, computed } from 'vue'
import { shotLocations, MAX_SHOTS_PER_LOCATION } from '../constants/shotLocations.js'

const props = defineProps({
  activeLocationId: {
    type: String,
    default: null
  },
  imageWidth: {
    type: Number,
    default: 0
  },
  imageHeight: {
    type: Number,
    default: 0
  },
  isLocationCompleted: {
    type: Function,
    required: true
  },
  getLocationAttempts: {
    type: Function,
    required: true
  },
  getLocationRemaining: {
    type: Function,
    required: true
  },
  isSessionPaused: {
    type: Boolean,
    default: false
  },
  isSessionComplete: {
    type: Boolean,
    default: false
  },
  isPersistingSession: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['location-selected', 'shot-recorded', 'image-loaded'])

const courtImage = ref(null)

const handleImageLoad = (event) => {
  emit('image-loaded', event)
}

const getLocationIndicatorStyle = (location) => ({
  left: `${location.normalizedX * props.imageWidth}px`,
  top: `${location.normalizedY * props.imageHeight}px`
})

const recordShotLocation = (event) => {
  if (props.isSessionPaused || props.isSessionComplete || props.isPersistingSession) return

  const rect = courtImage.value?.getBoundingClientRect()
  if (!rect) return

  let clientX
  let clientY

  if (event.type === 'touchend') {
    event.preventDefault()
    const touch = event.changedTouches && event.changedTouches[0]
    if (!touch) return
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }

  const normalizedX = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
  const normalizedY = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1)
  
  emit('shot-recorded', { normalizedX, normalizedY })
}

const selectLocation = (locationId) => {
  emit('location-selected', locationId)
}
</script>

<template>
  <div class="court-container">
    <img
      ref="courtImage"
      src="/court_image.jpg"
      @click="recordShotLocation"
      @touchend.prevent="recordShotLocation"
      @load="handleImageLoad"
      class="court-image"
      alt="Basketball court"
    />

    <div class="location-indicators">
      <button
        v-for="location in shotLocations"
        :key="location.id"
        type="button"
        class="location-indicator"
        :class="{
          active: activeLocationId === location.id,
          completed: isLocationCompleted(location.id),
          inactive: !!activeLocationId && activeLocationId !== location.id && !isLocationCompleted(location.id),
          selectable: !isLocationCompleted(location.id)
        }"
        :style="getLocationIndicatorStyle(location)"
        @click.stop="selectLocation(location.id)"
        :disabled="isLocationCompleted(location.id) || isSessionPaused || isSessionComplete || isPersistingSession"
        :aria-pressed="activeLocationId === location.id ? 'true' : 'false'"
        :title="`${location.label}: ${getLocationAttempts(location.id)}/${MAX_SHOTS_PER_LOCATION} shots logged`"
      >
        <span class="indicator-ring" />
        <span class="indicator-info">
          <span class="indicator-label">{{ location.label }}</span>
          <span class="indicator-progress">
            {{ getLocationAttempts(location.id) }}/{{ MAX_SHOTS_PER_LOCATION }} · {{ getLocationRemaining(location.id) }} left
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.court-container {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 100%;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.court-image {
  width: 100%;
  height: auto;
  display: block;
  cursor: crosshair;
  user-select: none;
  touch-action: manipulation;
}

.location-indicators {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.location-indicator {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 84px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
  color: #0f0f0f;
  transition: transform 0.2s ease;
}

.location-indicator:disabled {
  cursor: default;
}

.location-indicator .indicator-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid #1e88e5;
  background: rgba(30, 136, 229, 0.2);
  box-shadow: 0 0 12px rgba(30, 136, 229, 0.45);
  transition: all 0.2s ease;
}

.location-indicator .indicator-info {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 14px;
  padding: 6px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 120px;
}

.indicator-label {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.indicator-progress {
  font-size: 0.75rem;
  font-weight: 500;
  color: #476082;
}

.location-indicator.selectable:not(.inactive):hover .indicator-ring,
.location-indicator.selectable:not(.inactive):focus .indicator-ring {
  border-color: #1565c0;
  box-shadow: 0 0 18px rgba(21, 101, 192, 0.5);
  background: rgba(21, 101, 192, 0.25);
}

.location-indicator.active .indicator-ring {
  border-color: #0d47a1;
  background: rgba(13, 71, 161, 0.3);
  box-shadow: 0 0 22px rgba(13, 71, 161, 0.55);
}

.location-indicator.completed .indicator-ring {
  border-color: #9e9e9e;
  background: rgba(158, 158, 158, 0.16);
  box-shadow: none;
}

.location-indicator.inactive .indicator-ring {
  border-color: #90a4ae;
  background: rgba(144, 164, 174, 0.18);
  box-shadow: none;
}

.location-indicator.completed .indicator-info {
  opacity: 0.6;
}

.location-indicator.inactive .indicator-info {
  opacity: 0.7;
}

.location-indicator.completed {
  cursor: not-allowed;
}

.location-indicator.inactive {
  cursor: pointer;
}

.location-indicator.active {
  transform: translate(-50%, -50%) scale(1.05);
}

.location-indicator.selectable {
  transform: translate(-50%, -50%);
}

.location-indicator:focus-visible .indicator-ring {
  outline: 3px solid rgba(30, 136, 229, 0.6);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .location-indicator {
    width: 72px;
  }

  .location-indicator .indicator-ring {
    width: 48px;
    height: 48px;
  }

  .location-indicator .indicator-info {
    min-width: 110px;
  }
}
</style>


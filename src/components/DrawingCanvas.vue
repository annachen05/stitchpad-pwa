<template>
  <div
    ref="canvasRef"
    class="drawing-canvas"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @dragover.prevent
    @drop="onDrop"
  >
    <!-- Updated background image with scaling -->
    <div
      v-if="store.backgroundImage"
      class="background-image"
      :style="{
        backgroundImage: 'url(' + store.backgroundImage + ')',
        transform: `scale(${store.backgroundScale * scale})`,
        transformOrigin: 'center center',
      }"
    ></div>

    <svg
      :width="width"
      :height="height"
      style="background: transparent; width: 100%; height: 100%"
      :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }"
    >
      <g>
        <!-- Render each step as individual line segments -->
        <line
          v-for="(step, i) in store.shepherd.steps"
          :key="i"
          :x1="step.x1"
          :y1="step.y1"
          :x2="step.x2"
          :y2="step.y2"
          :stroke="step.penDown ? '#333' : '#f00'"
          :stroke-width="getScaleAwareLineWidth(step.penDown)"
          :opacity="step.penDown ? 1 : 0.5"
        />
        <!-- Show interpolation points as purple dots -->
        <circle
          v-for="(step, i) in store.shepherd.steps"
          :key="'pt-' + i"
          :cx="step.x2"
          :cy="step.y2"
          :r="getScaleAwareDotRadius()"
          :fill="'#7a0081'"
          opacity="0.8"
        />
      </g>
    </svg>
    <div v-if="store.grid" class="grid-overlay"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useStitchStore } from '@/store/stitch'
import { lineInterpolate } from '@/utils/embroidery'
import { useToggleFlags } from '@/composables/useToggleFlags.js'

const store = useStitchStore()
const canvasRef = ref(null)
const width = window.innerWidth
const height = window.innerHeight - 100

let drawing = false
let lastPos = ref(null)
const { jump, interpolate, toggleJump, toggleInterpolate } = useToggleFlags()

// Base distance values (these represent "real" design units)
const BASE_DIST_MIN = 8
const BASE_DIST_MAX = 12
const BASE_DOT_RADIUS = 2
const BASE_LINE_WIDTH = 2

// Get current scale from store
const scale = computed(() => store.scale || 1)

// Scale-aware distance calculation
function getScaleAwareDistances() {
  return {
    dist_min: BASE_DIST_MIN / scale.value,
    dist_max: BASE_DIST_MAX / scale.value,
  }
}

// Scale-aware visual elements
function getScaleAwareDotRadius() {
  return BASE_DOT_RADIUS / scale.value
}

function getScaleAwareLineWidth(isPenDown) {
  const baseWidth = isPenDown ? BASE_LINE_WIDTH : 1
  return baseWidth / scale.value
}

// Scale-aware interpolation distance
function getAdaptiveInterpolationDistance() {
  // More dense interpolation when zoomed in, less dense when zoomed out
  return BASE_DIST_MIN / Math.sqrt(scale.value)
}

function getRelativePos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / scale.value,
    y: (e.clientY - rect.top) / scale.value,
  }
}

function ensureConnectedPoints(pos) {
  if (lastPos.value) {
    const dist = Math.sqrt(
      Math.pow(lastPos.value.x - pos.x, 2) + Math.pow(lastPos.value.y - pos.y, 2)
    )

    // Use scale-aware distances
    const { dist_min, dist_max } = getScaleAwareDistances()

    if (dist > dist_max && interpolate.value && !jump.value) {
      // Use adaptive interpolation distance for better quality
      const adaptiveDistance = getAdaptiveInterpolationDistance()
      const points = lineInterpolate(lastPos.value, pos, adaptiveDistance, dist)

      // Connect each consecutive pair of points as separate lines
      for (let i = 0; i < points.length - 1; i++) {
        addLine(points[i], points[i + 1])
      }

      lastPos.value = pos
    } else {
      // Direct connection without interpolation
      addLine(lastPos.value, pos)
      lastPos.value = pos
    }
  } else {
    // First point - just set the position
    lastPos.value = pos
  }
}

function addLine(pos1, pos2) {
  if (jump.value) {
    store.addLine(pos1.x, pos1.y, pos2.x, pos2.y, false)
    toggleJump()
  } else {
    store.addLine(pos1.x, pos1.y, pos2.x, pos2.y, true)
  }
}

function onPointerDown(e) {
  drawing = true
  const pos = getRelativePos(e)

  // If we have a previous position, connect to it with interpolation
  if (lastPos.value) {
    ensureConnectedPoints(pos)
  } else {
    // First point - just set the position
    lastPos.value = pos
  }
}

function onPointerMove(e) {
  if (!drawing) return
  const pos = getRelativePos(e)
  ensureConnectedPoints(pos)
}

function onPointerUp(e) {
  drawing = false
  // Keep lastPos.value so the next stroke continues from here
  // DON'T reset lastPos.value to null
}
const onDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (file) store.importDST(file)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (store.shepherd && typeof store.shepherd.zoom === 'function') {
    store.shepherd.zoom = (factor) => {
      const newScale = Math.max(0.2, Math.min(scale.value * factor, 5))
      store.setScale(newScale)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e) {
  if (e.key === 'j') toggleJump()
  if (e.key === 'i') toggleInterpolate()
  console.log('Keydown Event Registered:', handleKeydown)
}
</script>

<style scoped>
.drawing-canvas {
  width: 100vw;
  height: calc(100vh - 100px);
  position: relative;
  overflow: hidden;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: contain; /* Changed from cover to contain for better scaling */
  background-repeat: no-repeat;
  background-position: center center; /* Center the image */
  z-index: 0;
  pointer-events: none;
}

svg {
  display: block;
  position: relative;
  z-index: 1;
}

canvas {
  border: 1px solid #ccc;
}
</style>

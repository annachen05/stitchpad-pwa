<template>
  <div
    ref="canvasRef"
    class="drawing-canvas"
    :class="{ importing: isImporting }"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @dragover.prevent
    @drop="onDrop"
  >
    <div v-if="isImporting" class="import-overlay">
      <div class="import-message">
        ⏳ Importing file...
      </div>
    </div>

    <!-- Updated background image with scaling -->
    <div
      v-if="drawingStore.backgroundImage"
      class="background-image"
      :style="{
        backgroundImage: 'url(' + drawingStore.backgroundImage + ')',
        transform: `scale(${drawingStore.backgroundScale * scale})`,
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
          v-for="(step, i) in visibleSteps"
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
          v-for="(step, i) in visibleSteps"
          :key="'pt-' + i"
          :cx="step.x2"
          :cy="step.y2"
          :r="getScaleAwareDotRadius()"
          :fill="'#7a0081'"
          opacity="0.8"
        />
      </g>
    </svg>
    <div v-if="uiStore.grid" class="grid-overlay"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { useUIStore } from '@/stores/ui.js'

const drawingStore = useDrawingStore()
const uiStore = useUIStore()
const canvasRef = ref(null)
const width = window.innerWidth
const height = window.innerHeight - 100
const isImporting = ref(false)

let drawing = false
let lastPos = ref(null)

// Add this watcher to reset the last position when the canvas is cleared
watch(
  () => drawingStore.shepherd.steps.length,
  (newLength) => {
    if (newLength === 0) {
      lastPos.value = null
    }
  }
)

// Base distance values
const BASE_DIST_MIN = 8
const BASE_DIST_MAX = 12
const BASE_DOT_RADIUS = 2
const BASE_LINE_WIDTH = 2

// Get current scale from drawingStore
const scale = computed(() => drawingStore.scale || 1)

// Simple line interpolation function (since we removed the import)
function lineInterpolate(start, end, maxDistance) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance <= maxDistance) return [start, end]
  
  const steps = Math.ceil(distance / maxDistance)
  const stepX = dx / steps
  const stepY = dy / steps
  const points = []
  
  for (let i = 0; i <= steps; i++) {
    points.push({
      x: start.x + stepX * i,
      y: start.y + stepY * i
    })
  }
  return points
}

// Scale-aware distance calculation
function getScaleAwareDistances() {
  return {
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

    const { dist_max } = getScaleAwareDistances()

    if (dist > dist_max && uiStore.interpolate && !uiStore.isJump) {
      const adaptiveDistance = getAdaptiveInterpolationDistance()
      const points = lineInterpolate(lastPos.value, pos, adaptiveDistance)

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
  if (uiStore.isJump) {
    drawingStore.addLine(pos1.x, pos1.y, pos2.x, pos2.y, false)
    uiStore.toggleJump() // Toggle back to normal drawing
  } else {
    drawingStore.addLine(pos1.x, pos1.y, pos2.x, pos2.y, true)
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

function onPointerUp() {
  drawing = false
  // Keep lastPos.value so the next stroke continues from here
}

const onDrop = async (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (!file) return

  try {
    isImporting.value = true
    await drawingStore.importDST(file)
  } catch (error) {
    console.error('Import failed:', error)
    alert('Import failed: ' + error.message)
  } finally {
    isImporting.value = false
  }
}

// Virtualize large step lists
const visibleSteps = computed(() => {
  // Be aware that very large designs (>10,000 steps) might impact performance.
  return drawingStore.shepherd.steps
})

onMounted(() => {
  window.addEventListener('keydown', uiStore.handleKeydown)
  if (drawingStore.shepherd && typeof drawingStore.shepherd.zoom === 'function') {
    drawingStore.shepherd.zoom = (factor) => {
      const newScale = Math.max(0.2, Math.min(scale.value * factor, 5))
      drawingStore.setScale(newScale)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', uiStore.handleKeydown)
})
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
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
  z-index: 0;
  pointer-events: none;
}

svg {
  display: block;
  position: relative;
  z-index: 1;
}

.import-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.import-message {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 1.2rem;
}
</style>

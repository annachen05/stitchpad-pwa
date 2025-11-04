<template>
  <div
    ref="canvasRef"
    class="drawing-canvas"
    :class="{ importing: isImporting }"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @touchstart.prevent="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend.prevent="onTouchEnd"
    @touchcancel.prevent="onTouchEnd"
    @dragover.prevent
    @drop="onDrop"
  >
    <div v-if="isImporting" class="import-overlay">
      <div class="import-message">
        ⏳ Importing file...
      </div>
    </div>

    <!-- Stitch Length Scale Control - moved to bottom right -->
    <div 
      class="stitch-control"
      @mousedown.stop
      @mousemove.stop
      @mouseup.stop
      @click.stop
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <div class="stitch-scale">
        <label>Stitch Length</label>
        <div class="scale-container">
          <span class="scale-label">Short</span>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="1" 
            v-model="stitchLength"
            class="scale-slider"
            @mousedown.stop
            @mousemove.stop
            @mouseup.stop
          />
          <span class="scale-label">Long</span>
        </div>
        <div class="scale-value">{{ stitchLength }}px</div>
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
      :style="{ 
        transform: `scale(${scale})`, 
        transformOrigin: 'center center'  /* Changed from 'top left' to 'center center' */
      }"
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
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\DrawingCanvas.vue
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { useUIStore } from '@/stores/ui.js'

// ### ADD THIS IMPORT ###
import { lineInterpolate } from '@/services/embroidery.js'  // your old adaptive routine

const drawingStore = useDrawingStore()
const uiStore = useUIStore()
const canvasRef = ref(null)
const width = window.innerWidth
const height = window.innerHeight - 100
const isImporting = ref(false)

let drawing = false
let lastPos = ref(null)
const stitchLength = ref(15) // User-controllable stitch length


let prevStepsLen = drawingStore.shepherd.steps.length
watch(
  () => drawingStore.shepherd.steps.length,
  (newLen, oldLen) => {
    // only run on undo (step count decreased)
    if (newLen < oldLen) {
      const steps = drawingStore.shepherd.steps
      if (steps.length > 0) {
        // reconnect to the last remaining point
        const last = steps[steps.length - 1]
        lastPos.value = { x: last.x2, y: last.y2 }
      } else {
        // nothing left
        lastPos.value = null
      }
    }
    prevStepsLen = newLen
  }
)

// Base visual constants
const BASE_DOT_RADIUS = 2
const BASE_LINE_WIDTH = 2

// Get current scale from drawingStore
const scale = computed(() => drawingStore.scale || 1)

// Calculate distance between two points
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

// Check if mouse event is over the stitch control
function isOverStitchControl(eventOrTouch) {
  const stitchControl = document.querySelector('.stitch-control')
  if (!stitchControl) return false
  
  const rect = stitchControl.getBoundingClientRect()
  const clientX = eventOrTouch.clientX
  const clientY = eventOrTouch.clientY
  
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

// Scale-aware visual elements
function getScaleAwareDotRadius() {
  return BASE_DOT_RADIUS / scale.value
}

function getScaleAwareLineWidth(isPenDown) {
  const baseWidth = isPenDown ? BASE_LINE_WIDTH : 1
  return baseWidth / scale.value
}

// Scale-aware stitch spacing
function getScaleAwareStitchSpacing() {
  return stitchLength.value / scale.value
}

function getRelativePos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  
  // Calculate the center offset for centered zoom
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // Adjust coordinates to account for centered scaling
  const scaledCenterX = centerX * scale.value
  const scaledCenterY = centerY * scale.value
  const offsetX = (scaledCenterX - centerX) / scale.value
  const offsetY = (scaledCenterY - centerY) / scale.value
  
  return {
    x: (e.clientX - rect.left) / scale.value + offsetX,
    y: (e.clientY - rect.top) / scale.value + offsetY,
  }
}

// Get relative position for touch events
function getTouchRelativePos(touch) {
  const rect = canvasRef.value.getBoundingClientRect()
  
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  const scaledCenterX = centerX * scale.value
  const scaledCenterY = centerY * scale.value
  const offsetX = (scaledCenterX - centerX) / scale.value
  const offsetY = (scaledCenterY - centerY) / scale.value
  
  return {
    x: (touch.clientX - rect.left) / scale.value + offsetX,
    y: (touch.clientY - rect.top) / scale.value + offsetY,
  }
}

// Inline “fixed‐spacing” interpolator:
function lineInterpolateFixed(start, end, fixedDistance) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const total = Math.hypot(dx, dy)
  // if very short, just return endpoints
  if (total < fixedDistance * 0.5) {
    return [start, end]
  }
  const steps = Math.max(1, Math.round(total / fixedDistance))
  const pts = [start]
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    pts.push({ x: start.x + dx * t, y: start.y + dy * t })
  }
  pts.push(end)
  return pts
}

// FIXED: Restore proper interpolate and jump functionality
function ensureConnectedPoints(pos) {
  if (!lastPos.value) {
    lastPos.value = pos
    return
  }

  const spacing = getScaleAwareStitchSpacing()

  if (uiStore.interpolate) {
    // INT ON → break into evenly-spaced stitches
    const pts = lineInterpolateFixed(lastPos.value, pos, spacing)
    for (let i = 1; i < pts.length; i++) {
      addLine(pts[i-1], pts[i])
    }
  } else {
    // INT OFF → one long running stitch
    addLine(lastPos.value, pos)
  }

  lastPos.value = pos
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
  // Prevent drawing when clicking on stitch control
  if (isOverStitchControl(e)) {
    return
  }
  
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
  if (isOverStitchControl(e)) return

  const pos = getRelativePos(e)
  // only step when you've moved at least one 'spacing' unit
  if (distance(lastPos.value || pos, pos) >= getScaleAwareStitchSpacing()) {
    ensureConnectedPoints(pos)
  }
}

function onPointerUp(e) {
  // Always stop drawing, regardless of where the mouse is
  drawing = false
  // Keep lastPos.value so the next stroke continues from here
}

// Touch event handlers
function onTouchStart(e) {
  if (e.touches.length !== 1) return // Only handle single touch
  if (isOverStitchControl(e.touches[0])) return
  
  drawing = true
  const pos = getTouchRelativePos(e.touches[0])
  
  if (lastPos.value) {
    ensureConnectedPoints(pos)
  } else {
    lastPos.value = pos
  }
}

function onTouchMove(e) {
  if (!drawing || e.touches.length !== 1) return
  if (isOverStitchControl(e.touches[0])) return

  const pos = getTouchRelativePos(e.touches[0])
  if (distance(lastPos.value || pos, pos) >= getScaleAwareStitchSpacing()) {
    ensureConnectedPoints(pos)
  }
}

function onTouchEnd(e) {
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

function undo() {
  drawingStore.undo()
  lastPos.value = null // Reset lastPos when undo is triggered
}
</script>

<style scoped>
.drawing-canvas {
  width: 100vw;
  height: calc(100vh - 100px);
  position: relative;
  overflow: hidden;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.stitch-control {
  position: absolute;
  bottom: 45px;  
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 200px;
  pointer-events: auto;
  touch-action: auto;
}

.stitch-scale label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 0.9rem;
}

.scale-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.scale-label {
  font-size: 0.8rem;
  color: #666;
  min-width: 35px;
  text-align: center;
}

.scale-slider {
  flex: 1;
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.scale-slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  background: #7a0081;
  border-radius: 50%;
  cursor: pointer;
}

.scale-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: #7a0081;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.scale-value {
  text-align: center;
  font-size: 0.8rem;
  color: #7a0081;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background: #f8f0f9;
  border-radius: 4px;
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
  background: rgb(255, 255, 255);
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

/* Mobile-specific adjustments */
@media (max-width: 768px) {
  .stitch-control {
    bottom: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }
  
  .drawing-canvas {
    height: calc(100vh - 60px);
  }
}
</style>

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
    <svg
      :width="width"
      :height="height"
      style="background: #fff; width: 100%; height: 100%"
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
          :stroke-width="step.penDown ? 2 : 1"
          :opacity="step.penDown ? 1 : 0.5"
        />
        <!-- Show interpolation points as purple dots -->
        <circle
          v-for="(step, i) in store.shepherd.steps"
          :key="'pt-' + i"
          :cx="step.x2"
          :cy="step.y2"
          r="2"
          :fill="'#7a0081'"
          opacity="0.8"
        />
      </g>
    </svg>
    <div v-if="store.grid" class="grid-overlay"></div>
  </div>
</template>

<script setup>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\DrawingCanvas.vue
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useStitchStore } from '@/store/stitch'
import { lineInterpolate } from '@/utils/embroidery'
import { useToggleFlags } from '@/composables/useToggleFlags.js'

const store = useStitchStore()
const canvasRef = ref(null)
const canvas = ref(null)
const width = window.innerWidth
const height = window.innerHeight - 100

let drawing = false
let lastPos = ref(null)
const { jump, interpolate, toggleJump, toggleInterpolate } = useToggleFlags()

const dist_min = 8
const dist_max = 12
const scale = ref(1)

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

    if (dist > dist_max && interpolate.value && !jump.value) {
      // Get interpolated points
      const points = lineInterpolate(lastPos.value, pos, dist_min, dist)

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
    ensureConnectedPoints(pos) // ← Use this instead of addLine()
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
      scale.value = Math.max(0.2, Math.min(scale.value * factor, 5))
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

function redraw() {
  const ctx = canvas.value.getContext('2d')
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  drawStitches(ctx, { jumpFlag: jump.value, interpFlag: interpolate.value })
}

watch([jump, interpolate], redraw) // Ensure watch is imported

function applyScale() {
  // Trigger ein Re-Rendern, falls nötig (z.B. mit nextTick oder forceUpdate)
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.1, 5)
}
function zoomOut() {
  scale.value = Math.max(scale.value * 0.9, 0.2)
}

function onDSTImport(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const fileContent = new Uint8Array(event.target.result)
    validateDST(fileContent) // Pass fileContent to validateDST
    validateDSTStitches(fileContent)
    console.log('DST file is valid')
  }
  reader.readAsArrayBuffer(file)
}
</script>

<style scoped>
.drawing-canvas {
  width: 100vw;
  height: calc(100vh - 100px);
  position: relative;
  overflow: hidden;
}
svg {
  display: block;
}
canvas {
  border: 1px solid #ccc;
}
</style>

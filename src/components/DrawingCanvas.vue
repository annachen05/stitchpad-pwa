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
      style="background: #fff; border: 1px solid #ccc; width: 100%; height: 100%"
      :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }"
    >
      <g>
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
        <circle
          v-for="(step, i) in store.shepherd.steps"
          :key="'pt-' + i"
          :cx="step.x2"
          :cy="step.y2"
          r="2"
          fill="#7a0081"
          opacity="0.8"
        />
      </g>
    </svg>
    <div v-if="store.grid" class="grid-overlay"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useStitchStore } from '@/store/stitch'
import { lineInterpolate } from '@/utils/embroidery'

const store = useStitchStore()
const canvasRef = ref(null)
const width = window.innerWidth
const height = window.innerHeight - 100

let drawing = false
let lastPos = null
let isJump = ref(false)
let interpolate = ref(false)
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

function toggleJump() {
  isJump.value = !isJump.value
}

function onPointerDown(e) {
  drawing = true
  lastPos = getRelativePos(e)
}
function onPointerMove(e) {
  if (!drawing) return
  const pos = getRelativePos(e)
  if (lastPos) {
    const dx = lastPos.x - pos.x
    const dy = lastPos.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > dist_max && interpolate.value && !isJump.value) {
      const points = lineInterpolate(lastPos, pos, dist_min, dist)
      for (let i = 0; i < points.length - 1; i++) {
        store.addLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, true)
        lastPos = points[i + 1]
      }
    } else if (dist > dist_min) {
      store.addLine(lastPos.x, lastPos.y, pos.x, pos.y, !isJump.value)
      lastPos = pos
      if (isJump.value) isJump.value = false // auto-reset jump after one segment
    }
  } else {
    lastPos = pos
  }
}
function onPointerUp(e) {
  drawing = false
  lastPos = null
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
  if (e.key === 'i') interpolate.value = !interpolate.value
}

function applyScale() {
  // Trigger ein Re-Rendern, falls nötig (z.B. mit nextTick oder forceUpdate)
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.1, 5)
}
function zoomOut() {
  scale.value = Math.max(scale.value * 0.9, 0.2)
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
</style>

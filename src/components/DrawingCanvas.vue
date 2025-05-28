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
    <svg :width="width" :height="height" style="background: #fff; border: 1px solid #ccc; width: 100%; height: 100%">
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

const store = useStitchStore()
const canvasRef = ref(null)
const width = window.innerWidth
const height = window.innerHeight - 100

let drawing = false
let lastPos = null

function getRelativePos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function onPointerDown(e) {
  drawing = true
  lastPos = getRelativePos(e)
}
function onPointerMove(e) {
  if (!drawing) return
  const pos = getRelativePos(e)
  if (lastPos) {
    store.addLine(lastPos.x, lastPos.y, pos.x, pos.y, true)
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
  // Optional: Keyboard shortcuts, wheel zoom, etc.
})
onUnmounted(() => {
  // Cleanup if needed
})
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


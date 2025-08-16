<template>
  <div class="stitch-toolbar">
    <button
      :class="{ active: drawingStore.stitchType === 'running' }"
      @click="selectStitch('running')"
    >
      Running Stitch
    </button>
    <button
      :class="{ active: drawingStore.stitchType === 'zigzag' }"
      @click="selectStitch('zigzag')"
      disabled
    >
      Zig-Zag Stitch
    </button>
    <button
      :class="{ active: drawingStore.stitchType === 'satin' }"
      @click="selectStitch('satin')"
      disabled
    >
      Satin Stitch
    </button>
  </div>
</template>

<script setup>
import { useDrawingStore } from '@/stores/drawing.js'

const drawingStore = useDrawingStore()

function selectStitch(type) {
  drawingStore.setStitchType(type)
}
</script>

<style scoped>
.stitch-toolbar {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #f0f0f0;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  display: flex;
  gap: 10px;
  z-index: 10;
}

button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  border-radius: 4px;
}

button.active {
  background-color: #7a0081;
  color: white;
  border-color: #7a0081;
}

button:disabled {
  background-color: #e0e0e0;
  color: #999;
  cursor: not-allowed;
}
</style>
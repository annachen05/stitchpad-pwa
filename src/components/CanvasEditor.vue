<!-- src/components/CanvasEditor.vue -->
<template>
  <div class="canvas-editor">
    <canvas ref="canvasEl"></canvas>
    <button @click="addRect">Rechteck hinzufügen</button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { CanvasManager } from '@/core/CanvasManager.js'

export default {
  setup() {
    const canvasEl = ref(null)
    let manager = null

    onMounted(() => {
      if (canvasEl.value) {
        manager = new CanvasManager(canvasEl.value)
      }
    })

    function addRect() {
      manager && manager.addRectangle()
    }

    return { canvasEl, addRect }
  },
}
</script>

<style scoped>
.canvas-editor canvas {
  border: 1px solid #ccc;
  width: 100%;
  height: 400px;
}
.canvas-editor button {
  margin-top: 1rem;
}
</style>

<template>
  <canvas
    ref="canvas"
    @pointerdown="startDraw"
    @pointermove="draw"
    @pointerup="endDraw"
  ></canvas>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useStitchStore } from '@/stores/stitch'

export default {
  setup() {
    const canvas = ref(null)
    const ctx = ref(null)
    const store = useStitchStore()
    let drawing = false
    let currentPath = []

    function startDraw(e) {
      drawing = true
      currentPath = []
      addPoint(e)
    }
    function draw(e) {
      if (!drawing) return
      addPoint(e)
      redrawCanvas()
    }
    function endDraw() {
      drawing = false
      store.addPath(currentPath)
    }
    function addPoint(e) {
      const rect = canvas.value.getBoundingClientRect()
      currentPath.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    function redrawCanvas() {
      const c = canvas.value
      ctx.value.clearRect(0, 0, c.width, c.height)
      // Raster
      if (store.gridOn) drawGrid()
      // Hintergrund
      if (store.background) drawBackground()
      // Alle Pfade
      store.paths.forEach(path => drawPath(path))
      // aktueller Pfad
      drawPath(currentPath)
    }
    function drawGrid() {
      // Stub: Raster zeichnen (noch nicht implementiert)
      // Beispiel: ctx.value.strokeRect(0, 0, 10, 10)
    }

    function drawBackground() {
      // Stub: Hintergrund zeichnen (noch nicht implementiert)
      // Beispiel: ctx.value.drawImage(...)
    }

    function drawPath(path) {
      // Stub: Pfad zeichnen (noch nicht implementiert)
      // Beispiel: ctx.value.beginPath(); ctx.value.moveTo(...); ctx.value.lineTo(...); ctx.value.stroke();
    }

    onMounted(() => {
      const c = canvas.value
      ctx.value = c.getContext('2d')
      c.width = 800; c.height = 800
      redrawCanvas()
    })
    onUnmounted(() => { /* cleanup falls nötig */ })

    return { canvas, startDraw, draw, endDraw }
  }
}
</script>


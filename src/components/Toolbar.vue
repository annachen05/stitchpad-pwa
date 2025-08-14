<template>
  <div class="toolbar toolbar-bottom">
    <button class="btn btn-toolbar" @click="drawingStore.undo">Undo</button>
    <button class="btn btn-toolbar" @click="uiStore.toggleGrid">Grid</button>
    <button class="btn btn-toolbar" @click="zoomIn">+</button>
    <button class="btn btn-toolbar" @click="zoomOut">-</button>
    <button class="btn btn-toolbar" @click="resetZoom" title="Reset Zoom (1:1)">🎯</button>

    <button
      id="jump-icon"
      class="btn btn-toolbar"
      :class="{ active: uiStore.isJump }"
      @click="uiStore.toggleJump"
      title="Toggle Jump (Shortcut: J)"
    >
      🐇 JUMP
    </button>

    <button
      id="interp-icon"
      class="btn btn-toolbar"
      :class="{ active: uiStore.interpolate }"
      @click="uiStore.toggleInterpolate"
      title="Toggle Interpolate (Shortcut: I)"
    >
      🔗 INT
    </button>

    <button class="btn btn-toolbar" @click="showImportDialog">Import</button>
  </div>
</template>

<script setup>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\Toolbar.vue
import { useDrawingStore } from '@/stores/drawing.js'
import { useUIStore } from '@/stores/ui.js'

const drawingStore = useDrawingStore()
const uiStore = useUIStore()

const emit = defineEmits(['show-import-dialog'])

// Updated zoom functions
function zoomIn() {
  drawingStore.zoomIn(1.1)
}

function zoomOut() {
  drawingStore.zoomOut(0.9)
}

function resetZoom() {
  drawingStore.resetZoom()
}

// Fix: Emit the event
function showImportDialog() {
  emit('show-import-dialog')
}
</script>

<style scoped>
.toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  background-color: #f8f8f8;
  border-top: none; /* Remove top border */
  padding: 10px;
}

.toolbar-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #222222;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 1.6rem 0;
  z-index: 100;
  gap: 1rem;
  border: none;
}

.toolbar-bottom button,
.toolbar-bottom label {
  color: #fffffffd;
  background: #333;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  padding: 0.7em 0.5em;
  cursor: pointer;
  transition: background 0.2s;
}

.toolbar-bottom button:hover,
.toolbar-bottom label:hover {
  background: #7b008155;
}

button.active {
  background-color: var(--active-bg);
}
</style>

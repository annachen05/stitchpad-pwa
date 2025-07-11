<template>
  <div class="toolbar toolbar-bottom">
    <button @click="store.undo">Undo</button>
    <button @click="store.toggleGrid">Grid</button>
    <button @click="zoomIn">+</button>
    <button @click="zoomOut">-</button>
    <button @click="resetZoom" title="Reset Zoom (1:1)">🎯</button>

    <button
      id="jump-icon"
      :class="{ active: jump }"
      @click="toggleJump"
      title="Toggle Jump (Shortcut: J)"
    >
      🐇 JUMP
    </button>

    <button
      id="interp-icon"
      :class="{ active: interpolate }"
      @click="toggleInterpolate"
      title="Toggle Interpolate (Shortcut: I)"
    >
      🔗 INT
    </button>

    <!-- Fix: Emit event properly -->
    <button @click="showImportDialog">Import</button>
  </div>
</template>

<script setup>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\Toolbar.vue
import { useStitchStore } from '@/store/stitch'
import { useToggleFlags } from '@/composables/useToggleFlags'

const store = useStitchStore()
const { jump, interpolate, toggleJump, toggleInterpolate } = useToggleFlags()

const emit = defineEmits(['show-import-dialog'])

// Updated zoom functions
function zoomIn() {
  store.zoomIn(1.1)
}

function zoomOut() {
  store.zoomOut(0.9)
}

function resetZoom() {
  store.resetZoom()
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

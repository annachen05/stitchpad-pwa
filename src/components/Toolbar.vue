<template>
  <div class="toolbar toolbar-bottom">
    <button @click="store.undo">Undo</button>
    <button @click="store.toggleGrid">Grid</button>
    <button @click="zoomIn">+</button>
    <button @click="zoomOut">-</button>
    <button
      id="jump-icon"
      :class="{ active: jump }"
      @click="toggleJump"
      title="Toggle Jump (Shortcut: J)"
    >
      🐇
    </button>
    <button
      id="interp-icon"
      :class="{ active: interpolate }"
      @click="toggleInterpolate"
      title="Toggle Interpolate (Shortcut: I)"
    >
      ✏️
    </button>
    <button @click="exportGCode" title="Export G-code">📐 G-code</button>
    <button @click="openSaveDialog">Speichern</button>
    <input type="file" @change="onDSTImport" accept=".dst" />
    <label>
      Hintergrund laden
      <input type="file" accept="image/*" @change="onBackgroundChange" style="display: none" />
    </label>
    <label>
      DST importieren
      <input type="file" accept=".dst" @change="onDSTImport" style="display: none" />
    </label>
  </div>
</template>

<script setup>
import { useStitchStore } from '@/store/stitch'
import { ref } from 'vue'
import { useToggleFlags } from '@/composables/useToggleFlags'
import { saveAs } from 'file-saver'

const store = useStitchStore()
const showSaveDialog = ref(false)
const emit = defineEmits(['toggle-jump'])

const { jump, interpolate, toggleJump, toggleInterpolate } = useToggleFlags()

function onBackgroundChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    store.setBackground(evt.target.result)
  }
  reader.readAsDataURL(file)
}

function onDSTImport(e) {
  const file = e.target.files[0]
  if (!file) return
  store.importDST(file)
}

function openSaveDialog() {
  showSaveDialog.value = true
}

function zoomIn() {
  if (store.shepherd && typeof store.shepherd.zoom === 'function') {
    store.shepherd.zoom(1.1) // 10% reinzoomen
  }
}
function zoomOut() {
  if (store.shepherd && typeof store.shepherd.zoom === 'function') {
    store.shepherd.zoom(0.9) // 10% rauszoomen
  }
}

function exportGCode() {
  try {
    const gcode = store.exportGCode('my-design')
    const blob = new Blob([gcode], { type: 'text/plain' })
    saveAs(blob, 'design.gcode')
  } catch (error) {
    console.error('G-code export failed:', error)
    alert('Failed to export G-code: ' + error.message)
  }
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
  background: #222;
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
  color: #fff;
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

<template>
  <div class="toolbar toolbar-bottom">
    <button @click="store.undo">Undo</button>
    <button @click="store.toggleGrid">Grid</button>
    <button @click="zoomIn">+</button>
    <button @click="zoomOut">-</button>
    <button @click="resetZoom" title="Reset Zoom (1:1)">🎯</button>
    <!-- Add this -->

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

    <button @click="$refs.unifiedInput.click()">Datei laden</button>
    <input
      type="file"
      ref="unifiedInput"
      @change="onUnifiedFileChange"
      accept=".dst,image/*"
      style="display: none"
    />
  </div>
</template>

<script setup>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\Toolbar.vue
import { useStitchStore } from '@/store/stitch'
import { ref } from 'vue'
import { useToggleFlags } from '@/composables/useToggleFlags'

const store = useStitchStore()
const showSaveDialog = ref(false)
const emit = defineEmits(['toggle-jump'])

const { jump, interpolate, toggleJump, toggleInterpolate } = useToggleFlags()

// Updated zoom functions to use store scale management
function zoomIn() {
  store.zoomIn(1.1) // 10% zoom in
}

function zoomOut() {
  store.zoomOut(0.9) // 10% zoom out
}

// Add reset zoom function (optional)
function resetZoom() {
  store.resetZoom()
}

function onUnifiedFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.name.toLowerCase().endsWith('.dst')) {
    store.importDST(file)
    console.log('DST file imported:', file.name)
  } else if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (evt) => {
      store.setBackground(evt.target.result)
      console.log('Background image loaded:', file.name)
    }
    reader.readAsDataURL(file)
  } else {
    alert('Please select a DST file (.dst) or an image file')
  }

  e.target.value = ''
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

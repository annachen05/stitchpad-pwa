<template>
  <div class="toolbar toolbar-bottom">
    <button @click="store.undo">Undo</button>
    <button @click="store.toggleGrid">Grid</button>
    <button @click="zoomIn">+</button>
    <button @click="zoomOut">-</button>
    <button @click="store.toggleJump" class="toolbar-button">Toggle Jump</button>
    <button @click="store.toggleInterpolate" class="toolbar-button">Toggle Interpolate</button>
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

const store = useStitchStore()
const showSaveDialog = ref(false)
const emit = defineEmits(['toggle-jump'])

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
function toggleJump() {
  store.toggleJump();
}
function toggleInterpolate() {
  store.toggleInterpolate();
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
  border-top: 1px solid #ccc;
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
  padding: 0.5rem 0;
  z-index: 100;
  gap: 1rem;
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
</style>

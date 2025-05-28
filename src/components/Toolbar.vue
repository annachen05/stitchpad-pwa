<template>
  <div class="toolbar">
    <button @click="store.undo">Undo</button>
    <button @click="store.toggleGrid">Grid</button>
    <button @click="zoomIn">+</button>
    <button @click="zoomOut">-</button>
    <input type="file" @change="onDSTImport" accept=".dst" />
    <label>
      Hintergrund laden
      <input type="file" accept="image/*" @change="onBackgroundChange" style="display:none" />
    </label>
    <label>
      DST importieren
      <input type="file" accept=".dst" @change="onDSTImport" style="display:none" />
    </label>
  </div>
</template>

<script setup>
import { useStitchStore } from '@/store/stitch'
import { ref } from 'vue'

const store = useStitchStore()
const showSaveDialog = ref(false)

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
</script>
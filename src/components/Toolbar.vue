<template>
  <div class="toolbar">
    <button @click="store.clear">Neu</button>
    <button @click="store.toggleGrid">Raster umschalten</button>
    <label>
      Hintergrund laden
      <input type="file" accept="image/*" @change="onBackgroundChange" style="display:none" />
    </label>
    <label>
      DST importieren
      <input type="file" accept=".dst" @change="onDSTImport" style="display:none" />
    </label>
    <button @click="openSaveDialog">Speichern</button>
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
</script>
<script setup>
import { useStitchStore } from '@/store/stitch'
import { saveAs } from 'file-saver'
import { ref } from 'vue'

const store = useStitchStore()
const isExporting = ref(false)
const exportStatus = ref('')

async function saveDST() {
  if (isExporting.value) return

  try {
    isExporting.value = true
    exportStatus.value = 'Exporting DST...'

    const data = store.exportDST('design')
    const blob = new Blob([data], { type: 'application/octet-stream' })
    saveAs(blob, 'design.dst')

    exportStatus.value = 'DST export successful!'
    setTimeout(() => (exportStatus.value = ''), 3000)
  } catch (error) {
    exportStatus.value = `DST export failed: ${error.message}`
    setTimeout(() => (exportStatus.value = ''), 5000)
  } finally {
    isExporting.value = false
  }
}

async function saveEXP() {
  if (isExporting.value) return

  try {
    isExporting.value = true
    exportStatus.value = 'Exporting EXP...'

    const data = store.exportEXP()
    const blob = new Blob([data], { type: 'application/octet-stream' })
    saveAs(blob, 'design.exp')

    exportStatus.value = 'EXP export successful!'
    setTimeout(() => (exportStatus.value = ''), 3000)
  } catch (error) {
    exportStatus.value = `EXP export failed: ${error.message}`
    setTimeout(() => (exportStatus.value = ''), 5000)
  } finally {
    isExporting.value = false
  }
}

async function saveSVG() {
  if (isExporting.value) return

  try {
    isExporting.value = true
    exportStatus.value = 'Exporting SVG...'

    const data = store.exportSVG()
    const blob = new Blob([data], { type: 'image/svg+xml' })
    saveAs(blob, 'design.svg')

    exportStatus.value = 'SVG export successful!'
    setTimeout(() => (exportStatus.value = ''), 3000)
  } catch (error) {
    exportStatus.value = `SVG export failed: ${error.message}`
    setTimeout(() => (exportStatus.value = ''), 5000)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="export-buttons">
    <button @click="saveDST" :disabled="isExporting">
      {{ isExporting ? 'Exporting...' : 'Export DST' }}
    </button>
    <button @click="saveEXP" :disabled="isExporting">
      {{ isExporting ? 'Exporting...' : 'Export EXP' }}
    </button>
    <button @click="saveSVG" :disabled="isExporting">
      {{ isExporting ? 'Exporting...' : 'Export SVG' }}
    </button>
    <div
      v-if="exportStatus"
      class="export-status"
      :class="{ error: exportStatus.includes('failed') }"
    >
      {{ exportStatus }}
    </div>
  </div>
</template>

<style scoped>
.export-buttons {
  display: flex;
  gap: 1rem;
  flex-direction: column;
  align-items: center;
}

.export-status {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.export-status.error {
  background-color: #fee;
  color: #c33;
}

.export-status:not(.error) {
  background-color: #efe;
  color: #393;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

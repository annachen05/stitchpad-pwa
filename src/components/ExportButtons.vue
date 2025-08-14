<script setup>
import { useDrawingStore } from '@/stores/drawing.js'
import { ref } from 'vue'

const drawingStore = useDrawingStore()
const isExporting = ref(false)
const exportStatus = ref('')

async function saveDST() {
  if (isExporting.value) return

  try {
    isExporting.value = true
    exportStatus.value = 'Exporting DST...'

    // Add the missing export call
    await drawingStore.exportDST('design')

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

    // Add the missing export call
    await drawingStore.exportEXP('design')

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

    // Add the missing export call
    await drawingStore.exportSVG('design')

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
    <button class="btn btn-primary" @click="saveDST" :disabled="isExporting">
      {{ isExporting ? 'Exporting...' : 'Export DST' }}
    </button>
    <button class="btn btn-primary" @click="saveEXP" :disabled="isExporting">
      {{ isExporting ? 'Exporting...' : 'Export EXP' }}
    </button>
    <button class="btn btn-primary" @click="saveSVG" :disabled="isExporting">
      {{ isExporting ? 'Exporting...' : 'Export SVG' }}
    </button>
    
    <div v-if="exportStatus" class="export-status" :class="{ error: exportStatus.includes('failed') }">
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

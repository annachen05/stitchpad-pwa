<template>
  <div class="dialog-overlay" @click="$emit('close')">
    <div class="dialog save-dialog" @click.stop>
      <h3>Design Speichern</h3>
      <input v-model="fileName" placeholder="Dateiname" :disabled="isLoading" />
      <select v-model="format" :disabled="isLoading">
        <option value="dst">DST</option>
        <option value="exp">EXP</option>
        <option value="svg">SVG</option>
      </select>
      <div class="dialog-buttons">
        <button class="btn btn-primary" @click="onOk" :disabled="isLoading">
          <span v-if="isLoading" class="spinner">⏳</span>
          {{ isLoading ? 'Saving...' : 'OK' }}
        </button>
        <button class="btn btn-secondary" @click="onCancel" :disabled="isLoading">Cancel</button>
      </div>
      <div v-if="status" class="status-message" :class="{ error: status.includes('failed') }">
        {{ status }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'

const emit = defineEmits(['close'])
const drawingStore = useDrawingStore()
const fileName = ref('mein-design')
const format = ref('dst')
const isLoading = ref(false)
const status = ref('')

async function onOk() {
  if (isLoading.value) return
  
  try {
    isLoading.value = true
    status.value = `Exporting ${format.value.toUpperCase()}...`
    
    switch (format.value) {
      case 'dst':
        await drawingStore.exportDST(fileName.value)
        break
      case 'exp':
        await drawingStore.exportEXP(fileName.value)
        break
      case 'svg':
        await drawingStore.exportSVG(fileName.value)
        break
      default:
        throw new Error('Unknown format')
    }
    
    status.value = 'Export successful!'
    setTimeout(() => emit('close'), 1000)
  } catch (error) {
    console.error('Export failed:', error)
    status.value = `Export failed: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

function onCancel() {
  if (!isLoading.value) {
    emit('close')
  }
}
</script>

<style scoped>
.status-message {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #e8f5e8;
  color: #2d5a2d;
}

.status-message.error {
  background-color: #fee;
  color: #c33;
}

.spinner {
  display: inline-block;
  margin-right: 0.5rem;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

input:disabled,
select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

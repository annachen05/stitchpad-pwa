<template>
  <div class="dialog-overlay" @click="$emit('close')">
    <div class="dialog save-dialog" @click.stop>
      <div class="dialog-header">
        <h3>Export Design</h3>
        <button class="close-btn" @click="onCancel">&times;</button>
      </div>

      <div class="dialog-body">
        <div class="export-section">
          <h4>Options</h4>
          <div class="form-group format-group">
            <label>Format</label>
            <select v-model="format" :disabled="isLoading">
              <option value="gcode">G-code (*.gcode)</option>
              <option value="svg">Optimized SVG (*.svg)</option>
              <option value="txt">Coordinates Text (*.txt)</option>
              <option value="pdf">PDF Document (*.pdf)</option>
              <option value="png">PNG Image (*.png)</option>
              <option value="jpg">JPEG Image (*.jpg)</option>
            </select>
          </div>

          <div v-if="format === 'png' || format === 'jpg'" class="form-group">
            <label>Image Details</label>
            <div class="resolution-options">
              <label><input type="radio" v-model.number="imageScale" :value="1" /> Normal (96 DPI)</label>
              <label><input type="radio" v-model.number="imageScale" :value="2" /> High (192 DPI)</label>
              <label><input type="radio" v-model.number="imageScale" :value="4" /> Ultra (384 DPI)</label>
            </div>
          </div>
        </div>

        <div class="export-section">
          <h4>Output File</h4>
          <div class="form-group file-group">
            <input v-model="fileName" placeholder="Filename (without extension)" :disabled="isLoading" class="filename-input" />
            <span class="file-extension">.{{ format }}</span>
          </div>
          <p class="export-hint" v-if="hasFileSystemAccess">
            You will be prompted to choose the exact folder and file name when exporting.
          </p>
          <p class="export-hint" v-else>
            Your browser will save this file to your default Downloads folder.
          </p>
        </div>
      </div>

      <div class="dialog-footer">
        <div v-if="status" class="status-message" :class="{ error: status.includes('failed') }">
          {{ status }}
        </div>
        <div class="dialog-buttons">
          <button class="btn btn-secondary" @click="onCancel" :disabled="isLoading">Cancel</button>
          <button class="btn btn-primary" @click="onExport" :disabled="isLoading" title="Choose file destination and export">
            <span v-if="isLoading" class="spinner">⏳</span>
            <span v-else>Export...</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { ExportService } from '@/services/exportService.js'

const emit = defineEmits(['close'])
const drawingStore = useDrawingStore()
const fileName = ref('stitch-design')
const format = ref('gcode')
const imageScale = ref(2)
const isLoading = ref(false)
const status = ref('')

const hasFileSystemAccess = computed(() => {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
})

async function onExport() {
  if (isLoading.value) return
  
  try {
    isLoading.value = true
    status.value = `Preparing ${format.value.toUpperCase()}...`
    
    // Instead of calling drawingStore, we'll let drawingStore handle FileSaver saveAs internally 
    // unless we refactor all.
    // BUT since we just use store exports that rely on file-saver, 
    // `file-saver` actually uses showSaveFilePicker if available in newer versions,
    // or native `<a download>` which prompts for location if the user setup their browsed to "Ask where to save each file".
    // The format string doesn't include the extension if not specified, 
    // but drawingStore and exportService automatically append the extension
    // for all methods, e.g. `${name}.gcode` inside saveAs.
    // So we just pass the raw name!
    const baseName = fileName.value.replace(/\.[^/.]+$/, "")

    switch (format.value) {
      case 'gcode':
        await drawingStore.exportGCode(baseName)
        break
      case 'svg':
        await drawingStore.exportSVG(baseName)
        break
      case 'txt':
        await drawingStore.exportTXT(baseName)
        break
      case 'pdf':
        await drawingStore.exportPDF(baseName)
        break
      case 'png':
        await ExportService.exportPNG(
          drawingStore.optimizePathsEnabled ? drawingStore.getOptimizedShepherd().steps : drawingStore.shepherd.steps,
          baseName,
          drawingStore.paperPx,
          drawingStore.paperRect,
          imageScale.value
        )
        break
      case 'jpg':
        await ExportService.exportJPG(
          drawingStore.optimizePathsEnabled ? drawingStore.getOptimizedShepherd().steps : drawingStore.shepherd.steps,
          baseName,
          drawingStore.paperPx,
          drawingStore.paperRect,
          imageScale.value
        )
        break
      default:
        throw new Error('Unknown format')
    }
    
    status.value = 'Export successful!'
    setTimeout(() => emit('close'), 1000)
  } catch (error) {
    if (error.name === 'AbortError') {
      status.value = 'Export cancelled.'
    } else {
      console.error('Export failed:', error)
      status.value = `Export failed: ${error.message}`
    }
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
.save-dialog {
  width: 500px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #000;
}

.dialog-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.export-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.export-section h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.25rem;
}

.export-area-options {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.badge.info {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.info-text {
  font-size: 0.9rem;
  color: #666;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.format-group select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  background-color: #fff;
}

.resolution-options {
  display: flex;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.resolution-options label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: normal;
  cursor: pointer;
}

.file-group {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.filename-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.file-extension {
  font-family: monospace;
  font-size: 1.1rem;
  color: #666;
  font-weight: bold;
}

.export-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #777;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #fafafa;
  border-top: 1px solid #ddd;
}

.dialog-buttons {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.status-message {
  font-size: 0.9rem;
  color: #2d5a2d;
  flex: 1;
}

.status-message.error {
  color: #c33;
}

.spinner {
  display: inline-block;
  margin-right: 0.5rem;
}

button:disabled,
input:disabled,
select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

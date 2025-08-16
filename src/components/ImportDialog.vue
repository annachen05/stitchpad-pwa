<template>
  <div v-if="show" class="import-dialog-overlay" @click="closeDialog">
    <div class="import-dialog" @click.stop>
      <h3>Import & Background</h3>

      <!-- File Upload Section -->
      <div 
        class="upload-section"
        :class="{ 'drag-over': isDragOver }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="upload-button" @click="triggerFileInput">
          <div class="upload-icon">{{ isDragOver ? '⬇' : '⬆' }}</div>
          <span>{{ isDragOver ? 'Drop file here' : 'Select File or Drop Here' }}</span>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".dst,image/*"
          @change="handleFileUpload"
          style="display: none"
        />
        <p class="file-info">DST files or images (PNG, JPG, etc.)</p>
      </div>

      <!-- Current Files Section -->
      <div class="current-files">
        <!-- Background Image -->
        <div v-if="drawingStore.backgroundImage" class="file-item">
          <div class="file-preview">
            <img :src="drawingStore.backgroundImage" alt="Background" class="preview-thumb" />
          </div>
          <div class="file-info">
            <strong>Background Image</strong>
            <p>Scale: {{ (drawingStore.backgroundScale * 100).toFixed(0) }}%</p>
          </div>
          <div class="file-actions">
            <button @click="removeBackground" class="remove-btn">Remove</button>
          </div>
        </div>

        <!-- DST Design -->
        <div v-if="hasDesign" class="file-item">
          <div class="file-preview">
            <div class="dst-preview">DST</div>
          </div>
          <div class="file-info">
            <strong>DST Design</strong>
            <p>{{ drawingStore.shepherd.steps.length }} stitches</p>
          </div>
          <div class="file-actions">
            <button @click="removeDesign" class="remove-btn">Remove</button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!drawingStore.backgroundImage && !hasDesign" class="empty-state">
          <p>No files imported</p>
        </div>
      </div>

      <!-- Background Scale Controls -->
      <div v-if="drawingStore.backgroundImage" class="scale-controls">
        <h4>Background Scale</h4>
        <div class="scale-slider">
          <label>
            <input type="checkbox" v-model="zoomToFit" @change="updateImageScale" />
            Zoom to fit
          </label>
          <div class="slider-container">
            <span>{{ (imageScale * 100).toFixed(0) }}%</span>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              v-model="imageScale"
              @input="updateImageScale"
              :disabled="zoomToFit"
            />
          </div>
        </div>
      </div>

      <!-- Dialog Buttons -->
      <div class="dialog-buttons">
        <button @click="clearAll" class="remove-btn">Clear All</button>
        <button @click="closeDialog" class="close-btn">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const drawingStore = useDrawingStore()
const fileInput = ref(null)
const imageScale = ref(1)
const zoomToFit = ref(false)
const isDragOver = ref(false)

// Check if there's a design loaded
const hasDesign = computed(() => drawingStore.shepherd.steps.length > 0)

// Watch for background changes
watch(
  () => drawingStore.backgroundImage,
  (newImage) => {
    if (newImage) {
      imageScale.value = drawingStore.backgroundScale
    }
  }
)

// Watch for scale changes
watch(
  () => drawingStore.backgroundScale,
  (newScale) => {
    imageScale.value = newScale
  }
)

function triggerFileInput() {
  fileInput.value?.click()
}

function processFile(file) {
  if (!file) return

  if (file.name.toLowerCase().endsWith('.dst')) {
    // Handle DST files
    drawingStore.importDST(file)
    console.log('DST file imported:', file.name)
  } else if (file.type.startsWith('image/')) {
    // Handle image files
    const reader = new FileReader()
    reader.onload = (e) => {
      drawingStore.setBackground(e.target.result)
      imageScale.value = 1
      zoomToFit.value = false
      console.log('Background image loaded:', file.name)
    }
    reader.readAsDataURL(file)
  } else {
    alert('Please select a DST file (.dst) or an image file')
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  processFile(file)
  
  // Reset file input
  event.target.value = ''
}

// Drag and drop event handlers
function onDragEnter(event) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragOver(event) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave(event) {
  event.preventDefault()
  // Only set to false if we're actually leaving the drop zone
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false
  }
}

function onDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    processFile(files[0])
  }
}

function removeBackground() {
  drawingStore.clearBackground()
  imageScale.value = 1
  zoomToFit.value = false
}

function removeDesign() {
  drawingStore.clear()
}

function clearAll() {
  removeBackground();
  removeDesign();
}

function calculateZoomToFit() {
  if (!drawingStore.backgroundImage) return

  const img = new Image()
  img.onload = () => {
    const canvasWidth = window.innerWidth
    const canvasHeight = window.innerHeight - 100

    const scaleX = canvasWidth / img.width
    const scaleY = canvasHeight / img.height
    const fitScale = Math.min(scaleX, scaleY, 1)

    imageScale.value = fitScale
    updateImageScale()
  }
  img.src = drawingStore.backgroundImage
}

function updateImageScale() {
  if (zoomToFit.value) {
    calculateZoomToFit()
  } else {
    drawingStore.setBackgroundScale(imageScale.value)
  }
}

function closeDialog() {
  emit('close')
}
</script>

<style scoped>
.import-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.import-dialog {
  background: rgb(255, 255, 255);
  border-radius: 8px;
  padding: 2rem;
  min-width: 450px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.import-dialog h3 {
  margin: 0 0 1.5rem 0;
  text-align: center;
  color: #333;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
  transition: all 0.3s ease;
}

.upload-section.drag-over {
  border-color: #7a0081;
  background-color: #f0e6f7;
  transform: scale(1.02);
}

.upload-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #666;
}

.upload-button:hover {
  color: #7a0081;
}

.upload-section.drag-over .upload-button {
  color: #7a0081;
}

.file-info {
  font-size: 0.9rem;
  color: #3e3e3e;
  margin-top: 0.5rem;
}

.current-files {
  margin-bottom: 1.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background-color: #f8f9fa;
}

.file-preview {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  overflow: hidden;
}

.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dst-preview {
  width: 100%;
  height: 100%;
  background-color: #7a0081;
  color: rgb(137, 137, 137);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
}

.file-info {
  flex: 1;
}

.file-info strong {
  display: block;
  margin-bottom: 0.25rem;
}

.file-info p {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}

.remove-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.remove-btn:hover {
  background-color: #c82333;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.scale-controls {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.scale-controls h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.scale-slider {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider-container input[type='range'] {
  flex: 1;
}

.dialog-buttons {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.close-btn {
  background-color: #6c757d;
  color: rgb(255, 255, 255);
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.close-btn:hover {
  background-color: #5a6268;
}
</style>

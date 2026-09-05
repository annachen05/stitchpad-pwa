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
          accept="image/*,.svg,.pdf"
          @change="handleFileUpload"
          style="display: none"
        />
        <p class="file-info">Image/SVG/PDF files (PNG, JPG, SVG, PDF)</p>
      </div>

      <!-- Re-vectorize Section -->
      <div v-if="drawingStore.lastVectorizedImage" class="re-vectorize-section">
        <button @click="openReVectorize" class="re-vectorize-btn">
          <span class="btn-icon">🔄</span>
          <div class="btn-text">
            <strong>Re-vectorize Last Image</strong>
            <small>Adjust settings and re-apply</small>
          </div>
        </button>
      </div>

      <!-- Configure Stitching Section (if vectorized paths exist) -->
      <div v-if="hasVectorizedPaths" class="stitch-config-section">
        <button @click="openStitchSettings" class="stitch-config-btn">
          <span class="btn-icon">🧵</span>
          <div class="btn-text">
            <strong>Configure Stitching</strong>
            <small>{{ vectorizationPathCountDisplay }} vectorized paths ready</small>
          </div>
        </button>
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
            <span class="zoom-to-fit-label">Zoom to fit</span>
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

    <!-- Image Choice Dialog -->
    <div v-if="showImageChoiceDialog" class="choice-dialog-overlay" @click="showImageChoiceDialog = false">
      <div class="choice-dialog" @click.stop>
        <h3>How would you like to use this image?</h3>
        <p class="choice-description">Choose how to import your image:</p>
        
        <div class="choice-options">
          <button class="choice-btn vectorize" @click="chooseVectorize">
            <div class="choice-icon">✏️</div>
            <strong>Vectorize</strong>
            <p>Convert image lines to embroidery paths</p>
          </button>
          
          <button class="choice-btn background" @click="chooseBackground">
            <div class="choice-icon">🖼️</div>
            <strong>Background</strong>
            <p>Use as reference image</p>
          </button>
        </div>
        
        <button @click="showImageChoiceDialog = false" class="cancel-choice">Cancel</button>
      </div>
    </div>

    <!-- Vectorize Dialog -->
    <VectorizeDialog 
      :show="showVectorizeDialog"
      :imageDataUrl="imageToVectorize"
      :initialSettings="initialVectorizeSettings"
      @close="showVectorizeDialog = false"
      @vectorization-complete="handleVectorizationComplete"
      @settings-changed="handleSettingsChanged"
    />

    <!-- Stitch Settings Dialog -->
    <StitchSettingsDialog 
      :show="showStitchSettingsDialog"
      :pathCount="vectorizationPathCount"
      @close="showStitchSettingsDialog = false"
      @apply="handleStitchSettingsApplied"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import VectorizeDialog from './VectorizeDialog.vue'
import StitchSettingsDialog from './StitchSettingsDialog.vue'
import { VectorizeService } from '@/services/vectorizeService.js'

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
const showVectorizeDialog = ref(false)
const showStitchSettingsDialog = ref(false)
const showImageChoiceDialog = ref(false)
const imageToVectorize = ref(null)
const importedSvgPaths = ref(null)
const initialVectorizeSettings = ref(null)
const importSourceType = ref('image')
const vectorizationPathCount = ref(0)

// Check if there's a design loaded
const hasDesign = computed(() => drawingStore.shepherd.steps.length > 0)
const hasVectorizedPaths = computed(
  () => Array.isArray(drawingStore.vectorizedPaths) && drawingStore.vectorizedPaths.length > 0
)
const vectorizationPathCountDisplay = computed(() =>
  hasVectorizedPaths.value ? drawingStore.vectorizedPaths.length : 0
)

// Load last vectorization on mount
onMounted(() => {
  drawingStore.loadLastVectorization()
})

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

async function processFile(file) {
  if (!file) return

  const lowerName = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf')
  const isSvg = file.type === 'image/svg+xml' || lowerName.endsWith('.svg')
  const isImage = file.type.startsWith('image/') || isSvg

  if (!isPdf && !isImage) {
    alert('Please select an image, SVG, or PDF file')
    return
  }

  try {
    let dataUrl = null
    importedSvgPaths.value = null

    if (isPdf) {
      dataUrl = await renderPdfFirstPageToDataUrl(file)
      importSourceType.value = 'pdf'
      console.log('PDF first page rendered:', file.name)
    } else if (isSvg) {
      const svgText = await readFileAsText(file)
      importedSvgPaths.value = extractVectorPathsFromSvg(svgText)
      if (!importedSvgPaths.value.length) {
        throw new Error('No vector paths found in SVG file')
      }

      dataUrl = await readFileAsDataUrl(file)
      importSourceType.value = 'svg'
      console.log('SVG loaded as vectors:', {
        name: file.name,
        paths: importedSvgPaths.value.length,
      })
    } else {
      dataUrl = await readFileAsDataUrl(file)
      importSourceType.value = 'image'
      console.log('Image loaded:', file.name)
    }

    imageToVectorize.value = dataUrl
    initialVectorizeSettings.value = {
      sourceType: importSourceType.value,
      autoTuneForSource: true,
      detectionMode: (importSourceType.value === 'pdf' || importSourceType.value === 'svg') ? 'canny' : 'adaptive',
    }
    showImageChoiceDialog.value = true
  } catch (error) {
    console.error('Import failed:', error)
    alert(`Failed to import file: ${error.message}`)
  }
}

async function handleFileUpload(event) {
  const file = event.target.files[0]
  await processFile(file)
  
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

async function onDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    await processFile(files[0])
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read file as text'))
    reader.readAsText(file)
  })
}

function extractVectorPathsFromSvg(svgText) {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(svgText, 'image/svg+xml')
  const parseError = parsed.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid SVG format')
  }

  const sourceSvg = parsed.documentElement
  if (!sourceSvg || sourceSvg.tagName.toLowerCase() !== 'svg') {
    throw new Error('SVG root element missing')
  }

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '-10000px'
  host.style.width = '1px'
  host.style.height = '1px'
  host.style.opacity = '0'
  host.style.pointerEvents = 'none'
  document.body.appendChild(host)

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const viewBox = sourceSvg.getAttribute('viewBox')
  if (viewBox) {
    svg.setAttribute('viewBox', viewBox)
    const [minX, minY, vbWidth, vbHeight] = viewBox.split(/[\s,]+/).map(Number)
    if (Number.isFinite(vbWidth) && Number.isFinite(vbHeight) && vbWidth > 0 && vbHeight > 0) {
      svg.setAttribute('width', String(vbWidth))
      svg.setAttribute('height', String(vbHeight))
      svg.setAttribute('data-min-x', String(Number.isFinite(minX) ? minX : 0))
      svg.setAttribute('data-min-y', String(Number.isFinite(minY) ? minY : 0))
    }
  }

  const widthAttr = sourceSvg.getAttribute('width')
  const heightAttr = sourceSvg.getAttribute('height')
  if (!svg.getAttribute('width')) {
    svg.setAttribute('width', widthAttr || '1000')
  }
  if (!svg.getAttribute('height')) {
    svg.setAttribute('height', heightAttr || '1000')
  }

  while (sourceSvg.firstChild) {
    svg.appendChild(document.importNode(sourceSvg.firstChild, true))
    sourceSvg.removeChild(sourceSvg.firstChild)
  }

  host.appendChild(svg)

  try {
    const elements = svg.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse')
    const resultPaths = []
    const baseStep = 2.0
    const viewMinX = Number.parseFloat(svg.getAttribute('data-min-x') || '0') || 0
    const viewMinY = Number.parseFloat(svg.getAttribute('data-min-y') || '0') || 0

    for (const element of elements) {
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') continue

      if (typeof element.getTotalLength !== 'function' || typeof element.getPointAtLength !== 'function') {
        continue
      }

      let totalLength = 0
      try {
        totalLength = element.getTotalLength()
      } catch {
        continue
      }

      if (!Number.isFinite(totalLength) || totalLength <= 0) continue

      const sampleCount = Math.max(2, Math.ceil(totalLength / baseStep))
      const ctm = element.getCTM()
      const points = []

      for (let i = 0; i <= sampleCount; i++) {
        const distance = (i / sampleCount) * totalLength
        const p = element.getPointAtLength(distance)

        let x = p.x
        let y = p.y
        if (ctm) {
          const transformed = new DOMPoint(p.x, p.y).matrixTransform(ctm)
          x = transformed.x
          y = transformed.y
        }

        x -= viewMinX
        y -= viewMinY

        const last = points[points.length - 1]
        if (!last || Math.hypot(x - last[0], y - last[1]) > 0.2) {
          points.push([x, y])
        }
      }

      if (points.length >= 2) {
        resultPaths.push(points)
      }
    }

    return resultPaths
  } finally {
    host.remove()
  }
}

async function renderPdfFirstPageToDataUrl(file) {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])

  GlobalWorkerOptions.workerSrc = workerModule.default

  const buffer = await file.arrayBuffer()
  const loadingTask = getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)

  const baseViewport = page.getViewport({ scale: 1 })
  const maxDim = Math.max(baseViewport.width, baseViewport.height)
  const targetMax = 1800
  const renderScale = maxDim > 0 ? Math.min(3, targetMax / maxDim) : 1
  const viewport = page.getViewport({ scale: Math.max(renderScale, 1) })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Could not create canvas context for PDF rendering')

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: ctx, viewport }).promise

  return canvas.toDataURL('image/png')
}

function removeBackground() {
  drawingStore.clearBackground()
  imageScale.value = 1
  zoomToFit.value = false
}

function removeDesign() {
  drawingStore.clear()
  drawingStore.clearVectorizedPaths()
  drawingStore.clearLastVectorization()
  showStitchSettingsDialog.value = false
  vectorizationPathCount.value = 0
}

function clearAll() {
  drawingStore.clear()
  drawingStore.clearVectorizedPaths()
  drawingStore.clearLastVectorization()
  imageToVectorize.value = null
  initialVectorizeSettings.value = null
  vectorizationPathCount.value = 0
  showImageChoiceDialog.value = false
  showVectorizeDialog.value = false
  showStitchSettingsDialog.value = false
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

function chooseVectorize() {
  showImageChoiceDialog.value = false

  if (importSourceType.value === 'svg' && Array.isArray(importedSvgPaths.value) && importedSvgPaths.value.length > 0) {
    const bounds = VectorizeService.calculateBounds(importedSvgPaths.value)
    const metadata = {
      autoFit: true,
      outputScale: 1,
      bounds,
      pathCount: importedSvgPaths.value.length,
      settings: {
        sourceType: 'svg',
        autoTuneForSource: false,
        importedAsVector: true,
      },
    }

    drawingStore.setVectorizedPaths(importedSvgPaths.value, metadata)
    drawingStore.setLastVectorization(imageToVectorize.value, metadata.settings)
    vectorizationPathCount.value = importedSvgPaths.value.length
    closeDialog()
    return
  }

  showVectorizeDialog.value = true
}

function chooseBackground() {
  showImageChoiceDialog.value = false
  if (imageToVectorize.value) {
    drawingStore.setBackground(imageToVectorize.value)
    imageScale.value = 1
    zoomToFit.value = false
  }
}

function openReVectorize() {
  imageToVectorize.value = drawingStore.lastVectorizedImage
  const savedSourceType = drawingStore.lastVectorizeSettings?.sourceType || 'image'
  importSourceType.value = savedSourceType
  initialVectorizeSettings.value = {
    ...drawingStore.lastVectorizeSettings,
    sourceType: savedSourceType,
    autoTuneForSource: drawingStore.lastVectorizeSettings?.autoTuneForSource ?? true,
  }
  showVectorizeDialog.value = true
}

function openStitchSettings() {
  if (drawingStore.vectorizedPaths) {
    vectorizationPathCount.value = drawingStore.vectorizedPaths.length
    showStitchSettingsDialog.value = true
  }
}

function handleVectorizationComplete(data) {
  // Close the VectorizeDialog
  showVectorizeDialog.value = false
  
  // Store path count for stitch settings
  if (data && data.pathCount) {
    vectorizationPathCount.value = data.pathCount
  }

  // Do NOT auto-open stitch settings.
  // Vectorization and stitching are separate steps; user can click "Configure Stitching" when ready.
  showStitchSettingsDialog.value = false

  // Close the import dialog so the vector overlay is immediately visible on the canvas.
  closeDialog()
}

function handleStitchSettingsApplied(settings) {
  // Stitch settings were applied, close everything
  showStitchSettingsDialog.value = false
  closeDialog()
}

function handleSettingsChanged(settings) {
  drawingStore.setLastVectorization(imageToVectorize.value, settings)
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

.scale-slider label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333; /* Ensure proper text color */
}

.zoom-to-fit-label {
  color: #333 !important; /* Force dark text color */
  font-weight: 500;
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

/* Image Choice Dialog */
.choice-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.choice-dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.choice-dialog h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  text-align: center;
  font-size: 1.5rem;
}

.choice-description {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.choice-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.choice-btn {
  padding: 2rem 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.choice-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.choice-btn.vectorize {
  border-color: #7a0081;
}

.choice-btn.vectorize:hover {
  background: #f8f0f9;
  border-color: #5a0061;
}

.choice-btn.background {
  border-color: #2196F3;
}

.choice-btn.background:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}

.choice-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.choice-btn strong {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #333;
  display: block;
}

.choice-btn p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.cancel-choice {
  width: 100%;
  padding: 0.75rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.cancel-choice:hover {
  background: #5a6268;
}

/* Re-vectorize Section */
.re-vectorize-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f0f8ff 0%, #e8f5e9 100%);
  border-radius: 8px;
  border: 2px solid #7a0081;
}

.re-vectorize-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #7a0081;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.re-vectorize-btn:hover {
  background: #f8f0f9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(122, 0, 129, 0.2);
}

/* Stitch Configuration Section */
.stitch-config-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%);
  border-radius: 8px;
  border: 2px solid #ff6b6b;
}

.stitch-config-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #ff6b6b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.stitch-config-btn:hover {
  background: #fff8f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
}

.btn-icon {
  font-size: 2rem;
}

.btn-text {
  flex: 1;
  text-align: left;
}

.btn-text strong {
  display: block;
  color: #7a0081;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.btn-text small {
  color: #666;
  font-size: 0.85rem;
}
</style>

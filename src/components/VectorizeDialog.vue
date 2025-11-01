<template>
  <div v-if="show" class="dialog-overlay" @click="closeDialog">
    <div class="vectorize-dialog" @click.stop>
      <h3>Image Vectorization</h3>
      
      <!-- Preview Section -->
      <div class="preview-section">
        <div class="preview-box">
          <h4>Original</h4>
          <img v-if="previewImage" :src="previewImage" alt="Original" />
          <p v-else class="empty-state">No image loaded</p>
        </div>
        
        <div class="preview-box">
          <h4>Vectorized Preview {{ settings.autoFitToCanvas ? '(Auto-Fit)' : '' }}</h4>
          <canvas ref="previewCanvas" class="preview-canvas"></canvas>
        </div>
      </div>
      
      <!-- Settings -->
      <div class="settings-section">
        <h4>Vectorization Settings</h4>
        
        <!-- Auto-Fit to Canvas -->
        <div class="setting-group highlight-setting">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.autoFitToCanvas"
              @change="updatePreview"
            />
            Auto-Fit to Canvas (Recommended)
          </label>
          <small class="setting-hint">Automatically scales and centers the design to fit the canvas. Disable for 1:1 pixel mapping.</small>
        </div>
        
        <!-- Detection Mode -->
        <div class="setting-group">
          <label>
            Detection Mode
            <select v-model="settings.detectionMode" @change="updatePreview">
              <option value="standard">Standard (Threshold)</option>
              <option value="adaptive">Adaptive Threshold</option>
              <option value="edge">Edge Detection (Sobel)</option>
              <option value="canny">Canny Edge Detection (Professional)</option>
            </select>
          </label>
          <small v-if="settings.detectionMode === 'canny'" class="setting-hint">Industry-standard edge detection with hysteresis</small>
        </div>
        
        <!-- Auto Threshold -->
        <div v-if="settings.detectionMode === 'standard'" class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.autoThreshold"
              @change="updatePreview"
            />
            Auto-Calculate Threshold
          </label>
        </div>
        
        <!-- Contrast Enhancement -->
        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.enhanceContrast"
              @change="updatePreview"
            />
            Enhance Contrast First (Recommended)
          </label>
        </div>
        
        <!-- Advanced Contrast Enhancement (CLAHE) -->
        <div v-if="settings.enhanceContrast" class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.useCLAHE"
              @change="updatePreview"
            />
            Use Professional CLAHE (Better for Low Contrast)
          </label>
          <small class="setting-hint">Contrast Limited Adaptive Histogram Equalization - better than standard histogram equalization</small>
        </div>
        
        <!-- CLAHE Settings -->
        <div v-if="settings.enhanceContrast && settings.useCLAHE" class="setting-subgroup">
          <div class="setting-group">
            <label>
              CLAHE Clip Limit
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.5"
                v-model.number="settings.claheClipLimit"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.claheClipLimit }}</span>
            </label>
            <small class="setting-hint">Higher = more contrast enhancement (2.0 recommended)</small>
          </div>
          
          <div class="setting-group">
            <label>
              CLAHE Tile Size
              <input 
                type="range" 
                min="4" 
                max="16" 
                step="4"
                v-model.number="settings.claheTileSize"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.claheTileSize }}</span>
            </label>
            <small class="setting-hint">Smaller = more local adaptation (8 recommended)</small>
          </div>
        </div>
        
        <!-- Standard Threshold -->
        <div v-if="settings.detectionMode === 'standard' && !settings.autoThreshold" class="setting-group">
          <label>
            Threshold (Black/White)
            <input 
              type="range" 
              min="0" 
              max="255" 
              v-model.number="settings.threshold"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.threshold }}</span>
          </label>
        </div>
        
        <!-- Adaptive Block Size -->
        <div v-if="settings.detectionMode === 'adaptive'" class="setting-group">
          <label>
            Adaptive Block Size
            <input 
              type="range" 
              min="5" 
              max="51" 
              step="2"
              v-model.number="settings.adaptiveBlockSize"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.adaptiveBlockSize }}</span>
          </label>
        </div>
        
        <!-- Edge Threshold -->
        <div v-if="settings.detectionMode === 'edge'" class="setting-group">
          <label>
            Edge Detection Sensitivity
            <input 
              type="range" 
              min="10" 
              max="100" 
              v-model.number="settings.edgeThreshold"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.edgeThreshold }}</span>
          </label>
        </div>
        
        <!-- Canny Thresholds -->
        <div v-if="settings.detectionMode === 'canny'" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Canny Low Threshold
              <input 
                type="range" 
                min="10" 
                max="150" 
                v-model.number="settings.cannyLowThreshold"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.cannyLowThreshold }}</span>
            </label>
            <small class="setting-hint">Lower = more edges detected (50 recommended)</small>
          </div>
          
          <div class="setting-group">
            <label>
              Canny High Threshold
              <input 
                type="range" 
                min="50" 
                max="300" 
                v-model.number="settings.cannyHighThreshold"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.cannyHighThreshold }}</span>
            </label>
            <small class="setting-hint">Should be 2-3x low threshold (150 recommended)</small>
          </div>
        </div>
        
        <div class="setting-group">
          <label>
            Median Filter Size
            <input 
              type="range" 
              min="0" 
              max="9" 
              step="2"
              v-model.number="settings.medianFilterSize"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.medianFilterSize }}</span>
          </label>
        </div>
        
        <!-- Unsharp Masking -->
        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.useUnsharpMask"
              @change="updatePreview"
            />
            Use Unsharp Masking (Edge Sharpening)
          </label>
          <small class="setting-hint">Enhances edges before detection</small>
        </div>
        
        <div v-if="settings.useUnsharpMask" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Sharpening Amount
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.5"
                v-model.number="settings.unsharpAmount"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.unsharpAmount }}</span>
            </label>
          </div>
        </div>
        
        <!-- Morphological Operations -->
        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.useMorphology"
              @change="updatePreview"
            />
            Use Morphological Operations (Noise Removal)
          </label>
          <small class="setting-hint">Opening removes small noise, Closing fills small gaps</small>
        </div>
        
        <div v-if="settings.useMorphology" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Operation Type
              <select v-model="settings.morphologyOperation" @change="updatePreview">
                <option value="opening">Opening (Remove Noise)</option>
                <option value="closing">Closing (Fill Gaps)</option>
                <option value="dilate">Dilate (Thicken)</option>
                <option value="erode">Erode (Thin)</option>
              </select>
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              Iterations
              <input 
                type="range" 
                min="1" 
                max="5" 
                v-model.number="settings.morphologyIterations"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.morphologyIterations }}</span>
            </label>
          </div>
        </div>
        
        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.applySkeletonize"
              @change="updatePreview"
            />
            Apply Centerline Tracing (Skeletonize)
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Simplification Tolerance
            <input 
              type="range" 
              min="0.5" 
              max="10" 
              step="0.5"
              v-model.number="settings.simplifyTolerance"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.simplifyTolerance }}</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Smoothing Iterations
            <input 
              type="range" 
              min="0" 
              max="5" 
              v-model.number="settings.smoothIterations"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.smoothIterations }}</span>
          </label>
        </div>
        
        <!-- Bezier Curve Fitting -->
        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.useBezierFitting"
              @change="updatePreview"
            />
            Use Bezier Curve Fitting (Professional)
          </label>
          <small class="setting-hint">Creates smooth Bezier curves (like Potrace/Illustrator)</small>
        </div>
        
        <div v-if="settings.useBezierFitting" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Curve Fitting Error Tolerance
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.5"
                v-model.number="settings.bezierError"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.bezierError }}</span>
            </label>
            <small class="setting-hint">Lower = more accurate but more points</small>
          </div>
        </div>
        
        <div class="setting-group">
          <label>
            Output Scale
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1"
              v-model.number="settings.outputScale"
            />
            <span class="value">{{ settings.outputScale }}x</span>
          </label>
          <small class="setting-hint">Additional scaling factor (applied after auto-fit)</small>
        </div>
        
        <!-- Max Image Size -->
        <div class="setting-group">
          <label>
            Max Processing Size (prevents freezing)
            <input 
              type="range" 
              min="500" 
              max="2000" 
              step="100"
              v-model.number="settings.maxImageSize"
              @input="checkImageSize"
            />
            <span class="value">{{ settings.maxImageSize }}px</span>
          </label>
          <small class="setting-hint">Higher values = better quality but slower processing</small>
        </div>
      </div>
      
      <!-- Status -->
      <div v-if="status" class="status-message" :class="statusType">
        <div class="status-text">{{ status }}</div>
        <div v-if="isProcessing && progressPercent > 0" class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
      
      <!-- Image Info Warning -->
      <div v-if="imageInfo && imageInfo.willResize" class="warning-message">
        ⚠️ Large image detected ({{ imageInfo.width }}x{{ imageInfo.height }}). 
        Will be automatically resized to {{ settings.maxImageSize }}px for processing to prevent freezing.
      </div>
      
      <!-- Actions -->
      <div class="dialog-buttons">
        <button @click="applyVectorization" :disabled="!previewImage || isProcessing" class="btn btn-primary">
          {{ isProcessing ? 'Processing...' : 'Apply to Canvas' }}
        </button>
        <button @click="closeDialog" class="btn btn-secondary" :disabled="isProcessing">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { VectorizeService } from '@/services/vectorizeService.js'
import { useToastStore } from '@/stores/toast.js'

const props = defineProps({
  show: Boolean,
  imageDataUrl: String
})

const emit = defineEmits(['close'])

const drawingStore = useDrawingStore()
const toastStore = useToastStore()

const previewImage = ref(null)
const previewCanvas = ref(null)
const isProcessing = ref(false)
const status = ref('')
const statusType = ref('info')
const progressPercent = ref(0)
const imageInfo = ref(null)

const settings = ref({
  detectionMode: 'standard', // standard, adaptive, edge, canny
  threshold: 128,
  autoThreshold: true, // Enable by default for better results
  enhanceContrast: true, // Enable by default
  adaptiveBlockSize: 15,
  edgeThreshold: 30,
  medianFilterSize: 3,
  applySkeletonize: true,
  simplifyTolerance: 2.0,
  smoothIterations: 2,
  outputScale: 1.0,
  maxImageSize: 1000, // Max dimension for processing
  autoFitToCanvas: true, // Auto-fit enabled by default
  // Professional options
  useCLAHE: false,
  claheClipLimit: 2.0,
  claheTileSize: 8,
  cannyLowThreshold: 50,
  cannyHighThreshold: 150,
  useUnsharpMask: false,
  unsharpAmount: 1.5,
  unsharpRadius: 1.0,
  useMorphology: false,
  morphologyOperation: 'opening',
  morphologyIterations: 1,
  useBezierFitting: false,
  bezierError: 1.0
})

let currentPaths = []
let debounceTimer = null

watch(() => props.imageDataUrl, (newUrl) => {
  if (newUrl) {
    previewImage.value = newUrl
    
    // Check image dimensions
    const img = new Image()
    img.onload = () => {
      const maxDim = Math.max(img.width, img.height)
      imageInfo.value = {
        width: img.width,
        height: img.height,
        willResize: maxDim > settings.value.maxImageSize
      }
      
      if (imageInfo.value.willResize) {
        const scale = settings.value.maxImageSize / maxDim
        const newWidth = Math.floor(img.width * scale)
        const newHeight = Math.floor(img.height * scale)
        
        toastStore.showToast(
          `Image will be resized from ${img.width}x${img.height} to ${newWidth}x${newHeight} for processing`,
          'info',
          5000
        )
      }
      
      nextTick(() => updatePreview())
    }
    img.src = newUrl
  }
})

watch(() => props.show, (visible) => {
  if (visible && props.imageDataUrl) {
    previewImage.value = props.imageDataUrl
    
    // Check image dimensions
    const img = new Image()
    img.onload = () => {
      const maxDim = Math.max(img.width, img.height)
      imageInfo.value = {
        width: img.width,
        height: img.height,
        willResize: maxDim > settings.value.maxImageSize
      }
      nextTick(() => updatePreview())
    }
    img.src = props.imageDataUrl
  }
})

function debouncedUpdatePreview() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    updatePreview()
  }, 300)
}

async function updatePreview() {
  if (!previewImage.value || !previewCanvas.value) return
  
  try {
    isProcessing.value = true
    status.value = 'Processing...'
    statusType.value = 'info'
    progressPercent.value = 0
    
    // Prepare options based on detection mode
    const options = {
      threshold: settings.value.threshold,
      medianFilterSize: settings.value.medianFilterSize,
      applySkeletonize: settings.value.applySkeletonize,
      simplifyTolerance: settings.value.simplifyTolerance,
      smoothIterations: settings.value.smoothIterations,
      enhanceContrastFirst: settings.value.enhanceContrast,
      autoThreshold: settings.value.autoThreshold && settings.value.detectionMode === 'standard',
      useAdaptiveThreshold: settings.value.detectionMode === 'adaptive',
      useEdgeDetection: settings.value.detectionMode === 'edge',
      adaptiveBlockSize: settings.value.adaptiveBlockSize,
      edgeThreshold: settings.value.edgeThreshold,
      maxImageSize: settings.value.maxImageSize,
      // Professional options
      useCLAHE: settings.value.useCLAHE,
      claheClipLimit: settings.value.claheClipLimit,
      claheTileSize: settings.value.claheTileSize,
      useCanny: settings.value.detectionMode === 'canny',
      cannyLowThreshold: settings.value.cannyLowThreshold,
      cannyHighThreshold: settings.value.cannyHighThreshold,
      useUnsharpMask: settings.value.useUnsharpMask,
      unsharpAmount: settings.value.unsharpAmount,
      unsharpRadius: settings.value.unsharpRadius,
      useMorphology: settings.value.useMorphology,
      morphologyOperation: settings.value.morphologyOperation,
      morphologyIterations: settings.value.morphologyIterations,
      useBezierFitting: settings.value.useBezierFitting,
      bezierError: settings.value.bezierError,
      onProgress: (message, percent) => {
        status.value = message
        progressPercent.value = percent
      }
    }
    
    const paths = await VectorizeService.processImage(
      previewImage.value,
      options
    )
    
    currentPaths = paths
    
    // Draw preview with or without auto-fit
    await drawPreview(paths)
    
    const totalPoints = paths.reduce((sum, path) => sum + path.length, 0)
    const modeText = {
      standard: settings.value.autoThreshold ? 'Auto-Threshold' : 'Manual Threshold',
      adaptive: 'Adaptive Threshold',
      edge: 'Edge Detection',
      canny: 'Canny Edge Detection'
    }[settings.value.detectionMode]
    
    status.value = `Preview generated (${modeText}): ${paths.length} paths, ${totalPoints} points`
    statusType.value = 'success'
    
  } catch (error) {
    console.error('Vectorization preview error:', error)
    status.value = `Error: ${error.message}`
    statusType.value = 'error'
  } finally {
    isProcessing.value = false
  }
}

async function drawPreview(paths) {
  const canvas = previewCanvas.value
  const ctx = canvas.getContext('2d')
  
  // Set canvas size to a fixed preview size
  canvas.width = 400
  canvas.height = 400
  
  // Draw grid background
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 0.5
  const gridSize = 20
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  
  if (paths.length === 0) return
  
  if (settings.value.autoFitToCanvas) {
    // Calculate bounds
    const bounds = VectorizeService.calculateBounds(paths)
    if (!bounds) return
    
    // Calculate auto-fit transformation
    const margin = 0.9
    const scaleX = (canvas.width * margin) / bounds.width
    const scaleY = (canvas.height * margin) / bounds.height
    const autoScale = Math.min(scaleX, scaleY)
    
    const scaledWidth = bounds.width * autoScale
    const scaledHeight = bounds.height * autoScale
    const offsetX = (canvas.width - scaledWidth) / 2
    const offsetY = (canvas.height - scaledHeight) / 2
    
    // Draw paths with auto-fit
    ctx.strokeStyle = '#7a0081'
    ctx.lineWidth = 2
    
    for (const path of paths) {
      if (path.length < 2) continue
      
      ctx.beginPath()
      const [x0, y0] = path[0]
      ctx.moveTo(
        ((x0 - bounds.minX) * autoScale) + offsetX,
        ((y0 - bounds.minY) * autoScale) + offsetY
      )
      
      for (let i = 1; i < path.length; i++) {
        const [x, y] = path[i]
        ctx.lineTo(
          ((x - bounds.minX) * autoScale) + offsetX,
          ((y - bounds.minY) * autoScale) + offsetY
        )
      }
      
      ctx.stroke()
    }
    
    // Draw bounding box
    ctx.strokeStyle = '#ff9800'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.strokeRect(offsetX, offsetY, scaledWidth, scaledHeight)
    ctx.setLineDash([])
    
  } else {
    // Draw without auto-fit (original scale, might be clipped)
    ctx.strokeStyle = '#7a0081'
    ctx.lineWidth = 2
    
    for (const path of paths) {
      if (path.length < 2) continue
      
      ctx.beginPath()
      ctx.moveTo(path[0][0], path[0][1])
      
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1])
      }
      
      ctx.stroke()
    }
  }
}

async function applyVectorization() {
  if (!currentPaths || currentPaths.length === 0) {
    toastStore.showError('No vectorized paths to apply')
    return
  }
  
  try {
    isProcessing.value = true
    status.value = 'Converting to stitches...'
    
    // Get canvas dimensions from drawing store
    const canvasWidth = drawingStore.shepherd.maxX
    const canvasHeight = drawingStore.shepherd.maxY
    
    console.log('Applying vectorization with settings:', {
      autoFit: settings.value.autoFitToCanvas,
      outputScale: settings.value.outputScale,
      canvas: { width: canvasWidth, height: canvasHeight },
      pathCount: currentPaths.length
    })
    
    const stitches = VectorizeService.convertPathsToStitches(
      currentPaths,
      settings.value.outputScale,
      canvasWidth,
      canvasHeight,
      settings.value.autoFitToCanvas
    )
    
    console.log('Generated stitches:', stitches.length)
    
    // Clear existing drawing and add vectorized stitches
    drawingStore.clear()
    
    for (const stitch of stitches) {
      drawingStore.addLine(
        stitch.x1,
        stitch.y1,
        stitch.x2,
        stitch.y2,
        stitch.penDown
      )
    }
    
    const message = settings.value.autoFitToCanvas 
      ? 'Vectorization applied and auto-fitted to canvas!' 
      : 'Vectorization applied successfully!'
    
    toastStore.showToast(message, 'success')
    emit('close')
    
  } catch (error) {
    console.error('Apply vectorization error:', error)
    toastStore.showError(`Failed to apply: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}

function closeDialog() {
  if (!isProcessing.value) {
    emit('close')
  }
}

function checkImageSize() {
  if (imageInfo.value) {
    const maxDim = Math.max(imageInfo.value.width, imageInfo.value.height)
    imageInfo.value.willResize = maxDim > settings.value.maxImageSize
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.vectorize-dialog {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.vectorize-dialog h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.preview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.preview-box {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  background: #f9f9f9;
}

.preview-box h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
}

.preview-box img,
.preview-canvas {
  width: 100%;
  height: 250px;
  object-fit: contain;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 5rem 1rem;
  color: #999;
  font-style: italic;
}

.settings-section {
  border-top: 1px solid #ddd;
  padding-top: 1rem;
  margin-bottom: 1rem;
}

.settings-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}

.setting-group {
  margin-bottom: 1rem;
}

.setting-subgroup {
  margin-left: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid #e0e0e0;
}

.setting-subgroup .setting-group {
  margin-bottom: 0.75rem;
}

.setting-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333;
  font-size: 0.9rem;
}

.setting-group input[type="range"],
.setting-group select {
  flex: 1;
}

.setting-group select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
}

.setting-group select:focus {
  outline: none;
  border-color: #7a0081;
}

.setting-group .value {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: #7a0081;
}

.setting-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #666;
  font-style: italic;
}

.highlight-setting {
  background: #f0f8ff;
  padding: 0.75rem;
  border-radius: 4px;
  border: 2px solid #7a0081;
  margin-bottom: 1.5rem !important;
}

.highlight-setting label {
  font-weight: 600;
  color: #7a0081;
}

.status-message {
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.status-text {
  margin-bottom: 0.5rem;
}

.progress-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7a0081, #b000b8);
  transition: width 0.3s ease;
}

.status-message.info {
  background: #e3f2fd;
  color: #1976d2;
}

.status-message.success {
  background: #e8f5e9;
  color: #388e3c;
}

.status-message.error {
  background: #ffebee;
  color: #d32f2f;
}

.warning-message {
  padding: 0.75rem;
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  line-height: 1.4;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #7a0081;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5a0061;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}
</style>

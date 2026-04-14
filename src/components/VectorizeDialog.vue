<template>
  <div v-if="show" class="dialog-overlay" @click="closeDialog">
    <div class="vectorize-dialog" @click.stop>
      <h3>Image Vectorization</h3>
      
      <div class="workspace-layout">
        <!-- Preview Section -->
        <div class="preview-section">
          <div class="preview-box">
            <h4>Original</h4>
            <img v-if="previewImage" :src="previewImage" alt="Original" class="preview-media" :style="previewSurfaceStyle" />
            <p v-else class="empty-state">No image loaded</p>
          </div>
          
          <div class="preview-box">
            <h4>Vectorized Preview {{ settings.autoFitToCanvas ? '(Auto-Fit)' : '' }}</h4>
            <canvas ref="previewCanvas" class="preview-canvas preview-media" :style="previewSurfaceStyle"></canvas>
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

        <div class="setting-group highlight-setting">
          <label>
            <input
              type="checkbox"
              v-model="settings.autoTuneForSource"
              @change="updatePreview"
            />
            Auto-Tune for Source Type
          </label>
          <small class="setting-hint">When enabled, source-aware defaults are applied automatically. Disable to manually tune extraction parameters.</small>
        </div>

        <template v-if="!settings.autoTuneForSource">
        
        <!-- Detection Mode -->
        <div class="setting-group">
          <label>
            Detection Mode
            <select v-model="settings.detectionMode" @change="updatePreview">
              <option value="standard">Standard</option>
              <option value="adaptive">Adaptive</option>
              <option value="canny">Advanced Edge Detection</option>
            </select>
          </label>
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
            Enhance Contrast
          </label>
        </div>
        
        <!-- Advanced Contrast Enhancement -->
        <div v-if="settings.enhanceContrast" class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.useCLAHE"
              @change="updatePreview"
            />
            Advanced Contrast Enhancement
          </label>
          <small class="setting-hint">Better for images with low contrast</small>
        </div>
        
        <!-- CLAHE Settings -->
        <div v-if="settings.enhanceContrast && settings.useCLAHE" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Contrast Strength
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
            <small class="setting-hint">Higher = stronger contrast (2.0 recommended)</small>
          </div>
          
          <div class="setting-group">
            <label>
              Detail Level
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
            <small class="setting-hint">Lower = more detail (8 recommended)</small>
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
        
        <!-- Canny Thresholds -->
        <div v-if="settings.detectionMode === 'canny'" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Low Threshold
              <input 
                type="range" 
                min="10" 
                max="150" 
                v-model.number="settings.cannyLowThreshold"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.cannyLowThreshold }}</span>
            </label>
            <small class="setting-hint">Lower = more edges detected</small>
          </div>
          
          <div class="setting-group">
            <label>
              High Threshold
              <input 
                type="range" 
                min="50" 
                max="300" 
                v-model.number="settings.cannyHighThreshold"
                @input="debouncedUpdatePreview"
              />
              <span class="value">{{ settings.cannyHighThreshold }}</span>
            </label>
            <small class="setting-hint">Should be 2-3x low threshold</small>
          </div>
        </div>
        
        <div class="setting-group">
          <label>
            Noise Filter
            <input 
              type="range" 
              min="1"
              max="5"
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
            Sharpen Edges
          </label>
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
            Noise Removal
          </label>
          <small class="setting-hint">Cleans up small artifacts</small>
        </div>
        
        <div v-if="settings.useMorphology" class="setting-subgroup">
          <div class="setting-group">
            <label>
              Operation
              <select v-model="settings.morphologyOperation" @change="updatePreview">
                <option value="opening">Remove Noise</option>
                <option value="closing">Fill Gaps</option>
                <option value="dilate">Thicken Lines</option>
                <option value="erode">Thin Lines</option>
              </select>
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              Strength
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
            Trace Centerlines
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Simplification
            <input 
              type="range" 
              min="0.8"
              max="5"
              step="0.2"
              v-model.number="settings.simplifyTolerance"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.simplifyTolerance }}</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Smoothing
            <input 
              type="range" 
              min="0" 
              max="3" 
              v-model.number="settings.smoothIterations"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.smoothIterations }}</span>
          </label>
        </div>
        </template>
        
        <div class="setting-group">
          <label>
            Output Scale
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1"
              v-model.number="settings.outputScale"
              @input="debouncedUpdatePreview"
            />
            <span class="value">{{ settings.outputScale }}x</span>
          </label>
        </div>
        
        <!-- Max Image Size -->
        <div class="setting-group">
          <label>
            Max Image Size
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
          <small class="setting-hint">Higher = better quality but slower</small>
        </div>
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
        ⚠️ Large image ({{ imageInfo.width }}x{{ imageInfo.height }}). 
        Will be resized to {{ settings.maxImageSize }}px for processing.
      </div>
      
      <!-- Actions -->
      <div class="dialog-buttons">
        <button @click="saveVectorization" :disabled="!previewImage || isProcessing" class="btn btn-primary">
          {{ isProcessing ? 'Processing...' : 'Save Vectorization' }}
        </button>
        <button @click="closeDialog" class="btn btn-secondary" :disabled="isProcessing">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { VectorizeService } from '@/services/vectorizeService.js'
import { useToastStore } from '@/stores/toast.js'
import { buildAutoVectorizationProfile } from '@/utils/vectorizeUtils.js'

const props = defineProps({
  show: Boolean,
  imageDataUrl: String,
  initialSettings: Object
})

const emit = defineEmits(['close', 'vectorization-complete', 'settings-changed'])

const drawingStore = useDrawingStore()
const toastStore = useToastStore()

const previewImage = ref(null)
const previewCanvas = ref(null)
const isProcessing = ref(false)
const status = ref('')
const statusType = ref('info')
const progressPercent = ref(0)
const imageInfo = ref(null)

const previewDimensions = computed(() => {
  const paper = drawingStore.paperPx
  const width = Number.isFinite(paper?.w) && paper.w > 0 ? paper.w : 400
  const height = Number.isFinite(paper?.h) && paper.h > 0 ? paper.h : 300
  return { width, height }
})

const previewSurfaceStyle = computed(() => ({
  aspectRatio: `${previewDimensions.value.width} / ${previewDimensions.value.height}`,
}))

const defaultSettings = {
  detectionMode: 'canny',
  threshold: 128,
  autoThreshold: true,
  enhanceContrast: true,
  adaptiveBlockSize: 15,
  medianFilterSize: 1,
  applySkeletonize: true,
  simplifyTolerance: 1.6,
  smoothIterations: 1,
  outputScale: 1.0,
  maxImageSize: 1000,
  autoFitToCanvas: true,
  useCLAHE: true,
  claheClipLimit: 2.0,
  claheTileSize: 8,
  cannyLowThreshold: 50,
  cannyHighThreshold: 150,
  useUnsharpMask: true,
  unsharpAmount: 1.5,
  unsharpRadius: 1.0,
  useMorphology: true,
  morphologyOperation: 'opening',
  morphologyIterations: 1,
  sourceType: 'image',
  autoTuneForSource: true
}

const settings = ref({ ...defaultSettings })

let currentPaths = []
let debounceTimer = null

async function buildRecommendedProfileForCurrentImage() {
  if (!previewImage.value) return null

  const img = new Image()
  img.src = previewImage.value
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('Failed to load image for auto profile'))
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return buildAutoVectorizationProfile(imageData, settings.value.sourceType || 'image')
}

function applyProfileToManualSettings(profile) {
  if (!profile) return

  const nextDetectionMode = profile.useCanny
    ? 'canny'
    : (profile.useAdaptiveThreshold ? 'adaptive' : 'standard')

  settings.value = {
    ...settings.value,
    detectionMode: nextDetectionMode,
    threshold: profile.threshold ?? settings.value.threshold,
    autoThreshold: profile.autoThreshold ?? settings.value.autoThreshold,
    enhanceContrast: profile.enhanceContrastFirst ?? settings.value.enhanceContrast,
    adaptiveBlockSize: profile.adaptiveBlockSize ?? settings.value.adaptiveBlockSize,
    medianFilterSize: profile.medianFilterSize ?? settings.value.medianFilterSize,
    applySkeletonize: profile.applySkeletonize ?? settings.value.applySkeletonize,
    simplifyTolerance: profile.simplifyTolerance ?? settings.value.simplifyTolerance,
    smoothIterations: profile.smoothIterations ?? settings.value.smoothIterations,
    useCLAHE: profile.useCLAHE ?? settings.value.useCLAHE,
    claheClipLimit: profile.claheClipLimit ?? settings.value.claheClipLimit,
    claheTileSize: profile.claheTileSize ?? settings.value.claheTileSize,
    cannyLowThreshold: profile.cannyLowThreshold ?? settings.value.cannyLowThreshold,
    cannyHighThreshold: profile.cannyHighThreshold ?? settings.value.cannyHighThreshold,
    useUnsharpMask: profile.useUnsharpMask ?? settings.value.useUnsharpMask,
    unsharpAmount: profile.unsharpAmount ?? settings.value.unsharpAmount,
    useMorphology: profile.useMorphology ?? settings.value.useMorphology,
    morphologyOperation: profile.morphologyOperation ?? settings.value.morphologyOperation,
    morphologyIterations: profile.morphologyIterations ?? settings.value.morphologyIterations,
  }
}

// Watch for initial settings changes
watch(() => props.initialSettings, (newSettings) => {
  if (newSettings) {
    console.log('Loading saved settings:', newSettings)
    const merged = { ...defaultSettings, ...newSettings }
    if (merged.detectionMode === 'edge') {
      merged.detectionMode = 'canny'
    }
    if (!newSettings.detectionMode && merged.autoTuneForSource) {
      merged.detectionMode = (merged.sourceType === 'pdf' || merged.sourceType === 'svg') ? 'canny' : 'adaptive'
    }
    settings.value = merged
    
    if (previewImage.value) {
      nextTick(() => updatePreview())
    }
  } else {
    // Reset to defaults for new image
    settings.value = { ...defaultSettings }
  }
}, { immediate: true })

// Watch settings and emit changes (debounced)
watch(settings, (newSettings) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('settings-changed', { ...newSettings })
  }, 1000)
}, { deep: true })

watch(
  () => settings.value.autoTuneForSource,
  async (enabled, prevEnabled) => {
    if (prevEnabled === undefined) return
    if (enabled || !previewImage.value) return

    try {
      const profile = await buildRecommendedProfileForCurrentImage()
      applyProfileToManualSettings(profile)
    } catch (error) {
      console.warn('Could not preserve auto-tuned settings for manual mode:', error)
    }

    nextTick(() => updatePreview())
  }
)

watch(() => props.imageDataUrl, (newUrl) => {
  if (newUrl) {
    if (!props.initialSettings) {
      settings.value = {
        ...defaultSettings,
        sourceType: 'image',
        autoTuneForSource: true,
        detectionMode: 'adaptive',
      }
    }

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
      adaptiveBlockSize: settings.value.adaptiveBlockSize,
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
      sourceType: settings.value.sourceType || 'image',
      autoTuneForSource: settings.value.autoTuneForSource !== false,
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
    status.value = `Preview generated: ${paths.length} paths, ${totalPoints} points`
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
  const { width, height } = previewDimensions.value
  const rect = canvas.getBoundingClientRect()
  const cssWidth = Math.max(1, Math.round(rect.width || width))
  const cssHeight = Math.max(1, Math.round(rect.height || height))
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)
  
  // Render the preview at high DPI to avoid blurry/pixelated output.
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio))
  canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio))
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  
  // Draw grid background
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, cssWidth, cssHeight)
  
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 0.5
  const gridSize = 20
  for (let x = 0; x <= cssWidth; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, cssHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= cssHeight; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(cssWidth, y)
    ctx.stroke()
  }
  
  if (paths.length === 0) return
  
  if (settings.value.autoFitToCanvas) {
    // Calculate bounds
    const bounds = VectorizeService.calculateBounds(paths)
    if (!bounds) return
    
    // Calculate auto-fit transformation
    const margin = 0.9
    const scaleX = (cssWidth * margin) / bounds.width
    const scaleY = (cssHeight * margin) / bounds.height
    const autoScale = Math.min(scaleX, scaleY)
    const outputScale = Number.isFinite(settings.value.outputScale) ? settings.value.outputScale : 1
    const previewScale = autoScale * outputScale
    
    const scaledWidth = bounds.width * previewScale
    const scaledHeight = bounds.height * previewScale
    const offsetX = (cssWidth - scaledWidth) / 2
    const offsetY = (cssHeight - scaledHeight) / 2
    
    // Draw paths with auto-fit
    ctx.strokeStyle = '#7a0081'
    ctx.lineWidth = 2
    
    for (const path of paths) {
      if (path.length < 2) continue
      
      ctx.beginPath()
      const [x0, y0] = path[0]
      ctx.moveTo(
        ((x0 - bounds.minX) * previewScale) + offsetX,
        ((y0 - bounds.minY) * previewScale) + offsetY
      )
      
      for (let i = 1; i < path.length; i++) {
        const [x, y] = path[i]
        ctx.lineTo(
          ((x - bounds.minX) * previewScale) + offsetX,
          ((y - bounds.minY) * previewScale) + offsetY
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
    const outputScale = Number.isFinite(settings.value.outputScale) ? settings.value.outputScale : 1

    const bounds = VectorizeService.calculateBounds(paths)
    if (!bounds) return
    const centerX = cssWidth / 2
    const centerY = cssHeight / 2
    const drawingCenterX = bounds.minX + (bounds.width / 2)
    const drawingCenterY = bounds.minY + (bounds.height / 2)
    
    for (const path of paths) {
      if (path.length < 2) continue
      
      ctx.beginPath()
      ctx.moveTo(
        ((path[0][0] - drawingCenterX) * outputScale) + centerX,
        ((path[0][1] - drawingCenterY) * outputScale) + centerY
      )
      
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(
          ((path[i][0] - drawingCenterX) * outputScale) + centerX,
          ((path[i][1] - drawingCenterY) * outputScale) + centerY
        )
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
    
    // Save vectorization info before closing
    drawingStore.setLastVectorization(props.imageDataUrl, settings.value)
    
    const message = settings.value.autoFitToCanvas 
      ? 'Vectorization applied and auto-fitted to canvas!' 
      : 'Vectorization applied successfully!'
    
    toastStore.showToast(message, 'success')
    
    // Close VectorizeDialog and signal completion to parent ImportDialog
    emit('close')
    emit('vectorization-complete')
    
  } catch (error) {
    console.error('Apply vectorization error:', error)
    toastStore.showError(`Failed to apply: ${error.message}`)
  } finally {
    isProcessing.value = false
  }
}

// NEW: Save vectorization without applying to canvas
async function saveVectorization() {
  if (!currentPaths || currentPaths.length === 0) {
    toastStore.showError('No vectorized paths to save')
    return
  }
  
  try {
    isProcessing.value = true
    status.value = 'Saving vectorization...'
    
    // Get canvas dimensions for metadata
    const canvasWidth = drawingStore.shepherd.maxX
    const canvasHeight = drawingStore.shepherd.maxY
    
    // Calculate bounds for metadata
    const bounds = VectorizeService.calculateBounds(currentPaths)
    
    // Save paths to store (not as stitches yet!)
    const metadata = {
      autoFit: settings.value.autoFitToCanvas,
      outputScale: settings.value.outputScale,
      canvas: { width: canvasWidth, height: canvasHeight },
      bounds,
      pathCount: currentPaths.length,
      settings: { ...settings.value }
    }
    
    drawingStore.setVectorizedPaths(currentPaths, metadata)
    
    // Save vectorization info for re-use
    drawingStore.setLastVectorization(props.imageDataUrl, settings.value)
    
    console.log('✅ Vectorization saved:', {
      pathCount: currentPaths.length,
      metadata
    })
    
    toastStore.showToast('Vectorization saved! Configure stitching next.', 'success')
    
    // Signal that vectorization is complete (parent will show stitch dialog)
    emit('vectorization-complete', {
      pathCount: currentPaths.length,
      metadata
    })
    emit('close')
    
  } catch (error) {
    console.error('Save vectorization error:', error)
    toastStore.showError(`Failed to save: ${error.message}`)
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
  width: clamp(1100px, 96vw, 1600px);
  max-width: calc(100vw - 1rem);
  max-height: 95vh;
  overflow-y: auto;
  scrollbar-gutter: stable;
  box-sizing: border-box;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.vectorize-dialog h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.workspace-layout {
  display: grid;
  grid-template-columns: minmax(520px, 1.2fr) minmax(360px, 1fr);
  gap: 1.25rem;
  align-items: start;
  margin-bottom: 1rem;
}

.preview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

.preview-media {
  width: 100%;
  height: auto;
  display: block;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.preview-box img {
  object-fit: contain;
}

@media (max-width: 1200px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .vectorize-dialog {
    width: calc(100vw - 1rem);
    padding: 1rem;
    max-height: 94vh;
  }

  .preview-section {
    grid-template-columns: 1fr;
  }
}

.empty-state {
  text-align: center;
  padding: 5rem 1rem;
  color: #999;
  font-style: italic;
}

.settings-section {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  max-height: 68vh;
  overflow-y: auto;
  scrollbar-gutter: stable;
  background: #fcfcfc;
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

.setting-group input[type="range"] {
  accent-color: #8f8f8f;
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

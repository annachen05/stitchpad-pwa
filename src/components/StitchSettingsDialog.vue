<template>
  <div v-if="show" class="dialog-overlay" @click="closeDialog">
    <div class="stitch-settings-dialog" @click.stop>
      <h3>🧵 Stitch Configuration</h3>
      
      <div class="info-banner">
        <div class="info-icon">ℹ️</div>
        <div class="info-text">
          <strong>Vectorization Complete!</strong>
          <p>{{ pathCount }} paths detected. Now configure how they should be stitched.</p>
        </div>
      </div>

      <!-- Stitch Warning (NEW) -->
      <div v-if="stitchWarning" class="warning-banner">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">{{ stitchWarning }}</div>
      </div>

      <!-- Stitch Settings -->
      <div class="settings-section">
        <!-- Stitch Type -->
        <div class="setting-group">
          <label>
            <strong>Stitch Type</strong>
            <select v-model="settings.stitchType" @change="updatePreview">
              <option value="running">Running Stitch (Line)</option>
              <option value="satin" disabled>Satin Stitch (Solid) - Coming Soon</option>
              <option value="fill" disabled>Fill Stitch (Area) - Coming Soon</option>
            </select>
          </label>
          <small class="setting-hint">Running stitch follows the vectorized paths</small>
        </div>

        <!-- Stitch Length -->
        <div class="setting-group">
          <label>
            <strong>Stitch Length: {{ settings.stitchLength }}mm</strong>
            <input 
              type="range" 
              min="2" 
              max="5" 
              step="0.5"
              v-model.number="settings.stitchLength"
              @input="updatePreview"
            />
          </label>
          <small class="setting-hint">
            Distance between stitches. Longer = fewer stitches, faster embroidery.
            <br>
            <strong>Recommended: 3-4mm for most fabrics</strong>
          </small>
        </div>

        <!-- Scale -->
        <div class="setting-group">
          <label>
            <strong>Scale: {{ (settings.scale * 100).toFixed(0) }}%</strong>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1"
              v-model.number="settings.scale"
              @input="updatePreview"
            />
          </label>
          <small class="setting-hint">Resize the design</small>
        </div>

        <!-- Path Optimization -->
        <div class="setting-group highlight-setting">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.optimizePaths"
            />
            <strong>Optimize Stitch Paths</strong>
          </label>
          <small class="setting-hint">Reduce jump stitches by reordering paths (recommended)</small>
        </div>
      </div>

      <!-- Preview Statistics -->
      <div class="stats-section">
        <h4>Preview Statistics</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Paths</div>
            <div class="stat-value">{{ pathCount }}</div>
          </div>
          <div class="stat-item" :class="{ 'stat-warning': estimatedStitches > 5000 }">
            <div class="stat-label">Est. Stitches</div>
            <div class="stat-value">{{ estimatedStitches.toLocaleString() }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Stitch Length</div>
            <div class="stat-value">{{ settings.stitchLength }}mm</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Optimization</div>
            <div class="stat-value">{{ settings.optimizePaths ? 'ON' : 'OFF' }}</div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-buttons">
        <button @click="applyStitchSettings" class="btn btn-primary">
          ✅ Apply to Canvas
        </button>
        <button @click="closeDialog" class="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { useToastStore } from '@/stores/toast.js'

const props = defineProps({
  show: Boolean,
  pathCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'apply'])

const drawingStore = useDrawingStore()
const toastStore = useToastStore()

const settings = ref({
  stitchType: 'running',
  stitchLength: 3.0,
  scale: 1.0,
  optimizePaths: true
})

// Calculate estimated stitches based on ACTUAL path lengths and stitch length
const estimatedStitches = computed(() => {
  // Get vectorized paths from store
  const paths = drawingStore.vectorizedPaths
  if (!paths || paths.length === 0) return 0

  let totalDistance = 0

  // Calculate total path length
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = path[i]
      const [x2, y2] = path[i + 1]
      const dx = (x2 - x1) * settings.value.scale
      const dy = (y2 - y1) * settings.value.scale
      const distance = Math.sqrt(dx * dx + dy * dy)
      totalDistance += distance
    }
  }

  // Calculate number of stitches based on stitch length
  const stitchCount = Math.ceil(totalDistance / settings.value.stitchLength)
  
  console.log('📊 Stitch estimation:', {
    totalDistance: totalDistance.toFixed(2),
    stitchLength: settings.value.stitchLength,
    estimatedStitches: stitchCount
  })

  return stitchCount
})

// Add warning if too many stitches
const stitchWarning = computed(() => {
  const count = estimatedStitches.value
  if (count > 5000) {
    return 'Caution: High stitch count may take longer to embroider.'
  }
  return null
})

function updatePreview() {
  console.log('Stitch settings updated:', settings.value)
  console.log('Estimated stitches:', estimatedStitches.value)
}

function applyStitchSettings() {
  console.log('Applying stitch settings:', settings.value)
  
  // Set path optimization preference in store
  drawingStore.setPathOptimization(settings.value.optimizePaths)
  
  // Apply vectorized paths with these settings
  drawingStore.applyVectorizedPathsAsStitches(settings.value)
  
  const actualStitches = drawingStore.shepherd.steps.length
  toastStore.showToast(`${actualStitches} stitches applied to canvas!`, 'success')
  
  emit('apply', settings.value)
  emit('close')
}

function closeDialog() {
  emit('close')
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
  z-index: 1002;
}

.stitch-settings-dialog {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.stitch-settings-dialog h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.5rem;
}

.info-banner {
  display: flex;
  gap: 1rem;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #7a0081;
}

.info-icon {
  font-size: 2rem;
}

.info-text strong {
  display: block;
  color: #7a0081;
  margin-bottom: 0.25rem;
}

.info-text p {
  margin: 0;
  color: #555;
  font-size: 0.9rem;
}

.warning-banner {
  display: flex;
  gap: 1rem;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #ff9800;
}

.warning-icon {
  font-size: 2rem;
}

.warning-text {
  color: #e65100;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.settings-section {
  margin-bottom: 1.5rem;
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.setting-group label strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
}

.setting-group select,
.setting-group input[type="range"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.setting-group input[type="range"] {
  padding: 0;
  cursor: pointer;
}

.setting-group input[type="checkbox"] {
  margin-right: 0.5rem;
  transform: scale(1.2);
  cursor: pointer;
}

.setting-hint {
  display: block;
  color: #666;
  font-size: 0.85rem;
  font-style: italic;
  margin-top: 0.25rem;
}

.highlight-setting {
  background: #f0f8ff;
  padding: 1rem;
  border-radius: 6px;
  border: 2px solid #7a0081;
}

.highlight-setting label {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stats-section {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.stats-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #7a0081;
}

.stat-warning {
  border-color: #ff9800 !important;
  background: #fff3e0 !important;
}

.stat-warning .stat-value {
  color: #ff9800 !important;
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
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .dialog-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>

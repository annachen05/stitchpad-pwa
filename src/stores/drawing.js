import { defineStore } from 'pinia'
import { TurtleShepherd } from '@/lib/app.js'
import { ExportService } from '@/services/exportService.js'
import { MACHINE_CONFIG } from '@/config/machine.js'
import { optimizeStitchPaths, analyzeStitches } from '@/utils/pathOptimizer.js'

// Default view scale (used on initial load/reset). Increased by ~20%.
const DEFAULT_VIEW_SCALE = 1.08

export const useDrawingStore = defineStore('drawing', {
  state: () => ({
    shepherd: new TurtleShepherd(MACHINE_CONFIG.maxX, MACHINE_CONFIG.maxY),
    scale: DEFAULT_VIEW_SCALE,
    // Viewport transform (for cursor-centered zoom / future pan)
    panX: 0,
    panY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    // When true, UI should recenter the viewport to its default centered position
    needsRecenter: true,
    backgroundImage: null,
    backgroundScale: 1,
    stitchType: 'running',
    lastVectorizedImage: null,
    lastVectorizeSettings: null,
    optimizePathsEnabled: true, // New: Path optimization toggle
    // Separation of vectorization and stitching
    vectorizedPaths: null, // Stores raw vectorized paths (not stitches yet)
    vectorizationMetadata: null, // Stores bounds, scale info, etc.
  }),

  getters: {
    scaleAwareDistances: (state) => {
      const BASE_DIST_MIN = 8
      const BASE_DIST_MAX = 12
      return {
        dist_min: BASE_DIST_MIN / state.scale,
        dist_max: BASE_DIST_MAX / state.scale,
      }
    },

    scaleAwareLineWidth: (state) => (isPenDown) => {
      const baseWidth = isPenDown ? 2 : 1
      return baseWidth / state.scale
    },

    scaleAwareDotRadius: (state) => {
      return 2 / state.scale
    },

    scaledBackgroundImage: (state) => {
      if (!state.backgroundImage) return null
      return {
        url: state.backgroundImage,
        scale: state.backgroundScale,
      }
    },
  },

  actions: {
    // Viewport helpers
    setPan(x, y) {
      const nx = Number.isFinite(x) ? x : 0
      const ny = Number.isFinite(y) ? y : 0
      this.panX = nx
      this.panY = ny
      this.needsRecenter = false
    },

    ackRecenter() {
      this.needsRecenter = false
    },

    setViewportSize(width, height) {
      const w = Number.isFinite(width) ? Math.max(0, width) : 0
      const h = Number.isFinite(height) ? Math.max(0, height) : 0
      this.viewportWidth = w
      this.viewportHeight = h
    },

    // Zoom around an anchor point in SVG-local coordinates
    zoomAt(anchorX, anchorY, factor) {
      if (!Number.isFinite(factor) || factor === 0) return

      const oldScale = this.scale
      const nextScale = Math.max(0.2, Math.min(oldScale * factor, 5))
      if (nextScale === oldScale) return

      const k = nextScale / oldScale
      const ax = Number.isFinite(anchorX) ? anchorX : (this.viewportWidth || 0) / 2
      const ay = Number.isFinite(anchorY) ? anchorY : (this.viewportHeight || 0) / 2

      // Keep world point under (ax, ay) stable: newPan = a - (a - oldPan) * k
      this.panX = ax - (ax - this.panX) * k
      this.panY = ay - (ay - this.panY) * k
      this.scale = nextScale
      this.needsRecenter = false
    },

    zoomAtCenter(factor) {
      const cx = (this.viewportWidth || 0) / 2
      const cy = (this.viewportHeight || 0) / 2
      // If viewport size is unknown, fall back to plain scale change
      if (!cx && !cy) {
        this.setScale(this.scale * factor)
        return
      }
      this.zoomAt(cx, cy, factor)
    },

    resetView() {
      this.scale = DEFAULT_VIEW_SCALE
      this.panX = 0
      this.panY = 0
      this.needsRecenter = true
    },

    // Drawing actions
    clear() {
      this.shepherd.clear()
      // Reset the drawing state completely
      this.resetView()
      this.backgroundImage = null
      this.backgroundScale = 1
    },

    undo() {
      this.shepherd.undoStep()
      if (this.shepherd.steps.length > 0) {
        const lastStep = this.shepherd.steps[this.shepherd.steps.length - 1]
        this.shepherd.currentX = lastStep.x2
        this.shepherd.currentY = lastStep.y2
      } else {
        this.shepherd.currentX = 0
        this.shepherd.currentY = 0
      }
    },

    addLine(x1, y1, x2, y2, penDown) {
      this.shepherd.moveTo(x1, y1, x2, y2, penDown)
    },
 
    addPoint(x, y) {
      this.shepherd.addPoint(x, y)
    },

    eraseStitchesInRadius(x, y, radius) {
      const originalCount = this.shepherd.steps.length
      
      this.shepherd.steps = this.shepherd.steps.filter(step => {
        const distStart = Math.sqrt(
          Math.pow(step.x1 - x, 2) + Math.pow(step.y1 - y, 2)
        )
        const distEnd = Math.sqrt(
          Math.pow(step.x2 - x, 2) + Math.pow(step.y2 - y, 2)
        )
        
        return distStart > radius && distEnd > radius
      })

      const deletedCount = originalCount - this.shepherd.steps.length
      
      if (this.shepherd.steps.length > 0) {
        this.shepherd.maxX = Math.max(...this.shepherd.steps.map((s) => Math.max(s.x1, s.x2)))
        this.shepherd.maxY = Math.max(...this.shepherd.steps.map((s) => Math.max(s.y1, s.y2)))
      } else {
        this.shepherd.maxX = 0
        this.shepherd.maxY = 0
      }

      return deletedCount
    },

    // Export actions with path optimization
    async exportDST(name = 'design') {
      const shepherd = this.getOptimizedShepherd()
      await ExportService.exportDST(shepherd, name)
    },

    async exportEXP(name = 'design') {
      const shepherd = this.getOptimizedShepherd()
      await ExportService.exportEXP(shepherd, name)
    },

    async exportSVG(name = 'design') {
      const shepherd = this.getOptimizedShepherd()
      await ExportService.exportSVG(shepherd, name)
    },

    async exportGCode(name = 'design') {
      const steps = this.optimizePathsEnabled 
        ? optimizeStitchPaths(this.shepherd.steps)
        : this.shepherd.steps
      await ExportService.exportGCode(steps, name)
    },

    // Helper to get shepherd with optimized paths if enabled
    getOptimizedShepherd() {
      if (this.optimizePathsEnabled) {
        const optimizedSteps = optimizeStitchPaths(this.shepherd.steps)
        return { ...this.shepherd, steps: optimizedSteps }
      }
      return this.shepherd
    },

    // Toggle path optimization
    setPathOptimization(enabled) {
      this.optimizePathsEnabled = enabled
      console.log(`Path optimization ${enabled ? 'enabled' : 'disabled'}`)
    },

    // Get optimization statistics
    getOptimizationStats() {
      if (this.shepherd.steps.length === 0) {
        return null
      }
      
      const originalStats = analyzeStitches(this.shepherd.steps)
      const optimizedSteps = optimizeStitchPaths(this.shepherd.steps)
      const optimizedStats = analyzeStitches(optimizedSteps)
      
      return {
        original: originalStats,
        optimized: optimizedStats,
        improvement: {
          jumpsReduced: originalStats.jumps - optimizedStats.jumps,
          jumpsPercent: ((originalStats.jumps - optimizedStats.jumps) / originalStats.jumps * 100).toFixed(1),
          distanceSaved: (originalStats.jumpDistance - optimizedStats.jumpDistance).toFixed(1),
        }
      }
    },

    // Scale actions
    setScale(newScale) {
      this.scale = Math.max(0.2, Math.min(newScale, 5))
    },

    zoomIn(factor = 1.1) {
      this.zoomAtCenter(factor)
    },

    zoomOut(factor = 0.9) {
      this.zoomAtCenter(factor)
    },

    resetZoom() {
      this.resetView()
    },

    // Background actions
    setBackground(imageDataUrl) {
      this.backgroundImage = imageDataUrl
    },

    setBackgroundScale(scale) {
      this.backgroundScale = Math.max(0.1, Math.min(scale, 3))
    },

    clearBackground() {
      this.backgroundImage = null
      this.backgroundScale = 1
    },

    // Import action
    importDST(file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const fileContent = new Uint8Array(event.target.result)
          if (fileContent.length > 0) {
            this.shepherd.fromDST(fileContent)
            console.log('DST file imported successfully')
          } else {
            console.error('DST file is empty')
          }
        } catch (error) {
          console.error('DST file import failed:', error.message)
        }
      }
      reader.readAsArrayBuffer(file)
    },

    setStitchType(type) { 
      this.stitchType = type;
      console.log(`Stitch type set to: ${type}`);
    },

    // Add vectorized paths as stitches
    addVectorizedPaths(paths, scale = 1) {
      for (const path of paths) {
        for (let i = 0; i < path.length - 1; i++) {
          const [x1, y1] = path[i]
          const [x2, y2] = path[i + 1]
          
          this.addLine(
            x1 * scale,
            y1 * scale,
            x2 * scale,
            y2 * scale,
            true
          )
        }
      }
    },

    // NEW: Store vectorized paths without converting to stitches
    setVectorizedPaths(paths, metadata = null) {
      this.vectorizedPaths = paths
      this.vectorizationMetadata = metadata
      console.log('📦 Vectorized paths stored:', {
        pathCount: paths?.length,
        metadata
      })
    },

    // NEW: Clear vectorized paths
    clearVectorizedPaths() {
      this.vectorizedPaths = null
      this.vectorizationMetadata = null
    },

    // NEW: Apply vectorized paths as stitches with settings
    applyVectorizedPathsAsStitches(stitchSettings = {}) {
      if (!this.vectorizedPaths) {
        console.warn('No vectorized paths to apply')
        return
      }

      const {
        stitchType = 'running',
        stitchLength = 3.0,
        scale = 1.0,
      } = stitchSettings

      console.log('🎯 Applying vectorized paths as stitches:', {
        pathCount: this.vectorizedPaths.length,
        stitchType,
        stitchLength,
        scale
      })

      // Clear existing stitches
      this.clear()

      // Convert paths to stitches based on type
      for (const path of this.vectorizedPaths) {
        if (stitchType === 'running') {
          // Running stitch: interpolate points based on stitch length
          this.addRunningStitchPath(path, stitchLength, scale)
        }
        // TODO: Add other stitch types (satin, fill) later
      }

      console.log('✅ Applied stitches:', this.shepherd.steps.length)
    },

    // NEW: Helper function to add running stitch with proper interpolation
    addRunningStitchPath(path, stitchLength, scale) {
      if (path.length < 2) return

      // Iterate through path segments
      for (let i = 0; i < path.length - 1; i++) {
        const [x1, y1] = path[i]
        const [x2, y2] = path[i + 1]
        
        // Calculate distance between points (in scaled coordinates)
        const dx = (x2 - x1) * scale
        const dy = (y2 - y1) * scale
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // If distance is very small, skip
        if (distance < 0.1) continue
        
        // Calculate how many stitches we need for this segment
        const numStitches = Math.max(1, Math.ceil(distance / stitchLength))
        
        // Interpolate stitches along the segment
        for (let j = 0; j < numStitches; j++) {
          const t1 = j / numStitches
          const t2 = (j + 1) / numStitches
          
          const sx1 = x1 + (x2 - x1) * t1
          const sy1 = y1 + (y2 - y1) * t1
          const sx2 = x1 + (x2 - x1) * t2
          const sy2 = y1 + (y2 - y1) * t2
          
          this.addLine(
            sx1 * scale,
            sy1 * scale,
            sx2 * scale,
            sy2 * scale,
            true
          )
        }
      }
    },

    // Vectorization persistence actions
    setLastVectorization(imageDataUrl, settings) {
      this.lastVectorizedImage = imageDataUrl
      this.lastVectorizeSettings = { ...settings }
      
      // Persist to localStorage
      try {
        localStorage.setItem('lastVectorizedImage', imageDataUrl)
        localStorage.setItem('lastVectorizeSettings', JSON.stringify(settings))
      } catch (e) {
        console.warn('Failed to save vectorization settings:', e)
      }
    },

    loadLastVectorization() {
      try {
        const image = localStorage.getItem('lastVectorizedImage')
        const settings = localStorage.getItem('lastVectorizeSettings')
        
        if (image) this.lastVectorizedImage = image
        if (settings) this.lastVectorizeSettings = JSON.parse(settings)
      } catch (e) {
        console.warn('Failed to load vectorization settings:', e)
      }
    },
  },
})
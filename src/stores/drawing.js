import { defineStore } from 'pinia'
import { TurtleShepherd } from '@/lib/app.js'
import { ExportService } from '@/services/exportService.js'
import { MACHINE_CONFIG } from '@/config/machine.js'
import { optimizeStitchPaths, analyzeStitches } from '@/utils/pathOptimizer.js'

export const useDrawingStore = defineStore('drawing', {
  state: () => ({
    shepherd: new TurtleShepherd(MACHINE_CONFIG.maxX, MACHINE_CONFIG.maxY),
    scale: 1,
    backgroundImage: null,
    backgroundScale: 1,
    stitchType: 'running',
    lastVectorizedImage: null,
    lastVectorizeSettings: null,
    optimizePathsEnabled: true, // New: Path optimization toggle
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
    // Drawing actions
    clear() {
      this.shepherd.clear()
      // Reset the drawing state completely
      this.scale = 1
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
      this.setScale(this.scale * factor)
    },

    zoomOut(factor = 0.9) {
      this.setScale(this.scale * factor)
    },

    resetZoom() {
      this.setScale(1)
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
import { defineStore } from 'pinia'
import { TurtleShepherd, exportDST, exportEXP, exportSVG } from '@/lib/app.js'
import { generateGCode } from '@/utils'

export const useStitchStore = defineStore('stitch', {
  state: () => ({
    shepherd: new TurtleShepherd(),
    grid: true,
    isJump: false,
    interpolate: false,
    backgroundImage: null,
    backgroundScale: 1,
    scale: 1,
  }),

  getters: {
    // Add scale-aware getters
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

    // Background image with scaling
    scaledBackgroundImage: (state) => {
      if (!state.backgroundImage) return null
      return {
        url: state.backgroundImage,
        scale: state.backgroundScale,
      }
    },
  },

  actions: {
    clear() {
      this.shepherd.clear()
    },
    undo() {
      this.shepherd.undoStep()
    },
    addLine(x1, y1, x2, y2, penDown) {
      this.shepherd.moveTo(x1, y1, x2, y2, penDown)
    },
    addPoint(x, y) {
      this.shepherd.addPoint(x, y)
    },
    exportDST(name) {
      try {
        const data = exportDST(this.shepherd, name)
        if (!data || data.length === 0) {
          throw new Error('Export failed: No data generated')
        }
        return data
      } catch (error) {
        console.error('DST export failed:', error.message)
        throw new Error(`DST export failed: ${error.message}`)
      }
    },

    exportEXP() {
      try {
        const data = exportEXP(this.shepherd)
        if (!data || data.length === 0) {
          throw new Error('Export failed: No data generated')
        }
        return data
      } catch (error) {
        console.error('EXP export failed:', error.message)
        throw new Error(`EXP export failed: ${error.message}`)
      }
    },

    exportSVG() {
      try {
        const data = exportSVG(this.shepherd)
        if (!data || data.length === 0) {
          throw new Error('Export failed: No SVG data generated')
        }
        return data
      } catch (error) {
        console.error('SVG export failed:', error.message)
        throw new Error(`SVG export failed: ${error.message}`)
      }
    },

    exportGCode(name = 'design') {
      try {
        if (!this.shepherd.steps || this.shepherd.steps.length === 0) {
          throw new Error('No design data to export')
        }
        return generateGCode(this.shepherd.steps, name)
      } catch (error) {
        console.error('G-code export failed:', error.message)
        throw new Error(`G-code export failed: ${error.message}`)
      }
    },
    toggleGrid() {
      this.grid = !this.grid
    },
    toggleJump() {
      this.isJump = !this.isJump
    },
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

    // Add scale management
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

    // Fix: Make sure importDST method exists
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
  },
})

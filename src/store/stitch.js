import { defineStore } from 'pinia'
import { TurtleShepherd, exportDST, exportEXP, exportSVG } from '@/lib/app.js'
import { generateGCode } from '@/utils/exportUtils.js'

export const useStitchStore = defineStore('stitch', {
  state: () => ({
    shepherd: new TurtleShepherd(),
    grid: true,
    isJump: false,
    interpolate: false,
    backgroundImage: null,
    scale: 1, // Add scale state
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
      return exportDST(this.shepherd, name)
    },
    exportEXP() {
      return exportEXP(this.shepherd)
    },
    exportSVG() {
      return exportSVG(this.shepherd)
    },
    exportGCode(name = 'design') {
      return generateGCode(this.shepherd.steps, name)
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

    // Add scale management
    setScale(newScale) {
      this.scale = Math.max(0.2, Math.min(newScale, 5))
    },

    zoomIn(factor = 1.1) {
      this.setScale(this.scale * factor)
    },

    zoomOut(factor = 0.9) {
      this.setScale(this.scale * factor) // This is correct for zoom out
    },

    resetZoom() {
      this.setScale(1)
    },

    // Add this action to your store
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

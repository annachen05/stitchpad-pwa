import { defineStore } from 'pinia'
import { TurtleShepherd } from '@/lib/app.js'
import { ExportService } from '@/services/exportService.js'
import { MACHINE_CONFIG } from '@/config/machine.js'

export const useDrawingStore = defineStore('drawing', {
  state: () => ({
    shepherd: new TurtleShepherd(MACHINE_CONFIG.maxX, MACHINE_CONFIG.maxY),
    scale: 1,
    backgroundImage: null,
    backgroundScale: 1,
    stitchType: 'running',
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
    },

    addLine(x1, y1, x2, y2, penDown) {
      this.shepherd.moveTo(x1, y1, x2, y2, penDown)
    },

    addPoint(x, y) {
      this.shepherd.addPoint(x, y)
    },

    // Export actions
    async exportDST(name = 'design') {
      await ExportService.exportDST(this.shepherd, name)
    },

    async exportEXP(name = 'design') {
      await ExportService.exportEXP(this.shepherd, name)
    },

    async exportSVG(name = 'design') {
      await ExportService.exportSVG(this.shepherd, name)
    },

    async exportGCode(name = 'design') {
      await ExportService.exportGCode(this.shepherd.steps, name)
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
  },
})
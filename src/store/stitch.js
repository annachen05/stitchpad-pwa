import { defineStore } from 'pinia'
import { TurtleShepherd, exportDST, exportEXP, exportSVG } from '@/lib/app.js'
import { generateGCode } from '@/utils/exportUtils.js'

export const useStitchStore = defineStore('stitch', {
  state: () => ({
    shepherd: new TurtleShepherd(),
    grid: true,
    isJump: false,
    interpolate: false,
  }),
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
  },
})

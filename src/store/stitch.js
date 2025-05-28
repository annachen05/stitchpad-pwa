import { defineStore } from 'pinia'
import { TurtleShepherd, exportDST, exportEXP, exportSVG } from '@/lib/app'

export const useStitchStore = defineStore('stitch', {
  state: () => ({
    shepherd: new TurtleShepherd(),
    grid: true,
    // weitere States
  }),
  actions: {
    clear() { this.shepherd.clear() },
    undo() { this.shepherd.undoStep() },
    addLine(x1, y1, x2, y2, penDown) { this.shepherd.moveTo(x1, y1, x2, y2, penDown) },
    exportDST(name) { return exportDST(this.shepherd, name) },
    exportEXP() { return exportEXP(this.shepherd) },
    exportSVG() { return exportSVG(this.shepherd) },
    toggleGrid() { this.grid = !this.grid },
    // weitere Actions
  }
})

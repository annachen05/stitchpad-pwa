import { defineStore } from 'pinia'
import { saveDesign } from '@/utils/embroidery'

export const useStitchStore = defineStore('stitch', {
  state: () => ({
    paths: [],         // Array von Pfaden (jeweg. Liste von Punkten)
    gridOn: true,      // Raster ein/aus
    background: null,  // Hintergrundbild (Data-URL)
  }),
  actions: {
    clear() { this.paths = [] },
    addPath(path) { this.paths.push(path) },
    toggleGrid() { this.gridOn = !this.gridOn },
    setBackground(dataUrl) { this.background = dataUrl },
    // placeholder für Export/Import:
    async export(format, name) { /* importiere util und rufe hier auf */ },
    async importDST(file) { /* lese Datei und parse */ },
  }
})


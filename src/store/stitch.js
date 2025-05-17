import { defineStore } from 'pinia'
import { exportDST, exportEXP, exportSVG, importDST as importDSTUtil } from '@/utils/embroidery'

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
    async export(format, name = 'meinDesign') {
      let blob
      if (format === 'dst') {
        blob = new Blob([exportDST(this.paths)], { type: 'application/octet-stream' })
      } else if (format === 'exp') {
        blob = new Blob([exportEXP(this.paths)], { type: 'application/octet-stream' })
      } else if (format === 'svg') {
        blob = new Blob([exportSVG(this.paths)], { type: 'image/svg+xml' })
      } else {
        throw new Error('Unbekanntes Format: ' + format)
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    },
    async importDST(file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const buffer = e.target.result
        this.paths = importDSTUtil(buffer)
      }
      reader.readAsArrayBuffer(file)
    },
  }
})

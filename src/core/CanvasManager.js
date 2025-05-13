// src/core/CanvasManager.js
import { fabric } from 'fabric'

export class CanvasManager {
  constructor(el) {
    this.canvas = new fabric.Canvas(el, { selection: true })
  }

  addRectangle() {
    const rect = new fabric.Rect({ width: 100, height: 60, fill: 'blue' })
    this.canvas.add(rect)
  }

  loadJSON(data) {
    this.canvas.loadFromJSON(data, this.canvas.renderAll.bind(this.canvas))
  }

  exportJSON() {
    return this.canvas.toJSON()
  }
  // …weitere Methoden: undo/redo, clear(), exportSVG() etc.
}

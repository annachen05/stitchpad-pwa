// src/utils/embroidery.js

// 1. Importiere TurtleShepherd aus dem third-party-Ordner
import { TurtleShepherd } from '../lib/app.js'
// 2. Importiere saveAs (falls du FileSaver.js nutzt)
import { saveAs } from 'file-saver'

/**
 * Speichert das aktuelle Design in dem gewählten Format.
 * @param {'exp'|'dst'|'svg'} format
 * @param {string} name
 * @param {Array} paths
 */
export function saveDesign(format, name, paths) {
  const turtleShepherd = new TurtleShepherd()
  turtleShepherd.loadPaths(paths)

  let blob, data

  switch (format) {
    case 'exp':
      data = turtleShepherd.toEXP()
      blob = new Blob([data], { type: 'application/octet-stream' })
      saveAs(blob, name + '.exp')
      break

    case 'dst':
      data = turtleShepherd.toDST(name)
      blob = new Blob([data], { type: 'application/octet-stream' })
      saveAs(blob, name + '.dst')
      break

    case 'svg':
      data = turtleShepherd.toSVG()
      blob = new Blob([data], { type: 'image/svg+xml' })
      saveAs(blob, name + '.svg')
      break

    default:
      throw new Error(`Unbekanntes Format: ${format}`)
  }
}

export { exportDST, exportEXP, exportSVG, importDST } from '../lib/app.js'
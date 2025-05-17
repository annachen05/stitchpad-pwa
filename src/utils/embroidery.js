// src/utils/embroidery.js

// 1. Importiere TurtleShepherd aus dem third-party-Ordner
import TurtleShepherd from '@/../Stitchpad-master/www/js/app.js'
// 2. Importiere saveAs (falls du FileSaver.js nutzt)
import { saveAs } from 'file-saver'

/**
 * Speichert das aktuelle Design in dem gewählten Format.
 * @param {'exp'|'dst'|'svg'} format
 * @param {string} name
 * @param {Array} paths  // deine Pfad-Daten aus dem Store
 */
export function saveDesign(format, name, paths) {
  // TurtleShepherd-Instanz erstellen und Pfade laden
  const turtleShepherd = new TurtleShepherd()
  turtleShepherd.loadPaths(paths)  // angenommen, es gibt eine solche Methode

  let blob, expUintArr, svgStr

  switch (format) {
    case 'exp':
      arr  = ts.toEXP()
      expUintArr = turtleShepherd.toEXP()
      blob = new Blob([expUintArr], { type: 'application/octet-stream' })
      saveAs(blob, name + '.exp')
      break

    case 'dst':
      arr  = ts.toDST(name)
      expUintArr = turtleShepherd.toDST(name)
      blob = new Blob([expUintArr], { type: 'application/octet-stream' })
      saveAs(blob, name + '.dst')
      break

    case 'svg':
      svgStr = ts.toSVG()
      svgStr = turtleShepherd.toSVG()
      blob = new Blob([svgStr], { type: 'text/plain;charset=utf-8' })
      saveAs(blob, name + '.svg')
      break

    default:
      throw new Error(`Unbekanntes Format: ${format}`)
  }
}

export { writeDST } from '../Stitchpad-master/Stitchpad-master/www/js/app.js'
export { writeEXP } from '../Stitchpad-master/Stitchpad-master/www/js/app.js'
export { exportSVG } from '../Stitchpad-master/Stitchpad-master/www/js/app.js'
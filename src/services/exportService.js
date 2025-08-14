import { saveAs } from 'file-saver'
import { validateDST, generateGCode } from '@/utils/exportUtils.js'

export class ExportService {
  static async exportDST(shepherd, name) {
    try {
      const data = shepherd.toDST(name)
      validateDST(data)
      const blob = new Blob([data], { type: 'application/octet-stream' })
      saveAs(blob, `${name}.dst`)
    } catch (error) {
      throw new Error(`DST export failed: ${error.message}`)
    }
  }

  static async exportEXP(shepherd, name) {
    try {
      const data = shepherd.toEXP()
      const blob = new Blob([data], { type: 'application/octet-stream' })
      saveAs(blob, `${name}.exp`)
    } catch (error) {
      throw new Error(`EXP export failed: ${error.message}`)
    }
  }

  static async exportSVG(shepherd, name) {
    try {
      const data = shepherd.toSVG()
      const blob = new Blob([data], { type: 'image/svg+xml' })
      saveAs(blob, `${name}.svg`)
    } catch (error) {
      throw new Error(`SVG export failed: ${error.message}`)
    }
  }

  static async exportGCode(steps, name) {
    try {
      const data = generateGCode(steps, name)
      const blob = new Blob([data], { type: 'text/plain' })
      saveAs(blob, `${name}.gcode`)
    } catch (error) {
      throw new Error(`G-code export failed: ${error.message}`)
    }
  }

  /**
   * Stream-based export for large files
   * Better performance for big designs by processing in chunks
   */
  static async exportLargeFile(shepherd, format, name = 'design') {
    try {
      const chunks = []
      const chunkSize = 1024 // 1KB chunks

      switch (format.toLowerCase()) {
        case 'dst':
          const dstData = shepherd.toDST(name)
          validateDST(dstData)

          // Process in chunks for large files
          for (let i = 0; i < dstData.length; i += chunkSize) {
            const chunk = dstData.slice(i, i + chunkSize)
            chunks.push(chunk)

            // Yield control back to browser
            await new Promise((resolve) => setTimeout(resolve, 0))
          }

          const dstBlob = new Blob(chunks, { type: 'application/octet-stream' })
          saveAs(dstBlob, `${name}.dst`)
          break

        case 'exp':
          const expData = shepherd.toEXP()
          
          // Process EXP in chunks too
          for (let i = 0; i < expData.length; i += chunkSize) {
            const chunk = expData.slice(i, i + chunkSize)
            chunks.push(chunk)
            await new Promise((resolve) => setTimeout(resolve, 0))
          }

          const expBlob = new Blob(chunks, { type: 'application/octet-stream' })
          saveAs(expBlob, `${name}.exp`)
          break

        case 'svg':
          const svgData = shepherd.toSVG()
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
          saveAs(svgBlob, `${name}.svg`)
          break

        case 'gcode':
          const gcodeData = generateGCode(shepherd.steps, name)
          
          // Process G-code in chunks
          for (let i = 0; i < gcodeData.length; i += chunkSize) {
            const chunk = gcodeData.slice(i, i + chunkSize)
            chunks.push(chunk)
            await new Promise((resolve) => setTimeout(resolve, 0))
          }

          const gcodeBlob = new Blob(chunks, { type: 'text/plain' })
          saveAs(gcodeBlob, `${name}.gcode`)
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      return { success: true, message: `${format.toUpperCase()} export completed` }
    } catch (error) {
      throw new Error(`Large file export failed: ${error.message}`)
    }
  }
}
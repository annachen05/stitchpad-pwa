import { saveAs } from 'file-saver'
import { generateGCode, generatePaperSVG, generateStitchTxt } from '@/utils/exportUtils.js'

const PX_PER_INCH = 96
const PDF_POINTS_PER_INCH = 72

function loadSvgImage(svgText) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = window.URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      window.URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      window.URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG image'))
    }
    img.src = url
  })
}

async function svgToCanvas(svgText, widthPx, heightPx, background = '#ffffff') {
  const img = await loadSvgImage(svgText)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(widthPx))
  canvas.height = Math.max(1, Math.round(heightPx))

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas
}

function dataUrlToBytes(dataUrl) {
  const [, base64] = dataUrl.split(',')
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function buildPdfFromJpegBytes(jpegBytes, pageWidthPt, pageHeightPt, imageWidth, imageHeight) {
  const encoder = new TextEncoder()
  const parts = []
  const offsets = []
  let length = 0

  const pushText = (text) => {
    const bytes = encoder.encode(text)
    parts.push(bytes)
    length += bytes.length
  }

  const pushBytes = (bytes) => {
    parts.push(bytes)
    length += bytes.length
  }

  pushText('%PDF-1.3\n')

  const addObject = (objNum, contentBytes) => {
    offsets[objNum] = length
    pushText(`${objNum} 0 obj\n`)
    pushBytes(contentBytes)
    pushText('\nendobj\n')
  }

  addObject(1, encoder.encode('<< /Type /Catalog /Pages 2 0 R >>'))
  addObject(2, encoder.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'))

  const mediaBox = `0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}`
  const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [${mediaBox}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  addObject(3, encoder.encode(pageObj))

  const imageHeader = `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  const imageFooter = '\nendstream'
  const imageBytes = concatBytes([
    encoder.encode(imageHeader),
    jpegBytes,
    encoder.encode(imageFooter),
  ])
  addObject(4, imageBytes)

  const contentStream = `q ${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm /Im0 Do Q`
  const contentBytes = encoder.encode(contentStream)
  const contentObj = concatBytes([
    encoder.encode(`<< /Length ${contentBytes.length} >>\nstream\n`),
    contentBytes,
    encoder.encode('\nendstream'),
  ])
  addObject(5, contentObj)

  const xrefStart = length
  const maxObj = 5
  const pad = (num) => String(num).padStart(10, '0')

  pushText('xref\n')
  pushText(`0 ${maxObj + 1}\n`)
  pushText('0000000000 65535 f \n')
  for (let i = 1; i <= maxObj; i++) {
    pushText(`${pad(offsets[i])} 00000 n \n`)
  }

  pushText('trailer\n')
  pushText(`<< /Size ${maxObj + 1} /Root 1 0 R >>\n`)
  pushText('startxref\n')
  pushText(`${xrefStart}\n`)
  pushText('%%EOF')

  return concatBytes(parts)
}

export class ExportService {
  static async triggerNativeExport(drawingStore) {
    if (!window.showSaveFilePicker) {
      return false; // Signals App.vue to use fallback SaveDialog
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'stitch-design',
        types: [
          { description: 'G-code File (.gcode)', accept: { 'text/plain': ['.gcode'] } },
          { description: 'Optimized SVG (.svg)', accept: { 'image/svg+xml': ['.svg'] } },
          { description: 'Coordinates Text (.txt)', accept: { 'text/plain': ['.txt'] } },
          { description: 'PDF Document (.pdf)', accept: { 'application/pdf': ['.pdf'] } },
          { description: 'PNG Image (.png)', accept: { 'image/png': ['.png'] } },
          { description: 'JPEG Image (.jpg)', accept: { 'image/jpeg': ['.jpg'] } }
        ]
      });

      const name = handle.name;
      const formatMatch = name.match(/\.([a-z0-9]+)$/i);
      const format = formatMatch ? formatMatch[1].toLowerCase() : 'gcode';
      const baseName = name.replace(/\.[^/.]+$/, "");

      // Get appropriate steps
      const steps = drawingStore.optimizePathsEnabled 
        ? drawingStore.getOptimizedShepherd().steps 
        : drawingStore.shepherd.steps;
      
      const { paperPx, paperRect, machineBounds } = drawingStore;
      const scale = 2; // Default image scale for direct native export

      let blob = null;

      switch (format) {
        case 'gcode':
          blob = new Blob([generateGCode(steps, baseName, machineBounds, paperPx, paperRect)], { type: 'text/plain' });
          break;
        case 'svg':
          blob = new Blob([generatePaperSVG(steps, baseName, paperPx, paperRect)], { type: 'image/svg+xml' });
          break;
        case 'txt':
          blob = new Blob([generateStitchTxt(steps, baseName, paperPx, paperRect)], { type: 'text/plain' });
          break;
        case 'pdf': {
          const svgText = generatePaperSVG(steps, baseName, paperPx, paperRect);
          const wp = Math.round(paperPx.w * scale);
          const hp = Math.round(paperPx.h * scale);
          const canvas = await svgToCanvas(svgText, wp, hp, '#ffffff');
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const jpegBytes = dataUrlToBytes(jpegDataUrl);
          const widthPt = (paperPx.w / PX_PER_INCH) * PDF_POINTS_PER_INCH;
          const heightPt = (paperPx.h / PX_PER_INCH) * PDF_POINTS_PER_INCH;
          const pdfBytes = buildPdfFromJpegBytes(jpegBytes, widthPt, heightPt, wp, hp);
          blob = new Blob([pdfBytes], { type: 'application/pdf' });
          break;
        }
        case 'png': {
          const svgText = generatePaperSVG(steps, baseName, paperPx, paperRect);
          const canvas = await svgToCanvas(svgText, Math.round(paperPx.w * scale), Math.round(paperPx.h * scale), '#ffffff');
          blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          break;
        }
        case 'jpg':
        case 'jpeg': {
          const svgText = generatePaperSVG(steps, baseName, paperPx, paperRect);
          const canvas = await svgToCanvas(svgText, Math.round(paperPx.w * scale), Math.round(paperPx.h * scale), '#ffffff');
          blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
          break;
        }
        default:
          throw new Error('Unsupported format: ' + format);
      }

      if (blob) {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
      return true; 
    } catch (err) {
      if (err.name === 'AbortError') return true; // User cancelled
      console.error('Native export failed', err);
      return false; // Fallback to SaveDialog on error 
    }
  }

  static async saveBlob(blob, name, format) {
    if (window.showSaveFilePicker) {
      try {
        const mimeTypes = {
          'gcode': 'text/plain',
          'txt': 'text/plain',
          'svg': 'image/svg+xml',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'pdf': 'application/pdf'
        }
        
        const descriptions = {
          'gcode': 'G-code File (.gcode)',
          'txt': 'Coordinates Text (.txt)',
          'svg': 'Optimized SVG (.svg)',
          'png': 'PNG Image (.png)',
          'jpg': 'JPEG Image (.jpg)',
          'pdf': 'PDF Document (.pdf)'
        }

        const handle = await window.showSaveFilePicker({
          suggestedName: `${name}.${format}`,
          types: [{
            description: descriptions[format] || 'File',
            accept: {
              [mimeTypes[format] || 'application/octet-stream']: [`.${format}`]
            }
          }]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('showSaveFilePicker failed, falling back to saveAs', err)
          saveAs(blob, `${name}.${format}`)
        }
      }
    } else {
      saveAs(blob, `${name}.${format}`)
    }
  }

  static async exportSVG(steps, name, paperPx, paperRect) {
    try {
      const data = generatePaperSVG(steps, name, paperPx, paperRect)
      const blob = new Blob([data], { type: 'image/svg+xml' })
      await this.saveBlob(blob, name, 'svg')
    } catch (error) {
      throw new Error(`SVG export failed: ${error.message}`)
    }
  }

  static async exportGCode(steps, name, machineBounds, paperPx, paperRect) {
    try {
      const data = generateGCode(steps, name, machineBounds, paperPx, paperRect)
      const blob = new Blob([data], { type: 'text/plain' })
      await this.saveBlob(blob, name, 'gcode')
    } catch (error) {
      throw new Error(`G-code export failed: ${error.message}`)
    }
  }

  static async exportTXT(steps, name, paperPx, paperRect) {
    try {
      const data = generateStitchTxt(steps, name, paperPx, paperRect)
      const blob = new Blob([data], { type: 'text/plain' })
      await this.saveBlob(blob, name, 'txt')
    } catch (error) {
      throw new Error(`TXT export failed: ${error.message}`)
    }
  }

  static async exportPNG(steps, name, paperPx, paperRect, scale = 2) {
    try {
      const svgText = generatePaperSVG(steps, name, paperPx, paperRect)
      const widthPx = Math.round(paperPx.w * scale)
      const heightPx = Math.round(paperPx.h * scale)
      const canvas = await svgToCanvas(svgText, widthPx, heightPx, '#ffffff')
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) reject(new Error('PNG export failed'))
          else resolve(result)
        }, 'image/png')
      })
      await this.saveBlob(blob, name, 'png')
    } catch (error) {
      throw new Error(`PNG export failed: ${error.message}`)
    }
  }

  static async exportJPG(steps, name, paperPx, paperRect, scale = 2) {
    try {
      const svgText = generatePaperSVG(steps, name, paperPx, paperRect)
      const widthPx = Math.round(paperPx.w * scale)
      const heightPx = Math.round(paperPx.h * scale)
      const canvas = await svgToCanvas(svgText, widthPx, heightPx, '#ffffff')
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) reject(new Error('JPG export failed'))
          else resolve(result)
        }, 'image/jpeg', 0.92)
      })
      await this.saveBlob(blob, name, 'jpg')
    } catch (error) {
      throw new Error(`JPG export failed: ${error.message}`)
    }
  }

  static async exportPDF(steps, name, paperPx, paperRect, scale = 2) {
    try {
      const svgText = generatePaperSVG(steps, name, paperPx, paperRect)
      const widthPx = Math.round(paperPx.w * scale)
      const heightPx = Math.round(paperPx.h * scale)
      const canvas = await svgToCanvas(svgText, widthPx, heightPx, '#ffffff')
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const jpegBytes = dataUrlToBytes(jpegDataUrl)

      const widthPt = (paperPx.w / PX_PER_INCH) * PDF_POINTS_PER_INCH
      const heightPt = (paperPx.h / PX_PER_INCH) * PDF_POINTS_PER_INCH
      const pdfBytes = buildPdfFromJpegBytes(jpegBytes, widthPt, heightPt, widthPx, heightPx)
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      await this.saveBlob(blob, name, 'pdf')
    } catch (error) {
      throw new Error(`PDF export failed: ${error.message}`)
    }
  }

  /**
   * Stream-based export for large files
   * Better performance for big designs by processing in chunks
   */
  static async exportLargeFile(shepherd, format) {
    // Only supporting formats that are supported.
    // DST and EXP formats are removed.
    console.warn(`Long export not natively chunked for ${format} currently`);
  }
}
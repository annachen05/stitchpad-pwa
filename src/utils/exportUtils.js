/**
 * Validates the structure of a DST file.
 * @param {Uint8Array} content - The binary content of the DST file.
 * @throws {Error} If the file is invalid.
 */
import { MACHINE_CONFIG } from '@/config/machine.js'
import { PX_PER_CM } from '@/config/paper.js'

export function validateDST(content) {
  console.log('Validating DST file. Length:', content.length) // Debugging log

  if (content.length < 515) {
    throw new Error('Invalid DST file: Too short')
  }
  if (content.slice(-3).toString() !== [0x00, 0x00, 0xf3].toString()) {
    throw new Error('Invalid DST file: Missing EOF marker')
  }
  console.log('DST file is valid')
}

/**
 * Converts a Uint8Array to a readable hex string for debugging purposes.
 * @param {Uint8Array} content - The binary content to convert.
 * @returns {string} Hexadecimal representation of the content.
 */
export function toHexString(content) {
  return Array.from(content)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * Extracts metadata from the header of a DST file.
 * @param {Uint8Array} content - The binary content of the DST file.
 * @returns {Object} Metadata including stitch count, dimensions, and design name.
 */
export function extractDSTMetadata(content) {
  if (content.length < 512) {
    throw new Error('Invalid DST file: Header is too short')
  }

  const name = new TextDecoder().decode(content.slice(0, 20)).trim()
  const stitchCount = parseInt(new TextDecoder().decode(content.slice(90, 97)).trim(), 10)
  const maxX = parseInt(new TextDecoder().decode(content.slice(100, 105)).trim(), 10)
  const maxY = parseInt(new TextDecoder().decode(content.slice(105, 110)).trim(), 10)

  return { name, stitchCount, maxX, maxY }
}

/**
 * Validates the stitches in a DST file.
 * @param {Uint8Array} content - The binary content of the DST file.
 * @throws {Error} If the stitches are invalid.
 */
export function validateDSTStitches(content) {
  const stitches = content.slice(512, -3) // Extract stitches (excluding EOF marker)
  if (stitches.length % 3 !== 0) {
    throw new Error('Invalid DST file: Stitches are not properly aligned')
  }

  for (let i = 0; i < stitches.length; i += 3) {
    // Remove unused x and y variables
    const flags = stitches[i + 2]

    if (flags !== 0x00 && flags !== 0x80) {
      throw new Error(`Invalid stitch flags at index ${i}: ${flags}`)
    }
  }
  console.log('DST stitches are valid')
}

/**
 * Generates an SVG string from stitch data.
 * @param {Array} steps - Array of stitch steps containing x1, y1, x2, y2, and penDown.
 * @param {number} maxX - Maximum X coordinate for viewBox calculation.
 * @param {number} maxY - Maximum Y coordinate for viewBox calculation.
 * @returns {string} SVG string representation of the design.
 */
export function generateSVG(steps, maxX, maxY) {
  const viewBoxWidth = maxX + 10 // Add padding
  const viewBoxHeight = maxY + 10 // Add padding
  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">`
  const svgFooter = '</svg>'
  const svgContent = steps
    .map((step) => {
      if (step.penDown) {
        return `<line x1="${step.x1}" y1="${step.y1}" x2="${step.x2}" y2="${step.y2}" stroke="#333" stroke-width="2" />`
      } else {
        return `<line x1="${step.x1}" y1="${step.y1}" x2="${step.x2}" y2="${step.y2}" stroke="#f00" stroke-width="1" opacity="0.5" />`
      }
    })
    .join('')
  return `${svgHeader}${svgContent}${svgFooter}`
}

/**
 * Generates a paper-sized SVG in millimeters.
 * - Coordinates are interpreted as "world" coords used in the app.
 * - We convert to paper-local coords by subtracting paperRect.x/y.
 * - Output SVG uses mm units so 13x8.6cm becomes 130x86mm (depending on orientation).
 */
export function generatePaperSVG(steps, name = 'design', paperPx, paperRect) {
  if (!paperPx || !Number.isFinite(paperPx.w) || !Number.isFinite(paperPx.h) || paperPx.w <= 0 || paperPx.h <= 0) {
    throw new Error('Missing paper size for SVG export')
  }
  if (!paperRect || !Number.isFinite(paperRect.x) || !Number.isFinite(paperRect.y)) {
    throw new Error('Missing paper rect for SVG export')
  }

  const mmPerPx = 10 / PX_PER_CM
  const wMm = paperPx.w * mmPerPx
  const hMm = paperPx.h * mmPerPx

  const svgHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${wMm.toFixed(
    3
  )}mm" height="${hMm.toFixed(3)}mm" viewBox="0 0 ${wMm.toFixed(3)} ${hMm.toFixed(3)}">\n<!-- Design: ${name} -->\n`
  const svgFooter = '\n</svg>'

  const svgContent = (steps || [])
    .map((step) => {
      const x1 = (step.x1 - paperRect.x) * mmPerPx
      const y1 = (step.y1 - paperRect.y) * mmPerPx
      const x2 = (step.x2 - paperRect.x) * mmPerPx
      const y2 = (step.y2 - paperRect.y) * mmPerPx

      const stroke = step.penDown ? '#333' : '#f00'
      const opacity = step.penDown ? '1' : '0.5'
      return `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}" stroke="${stroke}" stroke-width="0.25" opacity="${opacity}" />`
    })
    .join('\n')

  return `${svgHeader}${svgContent}${svgFooter}`
}

/**
 * Generates an EXP file from stitch data.
 * @param {Array} steps - Array of stitch steps containing x1, y1, x2, y2, and penDown.
 * @returns {Uint8Array} Binary content of the EXP file.
 */
export function generateEXP(steps) {
  const maxWidth = 70 // Maximum width in stitches
  const maxHeight = 130 // Maximum height in stitches

  validateDesignDimensions(steps, maxWidth, maxHeight)

  const header = new Uint8Array(512).fill(0x20) // Placeholder header
  const designName = 'DESIGN'.slice(0, 20) // Limit name to 20 characters
  const nameBytes = new TextEncoder().encode(designName)
  header.set(nameBytes, 0) // Add design name to header

  const maxX = Math.max(...steps.map((step) => step.x2))
  const maxY = Math.max(...steps.map((step) => step.y2))
  const stitchCount = steps.length
  const stitchCountBytes = new TextEncoder().encode(stitchCount.toString().padStart(7, ' '))
  header.set(stitchCountBytes, 90) // Stitch count at offset 90
  header.set(new TextEncoder().encode(maxX.toString().padStart(5, ' ')), 100) // Max X
  header.set(new TextEncoder().encode(maxY.toString().padStart(5, ' ')), 105) // Max Y

  const stitches = steps.map((step) => {
    const x = Math.round(step.x2 - step.x1)
    const y = Math.round(step.y2 - step.y1)
    const flags = step.penDown ? 0x00 : 0x80 // Pen down or jump stitch

    const encodedX = x < 0 ? 0x100 + x : x
    const encodedY = y < 0 ? 0x100 + y : y

    return new Uint8Array([encodedX & 0xff, encodedY & 0xff, flags])
  })

  const expContent = [header, ...stitches, new Uint8Array([0x00, 0x00, 0xf3])] // End of file
  return new Uint8Array(expContent.flat())
}

/**
 * Generates a DST file from stitch data.
 * @param {Array} steps - Array of stitch steps containing x1, y1, x2, y2, and penDown.
 * @param {string} name - Design name for the DST file.
 * @returns {Uint8Array} Binary content of the DST file.
 */
export function toDST(steps, name, maxX, maxY) {
  const maxWidth = 70 // Maximum width in stitches
  const maxHeight = 130 // Maximum height in stitches

  // Validate design dimensions using the passed parameters
  validateDesignDimensions(steps, maxWidth, maxHeight)

  const header = new Uint8Array(512).fill(0x20)
  const nameBytes = new TextEncoder().encode(name.slice(0, 20))
  header.set(nameBytes, 0)

  // Add metadata to header using the passed maxX, maxY
  const stitchCount = steps.length
  const roundedMaxX = Math.round(maxX) // Using maxX parameter
  const roundedMaxY = Math.round(maxY) // Using maxY parameter
  
  const stitchCountBytes = new TextEncoder().encode(stitchCount.toString().padStart(7, ' '))
  header.set(stitchCountBytes, 90)
  header.set(new TextEncoder().encode(roundedMaxX.toString().padStart(5, ' ')), 100)
  header.set(new TextEncoder().encode(roundedMaxY.toString().padStart(5, ' ')), 105)

  // Encode stitches
  const stitches = steps.map((step) => {
    const x = Math.round(step.x2 - step.x1)
    const y = Math.round(step.y2 - step.y1)
    const flags = step.penDown ? 0x00 : 0x80

    const encodedX = x < 0 ? 0x100 + x : x
    const encodedY = y < 0 ? 0x100 + y : y

    return [encodedX & 0xff, encodedY & 0xff, flags]
  })

  // Add end-of-file marker
  const dstContent = [header, ...stitches.flat(), [0x00, 0x00, 0xf3]]
  return new Uint8Array(dstContent.flat())
}

/**
 * Generates G-code from stitch data.
 * @param {Array} steps - Array of stitch steps containing x1, y1, x2, y2, and penDown.
 * @param {string} filename - Design name for the G-code file.
 * @returns {string} G-code string representation of the design.
 */
export function generateGCode(steps, filename = 'design', machineBounds = MACHINE_CONFIG, paperPx = null, paperRect = null) {
  //––– calculate stitch count & raw extents
  const stitchCount = steps.length
  const xs = steps.flatMap((s) => [s.x1, s.x2])
  const ys = steps.flatMap((s) => [s.y1, s.y2])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const widthPx = maxX - minX
  const heightPx = maxY - minY

  //––– your machine's travel limits (mm)
  const deviceMaxX = machineBounds?.maxX ?? MACHINE_CONFIG.maxX
  const deviceMaxY = machineBounds?.maxY ?? MACHINE_CONFIG.maxY

  // Canvas coordinates are in CSS px using a fixed 96dpi baseline.
  // Convert px -> mm so that 13x8.6cm canvas exports as 130x86mm without rescaling.
  const mmPerPx = 10 / PX_PER_CM
  const widthMm = widthPx * mmPerPx
  const heightMm = heightPx * mmPerPx

  const exportMode =
    paperPx && Number.isFinite(paperPx.h) && paperPx.h > 0 && paperRect && Number.isFinite(paperRect.x) && Number.isFinite(paperRect.y)
      ? 'paper'
      : 'packed'

  // For paper-relative export, compute extents in paper-local coords for accurate size reporting.
  let widthMmForReport = widthMm
  let heightMmForReport = heightMm
  if (exportMode === 'paper') {
    const xLocal = xs.map((v) => v - paperRect.x)
    const yLocal = ys.map((v) => v - paperRect.y)
    const minLX = Math.min(...xLocal)
    const maxLX = Math.max(...xLocal)
    const minLY = Math.min(...yLocal)
    const maxLY = Math.max(...yLocal)
    widthMmForReport = (maxLX - minLX) * mmPerPx
    heightMmForReport = (maxLY - minLY) * mmPerPx
  }
  
  // Check if design fits within machine limits
  if (widthMmForReport > deviceMaxX || heightMmForReport > deviceMaxY) {
    console.warn(
      `Design size (${widthMmForReport.toFixed(1)} x ${heightMmForReport.toFixed(1)} mm) exceeds machine limits (${deviceMaxX} x ${deviceMaxY} mm)`
    )
  }

  let gcode = []
  //gcode.push(`Design Bounds Analysis`)
  //gcode.push(`Original size: ${widthMmForReport.toFixed(3)} x ${heightMmForReport.toFixed(3)} (mm)`)
  //gcode.push(`Machine limits: ${deviceMaxX} x ${deviceMaxY} (mm)`)

  // Metadata header (use plain text so tests and humans can read it)
  gcode.push(`Design name: ${filename}`)
  //gcode.push(`Generated on: ${new Date().toISOString()}`)
  gcode.push('')

  // Machine setup
  gcode.push('G90') // Absolute positioning
  gcode.push('G21') // Units in mm
  gcode.push('G28') // Home
  gcode.push('G0 X0.0 Y0.0') // Move to origin
  gcode.push('')

  // Apply coordinate transformation and emit moves
  let currentZ = 0
  const dz = 5
  
  steps.forEach((step, index) => {
    let xMm
    let yMm

    if (exportMode === 'paper') {
      // Paper-relative coordinates: (0,0) is top-left in canvas (y-down).
      // Machine origin is bottom-left -> flip Y around paper height.
      const xPaperPx = step.x2 - paperRect.x
      const yPaperPx = step.y2 - paperRect.y
      xMm = xPaperPx * mmPerPx
      yMm = (paperPx.h - yPaperPx) * mmPerPx
    } else {
      // Fallback: pack design to origin (legacy behavior) then flip Y.
      const xPx = step.x2 - minX
      let yPx = step.y2 - minY
      yPx = heightPx - yPx
      xMm = xPx * mmPerPx
      yMm = yPx * mmPerPx
    }
    
    // 4. Format to 3 decimal places
    const xPos = xMm.toFixed(3)
    const yPos = yMm.toFixed(3)
    
    // Move to position
    gcode.push(`G0 X${xPos} Y${yPos}`)
    
    // Z movement for visualization (if needed)
    currentZ += dz
    gcode.push(`G0 Z${currentZ.toFixed(1)}`)
  })

  // Footer
  gcode.push('')
  gcode.push('G28')
  gcode.push('M30')

  return gcode.join('\n')
}

/**
 * Validates the design dimensions against maximum allowed dimensions.
 * @param {Array} steps - Array of stitch steps containing x1, y1, x2, y2, and penDown.
 * @param {number} maxWidth - Maximum allowed width of the design.
 * @param {number} maxHeight - Maximum allowed height of the design.
 * @throws {Error} If the design exceeds the maximum dimensions.
 */
export function validateDesignDimensions(steps, maxWidth, maxHeight) {
  const maxX = Math.max(...steps.map((step) => step.x2))
  const maxY = Math.max(...steps.map((step) => step.y2))

  if (maxX > maxWidth || maxY > maxHeight) {
    throw new Error(`Design exceeds maximum dimensions: ${maxWidth} x ${maxHeight}`)
  }
}

/**
 * Validates the structure of a DST file.
 * @param {Uint8Array} content - The binary content of the DST file.
 * @throws {Error} If the file is invalid.
 */
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
 * @param {string} name - Design name for the G-code file.
 * @returns {string} G-code string representation of the design.
 */
export function generateGCode(steps, name = 'design') {
  //––– calculate stitch count & raw extents
  const stitchCount = steps.length
  const xs = steps.map((s) => s.x2),
    ys = steps.map((s) => s.y2)
  const minX = Math.min(...xs),
    maxX = Math.max(...xs)
  const minY = Math.min(...ys),
    maxY = Math.max(...ys)
  const width = maxX - minX,
    height = maxY - minY

  //––– your machine's travel limits
  const deviceMaxX = 70
  const deviceMaxY = 130
  
  // Check if design fits within machine limits (using the variables!)
  if (width > deviceMaxX || height > deviceMaxY) {
    console.warn(`Design size (${width.toFixed(1)} x ${height.toFixed(1)}) exceeds machine limits (${deviceMaxX} x ${deviceMaxY})`)
  }

  //––– compute uniform scale
  const scaleX = width > 0 ? deviceMaxX / width : 1
  const scaleY = height > 0 ? deviceMaxY / height : 1
  const scale = Math.min(scaleX, scaleY)

  // Use maxX, maxY for metadata and validation
  let gcode = []
  gcode.push(`; Design Bounds Analysis`)
  gcode.push(`; Original size: ${width.toFixed(3)} x ${height.toFixed(3)}`)
  gcode.push(`; Machine limits: ${deviceMaxX} x ${deviceMaxY}`)
  gcode.push(`; Scale factor: ${scale.toFixed(3)}`)
  gcode.push(`; Final size: ${(width * scale).toFixed(3)} x ${(height * scale).toFixed(3)}`)
  
  gcode.push(`Design name: ${name}`)
  gcode.push(`Generated on: ${new Date().toISOString()}`)
  gcode.push(`(STITCH_COUNT:${stitchCount})`)
  gcode.push(`(EXTENTS_LEFT:${minX.toFixed(3)})`)
  gcode.push(`(EXTENTS_TOP:${minY.toFixed(3)})`)
  gcode.push(`(EXTENTS_RIGHT:${maxX.toFixed(3)})`) // Using maxX here!
  gcode.push(`(EXTENTS_BOTTOM:${maxY.toFixed(3)})`) // Using maxY here!
  gcode.push(`(EXTENTS_WIDTH:${width.toFixed(3)})`)
  gcode.push(`(EXTENTS_HEIGHT:${height.toFixed(3)})`)

  // Machine setup
  gcode.push('G90') // Absolute positioning
  gcode.push('G21') // Units in mm
  gcode.push('G28') // Home
  gcode.push('G0 X0.0 Y0.0') // Move to origin
  gcode.push('')

  // Apply scale & emit moves
  let currentZ = 0
  const dz = 5
  
  steps.forEach((step, index) => {
    // Translate to zero-origin, then scale
    const x = ((step.x2 - minX) * scale).toFixed(3)
    const y = ((step.y2 - minY) * scale).toFixed(3)
    
    // Move to position
    gcode.push(`G0 X${x} Y${y} ; Step ${index + 1}`)
    
    // Z movement for visualization
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

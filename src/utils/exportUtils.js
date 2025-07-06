try {
  // Ensure fileContent is defined before validation
  const fileContent = new Uint8Array([
    /* Binary content of the DST file */
  ])
  validateDST(fileContent)
  validateDSTStitches(fileContent)
  console.log('DST file is valid')
} catch (error) {
  console.error('DST file validation failed:', error.message)
}

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
    const x = stitches[i]
    const y = stitches[i + 1]
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
export function toDST(name) {
  const maxWidth = 70 // Maximum width in stitches
  const maxHeight = 130 // Maximum height in stitches

  // Validate design dimensions
  validateDesignDimensions(this.steps, maxWidth, maxHeight)

  const header = new Uint8Array(512).fill(0x20) // Placeholder header
  const nameBytes = new TextEncoder().encode(name.slice(0, 20)) // Limit name to 20 characters
  header.set(nameBytes, 0) // Add design name to header

  // Add metadata to header
  const stitchCount = this.steps.length
  const maxX = Math.round(this.maxX)
  const maxY = Math.round(this.maxY)
  const stitchCountBytes = new TextEncoder().encode(stitchCount.toString().padStart(7, ' '))
  header.set(stitchCountBytes, 90) // Stitch count at offset 90
  header.set(new TextEncoder().encode(maxWidth.toString().padStart(5, ' ')), 100) // Max width
  header.set(new TextEncoder().encode(maxHeight.toString().padStart(5, ' ')), 105) // Max height

  // Encode stitches
  const stitches = this.steps.map((step) => {
    const x = Math.round(step.x2 - step.x1)
    const y = Math.round(step.y2 - step.y1)
    const flags = step.penDown ? 0x00 : 0x80 // Pen down or jump stitch

    // Handle signed 8-bit encoding for DST
    const encodedX = x < 0 ? 0x100 + x : x
    const encodedY = y < 0 ? 0x100 + y : y

    return [encodedX & 0xff, encodedY & 0xff, flags]
  })

  // Add end-of-file marker
  const dstContent = [header, ...stitches.flat(), [0x00, 0x00, 0xf3]] // End of file
  return new Uint8Array(dstContent.flat())
}

/**
 * Generates G-code from stitch data.
 * @param {Array} steps - Array of stitch steps containing x1, y1, x2, y2, and penDown.
 * @param {string} name - Design name for the G-code file.
 * @returns {string} G-code string representation of the design.
 */
export function generateGCode(steps, name = 'design') {
  let gcode = []
  let currentZ = 0

  // G-code header
  gcode.push('; G-code generated from StitchPad')
  gcode.push(`; Design name: ${name}`)
  gcode.push(`; Generated on: ${new Date().toISOString()}`)
  gcode.push('G21 ; Set units to millimeters')
  gcode.push('G90 ; Absolute positioning')
  gcode.push('G28 ; Home all axes')
  gcode.push('')

  // Process each step
  steps.forEach((step, index) => {
    if (step.penDown) {
      // Move to start position
      gcode.push(`G0 X${step.x1.toFixed(2)} Y${step.y1.toFixed(2)} Z${currentZ.toFixed(2)}`)
      // Draw to end position
      gcode.push(`G1 X${step.x2.toFixed(2)} Y${step.y2.toFixed(2)} Z${currentZ.toFixed(2)}`)
      currentZ += 5
    } else {
      // Jump stitch - lift pen and move
      gcode.push(`G0 X${step.x1.toFixed(2)} Y${step.y1.toFixed(2)} Z${currentZ.toFixed(2)}`)
      gcode.push(`G0 X${step.x2.toFixed(2)} Y${step.y2.toFixed(2)} Z${currentZ.toFixed(2)}`)
      currentZ += 5
    }
  })

  // G-code footer
  gcode.push('')
  gcode.push('G28 ; Home all axes')
  gcode.push('M30 ; Program end')

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

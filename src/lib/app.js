class TurtleShepherd {
  constructor() {
    this.steps = []
    this.cache = []
    this.maxX = 0
    this.maxY = 0
    this.currentX = 0
    this.currentY = 0
  }

  clear() {
    this.steps = []
    this.cache = []
    this.maxX = 0
    this.maxY = 0
    this.currentX = 0
    this.currentY = 0
  }

  addPoint(x, y) {
    // If this is the first point, just set the current position
    if (this.steps.length === 0) {
      this.currentX = x
      this.currentY = y
      this.maxX = Math.max(this.maxX, x)
      this.maxY = Math.max(this.maxY, y)
      return
    }

    // For subsequent points, create a line from current position to new point
    this.moveTo(this.currentX, this.currentY, x, y, true)
    this.currentX = x
    this.currentY = y
  }

  // Add undo functionality
  undoStep() {
    if (this.steps.length > 0) {
      this.steps.pop()
      // Recalculate maxX and maxY
      this.maxX = Math.max(...this.steps.map((s) => Math.max(s.x1, s.x2)), 0)
      this.maxY = Math.max(...this.steps.map((s) => Math.max(s.y1, s.y2)), 0)

      // Update current position to last point
      if (this.steps.length > 0) {
        const lastStep = this.steps[this.steps.length - 1]
        this.currentX = lastStep.x2
        this.currentY = lastStep.y2
      } else {
        this.currentX = 0
        this.currentY = 0
      }
    }
  }

  moveTo(x1, y1, x2, y2, penDown) {
    this.steps.push({ x1, y1, x2, y2, penDown })
    this.maxX = Math.max(this.maxX, x2, x1)
    this.maxY = Math.max(this.maxY, y2, y1)
    // Update current position
    this.currentX = x2
    this.currentY = y2
  }

  toDST(name) {
    const header = new Uint8Array(512).fill(0x20) // Placeholder header
    const nameBytes = new TextEncoder().encode(name.slice(0, 20)) // Limit name to 20 characters
    header.set(nameBytes, 0) // Add name to header

    // Add metadata to header
    const stitchCount = this.steps.length
    const stitchCountBytes = new TextEncoder().encode(stitchCount.toString().padStart(7, ' '))
    header.set(stitchCountBytes, 90) // Stitch count at offset 90
    header.set(new TextEncoder().encode(this.maxX.toString().padStart(5, ' ')), 100) // Max X
    header.set(new TextEncoder().encode(this.maxY.toString().padStart(5, ' ')), 105) // Max Y

    // Encode stitches (3 bytes per stitch)
    const stitchBytes = new Uint8Array(this.steps.length * 3)
    let o = 0
    for (const step of this.steps) {
      const x = Math.round(step.x2 - step.x1)
      const y = Math.round(step.y2 - step.y1)
      const flags = step.penDown ? 0x00 : 0x80 // Pen down or jump stitch

      const encodedX = x < 0 ? 0x100 + x : x
      const encodedY = y < 0 ? 0x100 + y : y

      stitchBytes[o++] = encodedX & 0xff
      stitchBytes[o++] = encodedY & 0xff
      stitchBytes[o++] = flags
    }

    // Add end-of-file marker
    const eof = new Uint8Array([0x00, 0x00, 0xf3])

    // NOTE: Array.flat() does not flatten Uint8Array; build a contiguous buffer instead.
    const out = new Uint8Array(header.length + stitchBytes.length + eof.length)
    out.set(header, 0)
    out.set(stitchBytes, header.length)
    out.set(eof, header.length + stitchBytes.length)
    return out
  }
  toEXP() {
    const header = new Uint8Array(512).fill(0x20) // Placeholder header

    const stitchBytes = new Uint8Array(this.steps.length * 3)
    let o = 0
    for (const step of this.steps) {
      const x = Math.round(step.x2 - step.x1)
      const y = Math.round(step.y2 - step.y1)
      const flags = step.penDown ? 0x00 : 0x80 // Pen down or jump stitch
      stitchBytes[o++] = x & 0xff
      stitchBytes[o++] = y & 0xff
      stitchBytes[o++] = flags
    }

    const eof = new Uint8Array([0x00, 0x00, 0xf3])
    const out = new Uint8Array(header.length + stitchBytes.length + eof.length)
    out.set(header, 0)
    out.set(stitchBytes, header.length)
    out.set(eof, header.length + stitchBytes.length)
    return out
  }
  toSVG() {
    const viewBoxWidth = this.maxX + 10 // Add padding
    const viewBoxHeight = this.maxY + 10 // Add padding
    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">`
    const svgFooter = '</svg>'
    const svgContent = this.steps
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
  fromDST(content) {
    // Remove unused header variable
    content.slice(0, 512) // Just slice without assigning to header
    const stitches = content.slice(512, -3) // Extract stitches (excluding EOF marker)

    this.steps = []
    let x = 0,
      y = 0

    for (let i = 0; i < stitches.length; i += 3) {
      const dx = stitches[i] & 0x80 ? -(0x100 - stitches[i]) : stitches[i]
      const dy = stitches[i + 1] & 0x80 ? -(0x100 - stitches[i + 1]) : stitches[i + 1]
      const flags = stitches[i + 2]

      x += dx
      y += dy

      this.steps.push({
        x1: x - dx,
        y1: y - dy,
        x2: x,
        y2: y,
        penDown: flags === 0x00,
      })
    }
  }
  normalize() {
    // TODO: Implement normalization logic
  }
  zoom(factor = 1.0) {
    if (factor <= 0) {
      throw new Error('Zoom factor must be positive')
    }

    // Scale all existing steps
    this.steps = this.steps.map((step) => ({
      x1: step.x1 * factor,
      y1: step.y1 * factor,
      x2: step.x2 * factor,
      y2: step.y2 * factor,
      penDown: step.penDown,
    }))

    // Update max dimensions
    this.maxX *= factor
    this.maxY *= factor

    // Update current position
    this.currentX *= factor
    this.currentY *= factor

    // Recalculate actual max values to ensure accuracy
    if (this.steps.length > 0) {
      this.maxX = Math.max(...this.steps.map((s) => Math.max(s.x1, s.x2)))
      this.maxY = Math.max(...this.steps.map((s) => Math.max(s.y1, s.y2)))
    }

    return this // Allow method chaining
  }

  // Helper methods for common zoom operations
  zoomIn(factor = 1.25) {
    return this.zoom(factor)
  }

  zoomOut(factor = 0.8) {
    return this.zoom(factor)
  }

  resetZoom() {
    // This would require storing original coordinates or a base scale
    // For now, we'll just normalize to a standard size
    return this.normalize()
  }
}

export { TurtleShepherd }
export function exportDST(ts, name) {
  return ts.toDST(name)
}
export function exportEXP(ts) {
  return ts.toEXP()
}
export function exportSVG(ts) {
  return ts.toSVG()
}
export function importDST(ts, content) {
  return ts.fromDST(content)
}

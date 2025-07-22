import { describe, it, expect } from 'vitest'
import { TurtleShepherd } from '@/lib/app.js'
import { validateDST, generateGCode } from '@/utils/exportUtils.js'

describe('Export Formats', () => {
  it('should create valid DST header', () => {
    const shepherd = new TurtleShepherd()
    shepherd.moveTo(0, 0, 10, 10, true)
    shepherd.moveTo(10, 10, 20, 20, true)

    const dstData = shepherd.toDST('test-design')

    // Check minimum length (header + stitches + EOF)
    expect(dstData.length).toBeGreaterThan(515)

    // Check EOF marker
    const eofMarker = dstData.slice(-3)
    expect(Array.from(eofMarker)).toEqual([0x00, 0x00, 0xf3])

    // Validate DST structure
    expect(() => validateDST(dstData)).not.toThrow()
  })

  it('should generate valid G-code', () => {
    const steps = [
      { x1: 0, y1: 0, x2: 10, y2: 10, penDown: true },
      { x1: 10, y1: 10, x2: 20, y2: 20, penDown: true },
    ]

    const gcode = generateGCode(steps, 'test-design')

    // Check required G-code commands
    expect(gcode).toContain('G90') // Absolute positioning
    expect(gcode).toContain('G21') // Units in mm
    expect(gcode).toContain('G28') // Home
    expect(gcode).toContain('M30') // Program end
    expect(gcode).toContain('Design name: test-design')
  })

  it('should handle empty design gracefully', () => {
    const shepherd = new TurtleShepherd()

    expect(() => {
      shepherd.toDST('empty-design')
    }).not.toThrow()

    const dstData = shepherd.toDST('empty-design')
    expect(dstData.length).toBe(515) // Header + EOF only
  })
})

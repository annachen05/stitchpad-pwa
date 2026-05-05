import { describe, it, expect } from 'vitest'
import { TurtleShepherd } from '@/lib/app.js'
import { generateGCode } from '@/utils/exportUtils.js'

describe('Export Formats', () => {
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
})

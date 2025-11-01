import { describe, it, expect, beforeEach } from 'vitest'
import { 
  imageToBinary, 
  medianFilter, 
  simplifyPath, 
  smoothPath,
  traceCenterlines,
  skeletonize
} from '@/utils/vectorizeUtils.js'

describe('Vectorization Utils', () => {
  describe('imageToBinary', () => {
    it('should convert image data to binary based on threshold', () => {
      const imageData = {
        width: 3,
        height: 3,
        data: new Uint8ClampedArray([
          // Row 1: white pixels (255, 255, 255)
          255, 255, 255, 255,
          255, 255, 255, 255,
          255, 255, 255, 255,
          // Row 2: mixed
          0, 0, 0, 255,
          128, 128, 128, 255,
          255, 255, 255, 255,
          // Row 3: black pixels (0, 0, 0)
          0, 0, 0, 255,
          0, 0, 0, 255,
          0, 0, 0, 255,
        ])
      }

      const result = imageToBinary(imageData, 128)

      expect(result.width).toBe(3)
      expect(result.height).toBe(3)
      expect(result.binary[0]).toBe(0) // white -> 0
      expect(result.binary[3]).toBe(1) // black -> 1
      expect(result.binary[4]).toBe(0) // 128 at threshold 128 -> 0 (not less than threshold)
    })
  })

  describe('simplifyPath', () => {
    it('should simplify a straight line to two points', () => {
      const points = [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4]
      ]

      const simplified = simplifyPath(points, 0.5)

      expect(simplified.length).toBe(2)
      expect(simplified[0]).toEqual([0, 0])
      expect(simplified[1]).toEqual([4, 4])
    })

    it('should keep corner points', () => {
      const points = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10]
      ]

      const simplified = simplifyPath(points, 0.5)

      // Should keep all corner points
      expect(simplified.length).toBeGreaterThan(2)
    })

    it('should return original points if already simple', () => {
      const points = [
        [0, 0],
        [10, 10]
      ]

      const simplified = simplifyPath(points, 0.5)

      expect(simplified).toEqual(points)
    })
  })

  describe('smoothPath', () => {
    it('should increase number of points when smoothing', () => {
      const points = [
        [0, 0],
        [10, 0],
        [10, 10]
      ]

      const smoothed = smoothPath(points, 1)

      expect(smoothed.length).toBeGreaterThan(points.length)
    })

    it('should preserve start and end points', () => {
      const points = [
        [0, 0],
        [10, 0],
        [10, 10]
      ]

      const smoothed = smoothPath(points, 2)

      expect(smoothed[0]).toEqual(points[0])
      expect(smoothed[smoothed.length - 1]).toEqual(points[points.length - 1])
    })

    it('should not modify path with 0 iterations', () => {
      const points = [
        [0, 0],
        [10, 0],
        [10, 10]
      ]

      const smoothed = smoothPath(points, 0)

      expect(smoothed).toEqual(points)
    })
  })

  describe('medianFilter', () => {
    it('should reduce noise in binary image', () => {
      // Create a noisy image (mostly black with one white pixel in center)
      const width = 5
      const height = 5
      const binary = new Uint8Array(width * height).fill(1)
      
      // Add noise (one white pixel in black area)
      binary[12] = 0 // center pixel

      const filtered = medianFilter(binary, width, height, 3)

      // Center pixel should be corrected to black (1) by median filter
      expect(filtered[12]).toBe(1)
    })
  })

  describe('traceCenterlines', () => {
    it('should trace a simple horizontal line', () => {
      const width = 5
      const height = 3
      const skeleton = new Uint8Array([
        0, 0, 0, 0, 0,
        1, 1, 1, 1, 1,
        0, 0, 0, 0, 0,
      ])

      const paths = traceCenterlines(skeleton, width, height)

      expect(paths.length).toBeGreaterThan(0)
      expect(paths[0].length).toBeGreaterThan(1)
    })

    it('should handle empty skeleton', () => {
      const width = 3
      const height = 3
      const skeleton = new Uint8Array(width * height).fill(0)

      const paths = traceCenterlines(skeleton, width, height)

      expect(paths.length).toBe(0)
    })
  })

  describe('skeletonize', () => {
    it('should thin a thick line to single pixel width', () => {
      const width = 5
      const height = 5
      const binary = new Uint8Array([
        0, 0, 0, 0, 0,
        0, 1, 1, 1, 0,
        0, 1, 1, 1, 0,
        0, 1, 1, 1, 0,
        0, 0, 0, 0, 0,
      ])

      const skeleton = skeletonize(binary, width, height)

      // Count remaining pixels - should be fewer than original
      const originalCount = binary.reduce((sum, val) => sum + val, 0)
      const skeletonCount = skeleton.reduce((sum, val) => sum + val, 0)

      expect(skeletonCount).toBeLessThan(originalCount)
      expect(skeletonCount).toBeGreaterThan(0)
    })
  })
})

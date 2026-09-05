import { describe, it, expect, beforeEach } from 'vitest'
import { 
  imageToBinary, 
  medianFilter, 
  simplifyPath, 
  smoothPath,
  traceCenterlines,
  skeletonize,
  pruneSkeletonSpurs,
  buildAutoVectorizationProfile,
  cleanupVectorPaths
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

  describe('buildAutoVectorizationProfile', () => {
    function createSimpleImageData(width, height, valueAt) {
      const data = new Uint8ClampedArray(width * height * 4)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const v = valueAt(x, y)
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
          data[i + 3] = 255
        }
      }
      return { width, height, data }
    }

    it('should prefer line-art defaults for PDF sources', () => {
      const imageData = createSimpleImageData(20, 20, (x, y) => ((x + y) % 6 === 0 ? 30 : 230))
      const profile = buildAutoVectorizationProfile(imageData, 'pdf')

      expect(profile.useCanny).toBe(false)
      expect(profile.autoThreshold).toBe(true)
      expect(profile.cropToContent).toBe(true)
      expect(profile.removeBorderArtifacts).toBe(true)
      expect(profile.pruneSpurs).toBe(true)
      expect(profile.useMorphology).toBe(true)
      expect(profile.morphologyOperation).toBe('closing')
      expect(profile.applySkeletonize).toBe(true)
      expect(profile._autoProfileName).toBe('pdf-line-art')
    })

    it('should prefer adaptive defaults for generic image sources', () => {
      const imageData = createSimpleImageData(20, 20, (x, y) => ((x * y) % 9 === 0 ? 50 : 200))
      const profile = buildAutoVectorizationProfile(imageData, 'image')

      expect(profile.useCanny).toBe(false)
      expect(profile.useAdaptiveThreshold).toBe(true)
      expect(profile.useMorphology).toBe(true)
      expect(profile.morphologyOperation).toBe('opening')
      expect(profile.applySkeletonize).toBe(true)
      expect(profile._autoProfileName).toBe('general-image')
    })
  })

  describe('cleanupVectorPaths', () => {
    it('should remove tiny noisy paths', () => {
      const paths = [
        [[0, 0], [10, 0], [20, 0]],
        [[5, 5], [6, 5]], // too short and too few points
      ]

      const cleaned = cleanupVectorPaths(paths, {
        minPathLength: 4,
        minPathPoints: 3,
        mergePathGap: 2,
      })

      expect(cleaned.length).toBe(1)
      expect(cleaned[0].length).toBe(3)
    })

    it('should merge nearby endpoint paths', () => {
      const paths = [
        [[0, 0], [10, 0], [20, 0]],
        [[21, 0], [30, 0], [40, 0]],
      ]

      const cleaned = cleanupVectorPaths(paths, {
        minPathLength: 1,
        minPathPoints: 2,
        mergePathGap: 2,
        sortPaths: false,
      })

      expect(cleaned.length).toBe(1)
      expect(cleaned[0].length).toBeGreaterThanOrEqual(6)
    })

    it('should remove large border-touching artifact paths', () => {
      const borderPath = [[0, 0], [99, 0], [99, 90], [0, 90], [0, 0]]
      const starPath = [[30, 20], [40, 10], [50, 20], [40, 30], [30, 20]]

      const cleaned = cleanupVectorPaths([borderPath, starPath], {
        minPathLength: 1,
        minPathPoints: 3,
        mergePathGap: 2,
        imageWidth: 100,
        imageHeight: 100,
        removeBorderArtifacts: true,
        borderCoverageThreshold: 0.6,
      })

      expect(cleaned.length).toBe(1)
      expect(cleaned[0]).toEqual(starPath)
    })
  })

  describe('pruneSkeletonSpurs', () => {
    it('should remove a short dangling branch', () => {
      const width = 7
      const height = 7
      const skel = new Uint8Array(width * height).fill(0)

      // Main vertical line (x=3, y=1..5)
      for (let y = 1; y <= 5; y++) skel[y * width + 3] = 1
      // Short spur to the right near the center
      skel[3 * width + 4] = 1

      const pruned = pruneSkeletonSpurs(skel, width, height, 2, 2)
      expect(pruned[3 * width + 4]).toBe(0)
      expect(pruned[2 * width + 3]).toBe(1)
      expect(pruned[4 * width + 3]).toBe(1)
    })
  })
})

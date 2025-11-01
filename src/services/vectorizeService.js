import { vectorizeImage, simplifyPath, smoothPath } from '@/utils/vectorizeUtils.js'

export class VectorizeService {
  static async processImage(imageDataUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = async () => {
        try {
          const paths = await vectorizeImage(img, options)
          resolve(paths)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = imageDataUrl
    })
  }
  
  /**
   * Convert paths to stitches with optional auto-scaling to fit canvas
   */
  static convertPathsToStitches(paths, scale = 1, canvasWidth = null, canvasHeight = null, autoFit = true) {
    if (!paths || paths.length === 0) return []
    
    const stitches = []
    
    // If auto-fit is disabled or no canvas size provided, use original coordinates
    if (!autoFit || !canvasWidth || !canvasHeight) {
      for (const path of paths) {
        for (let i = 0; i < path.length - 1; i++) {
          const [x1, y1] = path[i]
          const [x2, y2] = path[i + 1]
          
          stitches.push({
            x1: x1 * scale,
            y1: y1 * scale,
            x2: x2 * scale,
            y2: y2 * scale,
            penDown: true
          })
        }
        
        // Add jump stitch to next path
        if (paths.indexOf(path) < paths.length - 1) {
          const lastPoint = path[path.length - 1]
          const nextPath = paths[paths.indexOf(path) + 1]
          const firstPoint = nextPath[0]
          
          stitches.push({
            x1: lastPoint[0] * scale,
            y1: lastPoint[1] * scale,
            x2: firstPoint[0] * scale,
            y2: firstPoint[1] * scale,
            penDown: false
          })
        }
      }
      
      return stitches
    }
    
    // Find bounding box of all paths
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const path of paths) {
      for (const [x, y] of path) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
    
    const width = maxX - minX
    const height = maxY - minY
    
    // Calculate scale to fit canvas (with 10% margin for safety)
    const margin = 0.9 // Use 90% of canvas size
    const scaleX = (canvasWidth * margin) / width
    const scaleY = (canvasHeight * margin) / height
    const autoScale = Math.min(scaleX, scaleY)
    
    // Calculate offset to center the design
    const scaledWidth = width * autoScale
    const scaledHeight = height * autoScale
    const offsetX = (canvasWidth - scaledWidth) / 2
    const offsetY = (canvasHeight - scaledHeight) / 2
    
    console.log('Auto-fitting paths to canvas:', {
      original: { width, height, minX, minY, maxX, maxY },
      canvas: { width: canvasWidth, height: canvasHeight },
      autoScale,
      userScale: scale,
      finalScale: autoScale * scale,
      offset: { x: offsetX, y: offsetY },
      centered: { x: offsetX + scaledWidth / 2, y: offsetY + scaledHeight / 2 }
    })
    
    // Transform paths with auto-fit
    for (const path of paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const [x1, y1] = path[i]
        const [x2, y2] = path[i + 1]
        
        // Apply transformations: translate to origin, scale, apply user scale, center on canvas
        stitches.push({
          x1: ((x1 - minX) * autoScale * scale) + offsetX,
          y1: ((y1 - minY) * autoScale * scale) + offsetY,
          x2: ((x2 - minX) * autoScale * scale) + offsetX,
          y2: ((y2 - minY) * autoScale * scale) + offsetY,
          penDown: true
        })
      }
      
      // Add jump stitch to next path
      if (paths.indexOf(path) < paths.length - 1) {
        const lastPoint = path[path.length - 1]
        const nextPath = paths[paths.indexOf(path) + 1]
        const firstPoint = nextPath[0]
        
        stitches.push({
          x1: ((lastPoint[0] - minX) * autoScale * scale) + offsetX,
          y1: ((lastPoint[1] - minY) * autoScale * scale) + offsetY,
          x2: ((firstPoint[0] - minX) * autoScale * scale) + offsetX,
          y2: ((firstPoint[1] - minY) * autoScale * scale) + offsetY,
          penDown: false
        })
      }
    }
    
    return stitches
  }
  
  /**
   * Calculate bounds of paths for preview
   */
  static calculateBounds(paths) {
    if (!paths || paths.length === 0) return null
    
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const path of paths) {
      for (const [x, y] of path) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
    
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
}
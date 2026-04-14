/**
 * Image vectorization utilities using centerline tracing
 * Inspired by Incrediplotter's approach
 */

/**
 * CLAHE - Contrast Limited Adaptive Histogram Equalization
 * Much better than standard histogram equalization for uneven lighting
 */
export function applyCLAHE(imageData, clipLimit = 2.0, tileSize = 8) {
  const { width, height, data } = imageData
  const enhanced = new Uint8ClampedArray(data)
  
  // Convert to grayscale for processing
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }
  
  const tilesX = Math.ceil(width / tileSize)
  const tilesY = Math.ceil(height / tileSize)
  
  // Build histograms for each tile
  const tileHistograms = []
  
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const hist = new Array(256).fill(0)
      
      const x0 = tx * tileSize
      const y0 = ty * tileSize
      const x1 = Math.min(x0 + tileSize, width)
      const y1 = Math.min(y0 + tileSize, height)
      
      // Build histogram for this tile
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * width + x]]++
        }
      }
      
      // Apply clipping
      const pixelsPerTile = (x1 - x0) * (y1 - y0)
      const clipValue = Math.floor((clipLimit * pixelsPerTile) / 256)
      
      let clippedPixels = 0
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clipValue) {
          clippedPixels += hist[i] - clipValue
          hist[i] = clipValue
        }
      }
      
      // Redistribute clipped pixels
      const redistribution = Math.floor(clippedPixels / 256)
      const remainder = clippedPixels % 256
      for (let i = 0; i < 256; i++) {
        hist[i] += redistribution
        if (i < remainder) hist[i]++
      }
      
      // Calculate CDF
      const cdf = new Array(256)
      cdf[0] = hist[0]
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + hist[i]
      }
      
      // Normalize CDF
      const cdfMin = cdf.find(v => v > 0) || 0
      const cdfMax = cdf[255]
      const normalized = cdf.map(v => 
        Math.round(((v - cdfMin) / (cdfMax - cdfMin)) * 255)
      )
      
      tileHistograms.push(normalized)
    }
  }
  
  // Apply equalization with bilinear interpolation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const grayValue = gray[y * width + x]
      
      // Find which tiles this pixel belongs to
      const tx = Math.min(x / tileSize, tilesX - 1)
      const ty = Math.min(y / tileSize, tilesY - 1)
      
      const tx0 = Math.floor(tx)
      const ty0 = Math.floor(ty)
      const tx1 = Math.min(tx0 + 1, tilesX - 1)
      const ty1 = Math.min(ty0 + 1, tilesY - 1)
      
      const fx = tx - tx0
      const fy = ty - ty0
      
      // Bilinear interpolation between 4 neighboring tiles
      const v00 = tileHistograms[ty0 * tilesX + tx0][grayValue]
      const v10 = tileHistograms[ty0 * tilesX + tx1][grayValue]
      const v01 = tileHistograms[ty1 * tilesX + tx0][grayValue]
      const v11 = tileHistograms[ty1 * tilesX + tx1][grayValue]
      
      const v0 = v00 * (1 - fx) + v10 * fx
      const v1 = v01 * (1 - fx) + v11 * fx
      const newValue = Math.round(v0 * (1 - fy) + v1 * fy)
      
      // Apply to all channels
      const idx = (y * width + x) * 4
      const ratio = newValue / Math.max(grayValue, 1)
      enhanced[idx] = Math.min(255, Math.round(data[idx] * ratio))
      enhanced[idx + 1] = Math.min(255, Math.round(data[idx + 1] * ratio))
      enhanced[idx + 2] = Math.min(255, Math.round(data[idx + 2] * ratio))
      enhanced[idx + 3] = data[idx + 3]
    }
  }
  
  return { width, height, data: enhanced }
}

/**
 * Unsharp mask for better edge definition
 */
export function unsharpMask(imageData, amount = 1.5, radius = 1.0, threshold = 0) {
  const { width, height, data } = imageData
  const result = new Uint8ClampedArray(data)
  
  // Create blurred version
  const blurred = gaussianBlur(imageData, radius)
  
  // Apply unsharp mask formula
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c]
      const blur = blurred.data[i + c]
      const diff = original - blur
      
      if (Math.abs(diff) > threshold) {
        result[i + c] = Math.max(0, Math.min(255, original + amount * diff))
      } else {
        result[i + c] = original
      }
    }
    result[i + 3] = data[i + 3]
  }
  
  return { width, height, data: result }
}

/**
 * Gaussian blur helper
 */
function gaussianBlur(imageData, radius) {
  const { width, height, data } = imageData
  const blurred = new Uint8ClampedArray(data)
  
  // Create 1D Gaussian kernel
  const kernelSize = Math.ceil(radius * 3) * 2 + 1
  const kernel = new Array(kernelSize)
  const sigma = radius
  const sigma2 = 2 * sigma * sigma
  let sum = 0
  
  for (let i = 0; i < kernelSize; i++) {
    const x = i - Math.floor(kernelSize / 2)
    kernel[i] = Math.exp(-(x * x) / sigma2)
    sum += kernel[i]
  }
  
  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum
  }
  
  const temp = new Uint8ClampedArray(data.length)
  const halfKernel = Math.floor(kernelSize / 2)
  
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let k = 0; k < kernelSize; k++) {
          const xk = Math.max(0, Math.min(width - 1, x + k - halfKernel))
          sum += data[(y * width + xk) * 4 + c] * kernel[k]
        }
        temp[(y * width + x) * 4 + c] = sum
      }
      temp[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]
    }
  }
  
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let k = 0; k < kernelSize; k++) {
          const yk = Math.max(0, Math.min(height - 1, y + k - halfKernel))
          sum += temp[(yk * width + x) * 4 + c] * kernel[k]
        }
        blurred[(y * width + x) * 4 + c] = sum
      }
      blurred[(y * width + x) * 4 + 3] = temp[(y * width + x) * 4 + 3]
    }
  }
  
  return { width, height, data: blurred }
}

/**
 * Canny Edge Detection - Industry standard, better than Sobel
 */
export function cannyEdgeDetection(imageData, lowThreshold = 50, highThreshold = 100) {
  const { width, height, data } = imageData
  
  // Convert to grayscale
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }
  
  // Gaussian blur to reduce noise
  const blurred = new Uint8Array(width * height)
  const gaussianKernel = [
    2, 4, 5, 4, 2,
    4, 9, 12, 9, 4,
    5, 12, 15, 12, 5,
    4, 9, 12, 9, 4,
    2, 4, 5, 4, 2
  ]
  const kernelSum = 159
  
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let sum = 0
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * gaussianKernel[(ky + 2) * 5 + (kx + 2)]
        }
      }
      blurred[y * width + x] = Math.round(sum / kernelSum)
    }
  }
  
  // Calculate gradients
  const gradientMag = new Float32Array(width * height)
  const gradientDir = new Float32Array(width * height)
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx = 
        -blurred[(y - 1) * width + (x - 1)] + blurred[(y - 1) * width + (x + 1)] +
        -2 * blurred[y * width + (x - 1)] + 2 * blurred[y * width + (x + 1)] +
        -blurred[(y + 1) * width + (x - 1)] + blurred[(y + 1) * width + (x + 1)]
      
      const gy = 
        -blurred[(y - 1) * width + (x - 1)] - 2 * blurred[(y - 1) * width + x] - blurred[(y - 1) * width + (x + 1)] +
        blurred[(y + 1) * width + (x - 1)] + 2 * blurred[(y + 1) * width + x] + blurred[(y + 1) * width + (x + 1)]
      
      gradientMag[y * width + x] = Math.sqrt(gx * gx + gy * gy)
      gradientDir[y * width + x] = Math.atan2(gy, gx)
    }
  }
  
  // Non-maximum suppression
  const suppressed = new Uint8Array(width * height)
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const angle = gradientDir[idx] * 180 / Math.PI
      const mag = gradientMag[idx]
      
      let neighbor1 = 0, neighbor2 = 0
      
      if ((angle >= -22.5 && angle < 22.5) || (angle >= 157.5 || angle < -157.5)) {
        neighbor1 = gradientMag[y * width + (x + 1)]
        neighbor2 = gradientMag[y * width + (x - 1)]
      } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
        neighbor1 = gradientMag[(y - 1) * width + (x + 1)]
        neighbor2 = gradientMag[(y + 1) * width + (x - 1)]
      } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
        neighbor1 = gradientMag[(y - 1) * width + x]
        neighbor2 = gradientMag[(y + 1) * width + x]
      } else {
        neighbor1 = gradientMag[(y - 1) * width + (x - 1)]
        neighbor2 = gradientMag[(y + 1) * width + (x + 1)]
      }
      
      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[idx] = Math.min(255, mag)
      }
    }
  }
  
  // Double thresholding and edge tracking
  const edges = new Uint8Array(width * height)
  const STRONG = 255
  const WEAK = 128
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const mag = suppressed[idx]
      
      if (mag >= highThreshold) {
        edges[idx] = STRONG
      } else if (mag >= lowThreshold) {
        edges[idx] = WEAK
      }
    }
  }
  
  // Edge tracking by hysteresis
  let changed = true
  let iterations = 0
  const maxIterations = 10
  
  while (changed && iterations < maxIterations) {
    changed = false
    iterations++
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (edges[idx] === WEAK) {
          let hasStrongNeighbor = false
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (edges[(y + dy) * width + (x + dx)] === STRONG) {
                hasStrongNeighbor = true
                break
              }
            }
            if (hasStrongNeighbor) break
          }
          
          if (hasStrongNeighbor) {
            edges[idx] = STRONG
            changed = true
          } else {
            edges[idx] = 0
          }
        }
      }
    }
  }
  
  // Convert to binary
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i] === STRONG ? 1 : 0
  }
  
  return binary
}

/**
 * Morphological operations
 */
export function dilate(binary, width, height, iterations = 1) {
  let result = new Uint8Array(binary)
  
  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8Array(result)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (result[y * width + x] === 1) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              temp[(y + dy) * width + (x + dx)] = 1
            }
          }
        }
      }
    }
    
    result = temp
  }
  
  return result
}

export function erode(binary, width, height, iterations = 1) {
  let result = new Uint8Array(binary)
  
  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8Array(result)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (result[y * width + x] === 1) {
          let allNeighborsSet = true
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (result[(y + dy) * width + (x + dx)] === 0) {
                allNeighborsSet = false
                break
              }
            }
            if (!allNeighborsSet) break
          }
          
          temp[y * width + x] = allNeighborsSet ? 1 : 0
        } else {
          temp[y * width + x] = 0
        }
      }
    }
    
    result = temp
  }
  
  return result
}

export function morphologicalOpening(binary, width, height, iterations = 1) {
  let result = erode(binary, width, height, iterations)
  result = dilate(result, width, height, iterations)
  return result
}

export function morphologicalClosing(binary, width, height, iterations = 1) {
  let result = dilate(binary, width, height, iterations)
  result = erode(result, width, height, iterations)
  return result
}

/**
 * Calculate optimal threshold using Otsu's method
 */
export function calculateOtsuThreshold(imageData) {
  const { data, width, height } = imageData
  const histogram = new Array(256).fill(0)
  
  // Build histogram
  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3)
    histogram[brightness]++
  }
  
  const total = width * height
  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]
  }
  
  let sumB = 0
  let wB = 0
  let wF = 0
  let maxVariance = 0
  let threshold = 0
  
  for (let i = 0; i < 256; i++) {
    wB += histogram[i]
    if (wB === 0) continue
    
    wF = total - wB
    if (wF === 0) break
    
    sumB += i * histogram[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    
    const variance = wB * wF * (mB - mF) * (mB - mF)
    
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = i
    }
  }
  
  return threshold
}

/**
 * Apply adaptive thresholding for better edge detection
 */
export function adaptiveThreshold(imageData, blockSize = 15, c = 10) {
  const { width, height, data } = imageData
  const binary = new Uint8Array(width * height)
  
  // Calculate integral image for fast mean computation
  const integralImage = new Float64Array((width + 1) * (height + 1))
  
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const idx = ((y - 1) * width + (x - 1)) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      integralImage[y * (width + 1) + x] = 
        brightness +
        integralImage[(y - 1) * (width + 1) + x] +
        integralImage[y * (width + 1) + (x - 1)] -
        integralImage[(y - 1) * (width + 1) + (x - 1)]
    }
  }
  
  const halfBlock = Math.floor(blockSize / 2)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - halfBlock)
      const x2 = Math.min(width, x + halfBlock + 1)
      const y1 = Math.max(0, y - halfBlock)
      const y2 = Math.min(height, y + halfBlock + 1)
      
      const count = (x2 - x1) * (y2 - y1)
      const sum = 
        integralImage[y2 * (width + 1) + x2] -
        integralImage[y1 * (width + 1) + x2] -
        integralImage[y2 * (width + 1) + x1] +
        integralImage[y1 * (width + 1) + x1]
      
      const mean = sum / count
      
      const idx = (y * width + x) * 4
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      binary[y * width + x] = brightness < (mean - c) ? 1 : 0
    }
  }
  
  return binary
}

/**
 * Edge detection using Sobel operator
 */
export function detectEdges(imageData, threshold = 30) {
  const { width, height, data } = imageData
  const edges = new Uint8Array(width * height)
  
  // Convert to grayscale first
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3
  }
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0
      let gy = 0
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx)
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          
          gx += gray[idx] * sobelX[kernelIdx]
          gy += gray[idx] * sobelY[kernelIdx]
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      edges[y * width + x] = magnitude > threshold ? 1 : 0
    }
  }
  
  return edges
}

/**
 * Enhance contrast using histogram equalization
 */
export function enhanceContrast(imageData) {
  const { width, height, data } = imageData
  const enhanced = new Uint8ClampedArray(data)
  
  // Calculate histogram for each channel
  const histR = new Array(256).fill(0)
  const histG = new Array(256).fill(0)
  const histB = new Array(256).fill(0)
  
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++
    histG[data[i + 1]]++
    histB[data[i + 2]]++
  }
  
  // Calculate cumulative distribution
  const cdfR = new Array(256)
  const cdfG = new Array(256)
  const cdfB = new Array(256)
  
  cdfR[0] = histR[0]
  cdfG[0] = histG[0]
  cdfB[0] = histB[0]
  
  for (let i = 1; i < 256; i++) {
    cdfR[i] = cdfR[i - 1] + histR[i]
    cdfG[i] = cdfG[i - 1] + histG[i]
    cdfB[i] = cdfB[i - 1] + histB[i]
  }
  
  const totalPixels = width * height
  const cdfMin = Math.min(
    cdfR.find(v => v > 0) || 0,
    cdfG.find(v => v > 0) || 0,
    cdfB.find(v => v > 0) || 0
  )
  
  // Apply equalization
  for (let i = 0; i < data.length; i += 4) {
    enhanced[i] = Math.round(((cdfR[data[i]] - cdfMin) / (totalPixels - cdfMin)) * 255)
    enhanced[i + 1] = Math.round(((cdfG[data[i + 1]] - cdfMin) / (totalPixels - cdfMin)) * 255)
    enhanced[i + 2] = Math.round(((cdfB[data[i + 2]] - cdfMin) / (totalPixels - cdfMin)) * 255)
    enhanced[i + 3] = data[i + 3]
  }
  
  return { width, height, data: enhanced }
}

/**
 * Convert image to binary (black/white) for tracing
 */
export function imageToBinary(imageData, threshold = 128, useAdaptive = false, blockSize = 15) {
  const { width, height, data } = imageData
  
  if (useAdaptive) {
    // Use adaptive thresholding for better results with uneven lighting
    const binary = adaptiveThreshold(imageData, blockSize, 10)
    return { binary, width, height }
  }
  
  const binary = new Uint8Array(width * height)
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const brightness = (r + g + b) / 3
    binary[i / 4] = brightness < threshold ? 1 : 0
  }
  
  return { binary, width, height }
}

/**
 * Apply median filter to smooth binary image
 */
export function medianFilter(binary, width, height, kernelSize = 3) {
  const filtered = new Uint8Array(binary.length)
  const offset = Math.floor(kernelSize / 2)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values = []
      
      for (let ky = -offset; ky <= offset; ky++) {
        for (let kx = -offset; kx <= offset; kx++) {
          const nx = x + kx
          const ny = y + ky
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            values.push(binary[ny * width + nx])
          }
        }
      }
      
      values.sort((a, b) => a - b)
      filtered[y * width + x] = values[Math.floor(values.length / 2)]
    }
  }
  
  return filtered
}

/**
 * Extract skeleton using Zhang-Suen thinning algorithm
 * Optimized version with early termination
 */
export function skeletonize(binary, width, height, maxIterations = 100) {
  const skeleton = new Uint8Array(binary)
  let changed = true
  let iterations = 0
  
  const getNeighbors = (x, y) => {
    return [
      get(x, y - 1), get(x + 1, y - 1), get(x + 1, y), get(x + 1, y + 1),
      get(x, y + 1), get(x - 1, y + 1), get(x - 1, y), get(x - 1, y - 1)
    ]
  }
  
  const get = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0
    return skeleton[y * width + x]
  }
  
  const set = (x, y, val) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      skeleton[y * width + x] = val
    }
  }
  
  while (changed && iterations < maxIterations) {
    changed = false
    iterations++
    
    // Sub-iteration 1
    const toDelete1 = []
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (get(x, y) === 1) {
          const p = getNeighbors(x, y)
          const bp = p.reduce((sum, val) => sum + val, 0)
          const ap = countTransitions(p)
          
          if (bp >= 2 && bp <= 6 && ap === 1) {
            if (p[0] * p[2] * p[4] === 0 && p[2] * p[4] * p[6] === 0) {
              toDelete1.push([x, y])
            }
          }
        }
      }
    }
    
    toDelete1.forEach(([x, y]) => set(x, y, 0))
    if (toDelete1.length > 0) changed = true
    
    // Sub-iteration 2
    const toDelete2 = []
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (get(x, y) === 1) {
          const p = getNeighbors(x, y)
          const bp = p.reduce((sum, val) => sum + val, 0)
          const ap = countTransitions(p)
          
          if (bp >= 2 && bp <= 6 && ap === 1) {
            if (p[0] * p[2] * p[6] === 0 && p[0] * p[4] * p[6] === 0) {
              toDelete2.push([x, y])
            }
          }
        }
      }
    }
    
    toDelete2.forEach(([x, y]) => set(x, y, 0))
    if (toDelete2.length > 0) changed = true
  }
  
  if (iterations >= maxIterations) {
    console.warn('Skeletonization stopped at max iterations:', maxIterations)
  }
  
  return skeleton
}

function getSkeletonNeighbors(skeleton, width, height, x, y) {
  const neighbors = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (skeleton[ny * width + nx] === 1) {
        neighbors.push([nx, ny])
      }
    }
  }
  return neighbors
}

function getSkeletonNeighbors4(skeleton, width, height, x, y) {
  const out = []
  const n4 = [
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y],
  ]

  for (const [nx, ny] of n4) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
    if (skeleton[ny * width + nx] === 1) out.push([nx, ny])
  }

  return out
}

/**
 * Remove short dangling skeleton branches (spurs) that often appear as
 * duplicate tiny lines after tracing.
 */
export function pruneSkeletonSpurs(
  skeleton,
  width,
  height,
  maxBranchLength = 8,
  maxPasses = 2,
  continuationDotThreshold = 0.7,
) {
  if (!skeleton || width <= 0 || height <= 0) return skeleton

  const out = new Uint8Array(skeleton)

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (out[idx] !== 1) continue

        const startNeighbors = getSkeletonNeighbors4(out, width, height, x, y)
        // Endpoint candidates only
        if (startNeighbors.length !== 1) continue

        const branchPixels = [[x, y]]
        let prev = [x, y]
        let curr = startNeighbors[0]
        let steps = 1
        let hitJunction = false
        let hasStrongContinuation = false

        while (steps <= maxBranchLength) {
          const [cx, cy] = curr
          const n = getSkeletonNeighbors4(out, width, height, cx, cy)

          // Exclude the previous pixel to move forward.
          const forward = n.filter(([nx, ny]) => nx !== prev[0] || ny !== prev[1])
          branchPixels.push([cx, cy])

          if (forward.length === 0) {
            // Dead-end chain; removable if short.
            break
          }
          if (forward.length >= 2) {
            // Junction reached.
            const incomingDx = cx - prev[0]
            const incomingDy = cy - prev[1]
            const incomingLen = Math.sqrt(incomingDx * incomingDx + incomingDy * incomingDy) || 1

            let maxDot = -1
            for (const [fx, fy] of forward) {
              const vx = fx - cx
              const vy = fy - cy
              const vLen = Math.sqrt(vx * vx + vy * vy) || 1
              const dot = (incomingDx * vx + incomingDy * vy) / (incomingLen * vLen)
              if (dot > maxDot) maxDot = dot
            }
            hasStrongContinuation = maxDot >= continuationDotThreshold
            hitJunction = true
            break
          }

          prev = curr
          curr = forward[0]
          steps++
        }

        const removable = steps <= maxBranchLength && hitJunction && !hasStrongContinuation
        if (!removable) continue

        // Keep the junction pixel (last), remove only the dangling branch.
        for (let i = 0; i < branchPixels.length - 1; i++) {
          const [rx, ry] = branchPixels[i]
          out[ry * width + rx] = 0
          changed = true
        }
      }
    }

    if (!changed) break
  }

  return out
}

function countTransitions(neighbors) {
  let count = 0
  for (let i = 0; i < neighbors.length; i++) {
    if (neighbors[i] === 0 && neighbors[(i + 1) % neighbors.length] === 1) {
      count++
    }
  }
  return count
}

/**
 * Trace centerlines and convert to path segments
 */
export function traceCenterlines(skeleton, width, height) {
  const visited = new Set()
  const paths = []
  
  const get = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0
    return skeleton[y * width + x]
  }
  
  const getNeighbors = (x, y) => {
    return [
      [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
      [x - 1, y], [x + 1, y],
      [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]
    ].filter(([nx, ny]) => get(nx, ny) === 1 && !visited.has(`${nx},${ny}`))
  }
  
  // Find all starting points (endpoints or junctions)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (get(x, y) === 1 && !visited.has(`${x},${y}`)) {
        const neighbors = getNeighbors(x, y)
        
        // Start tracing from endpoints or junctions
        if (neighbors.length !== 2) {
          const path = tracePath(x, y, skeleton, width, height, visited)
          if (path.length > 1) {
            paths.push(path)
          }
        }
      }
    }
  }
  
  return paths
}

function tracePath(startX, startY, skeleton, width, height, visited) {
  const path = [[startX, startY]]
  visited.add(`${startX},${startY}`)
  
  let [x, y] = [startX, startY]
  
  while (true) {
    const neighbors = []
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nx = x + dx
        const ny = y + dy
        const key = `${nx},${ny}`
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
            skeleton[ny * width + nx] === 1 && !visited.has(key)) {
          neighbors.push([nx, ny])
        }
      }
    }
    
    if (neighbors.length === 0) break
    
    // Choose the neighbor that continues the line most smoothly
    const [nx, ny] = chooseBestNeighbor(path, neighbors)
    path.push([nx, ny])
    visited.add(`${nx},${ny}`)
    x = nx
    y = ny
  }
  
  return path
}

function chooseBestNeighbor(path, neighbors) {
  if (neighbors.length === 1) return neighbors[0]
  
  const lastPoint = path[path.length - 1]
  const prevPoint = path.length > 1 ? path[path.length - 2] : lastPoint
  
  const currentAngle = Math.atan2(
    lastPoint[1] - prevPoint[1],
    lastPoint[0] - prevPoint[0]
  )
  
  let best = neighbors[0]
  let bestScore = Infinity
  
  for (const neighbor of neighbors) {
    const angle = Math.atan2(
      neighbor[1] - lastPoint[1],
      neighbor[0] - lastPoint[0]
    )
    
    const angleDiff = Math.abs(angle - currentAngle)
    const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff)
    
    if (normalizedDiff < bestScore) {
      bestScore = normalizedDiff
      best = neighbor
    }
  }
  
  return best
}

/**
 * Simplify path using Ramer-Douglas-Peucker algorithm
 */
export function simplifyPath(points, tolerance = 2.0) {
  if (points.length <= 2) return points
  
  // Find the point with maximum distance
  let maxDist = 0
  let maxIndex = 0
  
  const start = points[0]
  const end = points[points.length - 1]
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance)
    const right = simplifyPath(points.slice(maxIndex), tolerance)
    
    return [...left.slice(0, -1), ...right]
  } else {
    return [start, end]
  }
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd
  
  const dx = x2 - x1
  const dy = y2 - y1
  
  const numerator = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1)
  const denominator = Math.sqrt(dx * dx + dy * dy)
  
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Smooth path using Chaikin's corner cutting algorithm
 */
export function smoothPath(points, iterations = 2) {
  let smoothed = points
  
  for (let iter = 0; iter < iterations; iter++) {
    const newPoints = [smoothed[0]]
    
    for (let i = 0; i < smoothed.length - 1; i++) {
      const [x1, y1] = smoothed[i]
      const [x2, y2] = smoothed[i + 1]
      
      const q = [
        x1 * 0.75 + x2 * 0.25,
        y1 * 0.75 + y2 * 0.25
      ]
      
      const r = [
        x1 * 0.25 + x2 * 0.75,
        y1 * 0.25 + y2 * 0.75
      ]
      
      newPoints.push(q, r)
    }
    
    newPoints.push(smoothed[smoothed.length - 1])
    smoothed = newPoints
  }
  
  return smoothed
}

/**
 * Fit Bezier curves to path for smoother results (Potrace-style)
 * Simplified version - just uses the existing simplification as a base
 */
export function fitBezierCurves(path, errorThreshold = 1.0) {
  // For now, just apply simplification - full Bezier fitting is complex
  // This is a placeholder that provides better results than raw paths
  return simplifyPath(path, errorThreshold)
}

function pathLength(path) {
  if (!path || path.length < 2) return 0
  let len = 0
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0]
    const dy = path[i + 1][1] - path[i][1]
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

function pathBounds(path) {
  if (!path || path.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const [x, y] of path) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

function reversePointPath(path) {
  return [...path].reverse()
}

function endpointDistance(aPath, bPath, aAtEnd = true, bAtStart = true) {
  const a = aAtEnd ? aPath[aPath.length - 1] : aPath[0]
  const b = bAtStart ? bPath[0] : bPath[bPath.length - 1]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function sortPathsNearestNeighbor(paths) {
  if (!paths || paths.length <= 1) return paths || []

  const remaining = [...paths]
  const ordered = [remaining.shift()]

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]
    let bestIndex = 0
    let bestDistance = Infinity
    let reverseNext = false

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]
      const dStart = endpointDistance(current, candidate, true, true)
      if (dStart < bestDistance) {
        bestDistance = dStart
        bestIndex = i
        reverseNext = false
      }

      const dEnd = endpointDistance(current, candidate, true, false)
      if (dEnd < bestDistance) {
        bestDistance = dEnd
        bestIndex = i
        reverseNext = true
      }
    }

    let next = remaining.splice(bestIndex, 1)[0]
    if (reverseNext) next = reversePointPath(next)
    ordered.push(next)
  }

  return ordered
}

function mergeNearbyPaths(paths, maxGap = 3.5) {
  if (!paths || paths.length <= 1) return paths || []

  const remaining = [...paths]
  const merged = []

  while (remaining.length > 0) {
    let current = remaining.shift()
    let changed = true

    while (changed && remaining.length > 0) {
      changed = false
      let mergeIndex = -1
      let bestDistance = maxGap
      let mergeMode = 'end-start'

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        const dEndStart = endpointDistance(current, candidate, true, true)
        if (dEndStart < bestDistance) {
          bestDistance = dEndStart
          mergeIndex = i
          mergeMode = 'end-start'
        }

        const dEndEnd = endpointDistance(current, candidate, true, false)
        if (dEndEnd < bestDistance) {
          bestDistance = dEndEnd
          mergeIndex = i
          mergeMode = 'end-end'
        }

        const dStartStart = endpointDistance(current, candidate, false, true)
        if (dStartStart < bestDistance) {
          bestDistance = dStartStart
          mergeIndex = i
          mergeMode = 'start-start'
        }

        const dStartEnd = endpointDistance(current, candidate, false, false)
        if (dStartEnd < bestDistance) {
          bestDistance = dStartEnd
          mergeIndex = i
          mergeMode = 'start-end'
        }
      }

      if (mergeIndex >= 0) {
        let candidate = remaining.splice(mergeIndex, 1)[0]

        if (mergeMode === 'end-start') {
          current = current.concat(candidate)
        } else if (mergeMode === 'end-end') {
          candidate = reversePointPath(candidate)
          current = current.concat(candidate)
        } else if (mergeMode === 'start-start') {
          current = reversePointPath(current).concat(candidate)
        } else {
          current = candidate.concat(current)
        }

        changed = true
      }
    }

    merged.push(current)
  }

  return merged
}

export function cleanupVectorPaths(paths, options = {}) {
  const {
    minPathLength = 4,
    minPathPoints = 3,
    mergePathGap = 3.5,
    sortPaths = true,
    imageWidth = null,
    imageHeight = null,
    removeBorderArtifacts = false,
    borderMarginPx = 2,
    borderCoverageThreshold = 0.65,
  } = options

  if (!paths || paths.length === 0) return []

  let cleaned = paths.filter((path) => {
    if (!path || path.length < Math.max(2, minPathPoints)) return false
    return pathLength(path) >= minPathLength
  })

  if (removeBorderArtifacts && Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth > 0 && imageHeight > 0) {
    cleaned = cleaned.filter((path) => {
      const b = pathBounds(path)
      const touchesBorder =
        b.minX <= borderMarginPx ||
        b.minY <= borderMarginPx ||
        b.maxX >= imageWidth - 1 - borderMarginPx ||
        b.maxY >= imageHeight - 1 - borderMarginPx

      if (!touchesBorder) return true

      const coverageX = b.width / imageWidth
      const coverageY = b.height / imageHeight

      // Drop long border-hugging paths (common PDF page-edge artifact), keep normal content.
      return !(coverageX >= borderCoverageThreshold || coverageY >= borderCoverageThreshold)
    })
  }

  cleaned = mergeNearbyPaths(cleaned, mergePathGap)

  if (sortPaths) {
    cleaned = sortPathsNearestNeighbor(cleaned)
  }

  return cleaned
}

function cropImageDataToContent(imageData, options = {}) {
  const {
    whiteThreshold = 246,
    alphaThreshold = 8,
    padding = 10,
    minContentRatio = 0.02,
  } = options

  const { width, height, data } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b)

      const isInk = a <= alphaThreshold || luminance < whiteThreshold
      if (!isInk) continue

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    return { imageData, cropX: 0, cropY: 0, cropped: false }
  }

  const rawW = maxX - minX + 1
  const rawH = maxY - minY + 1
  const contentRatio = (rawW * rawH) / Math.max(1, width * height)
  if (contentRatio < minContentRatio) {
    return { imageData, cropX: 0, cropY: 0, cropped: false }
  }

  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropMaxX = Math.min(width - 1, maxX + padding)
  const cropMaxY = Math.min(height - 1, maxY + padding)
  const croppedW = cropMaxX - cropX + 1
  const croppedH = cropMaxY - cropY + 1

  if (croppedW >= width * 0.98 && croppedH >= height * 0.98) {
    return { imageData, cropX: 0, cropY: 0, cropped: false }
  }

  const out = new Uint8ClampedArray(croppedW * croppedH * 4)
  for (let y = 0; y < croppedH; y++) {
    for (let x = 0; x < croppedW; x++) {
      const srcX = cropX + x
      const srcY = cropY + y
      const srcI = (srcY * width + srcX) * 4
      const dstI = (y * croppedW + x) * 4
      out[dstI] = data[srcI]
      out[dstI + 1] = data[srcI + 1]
      out[dstI + 2] = data[srcI + 2]
      out[dstI + 3] = data[srcI + 3]
    }
  }

  return {
    imageData: { width: croppedW, height: croppedH, data: out },
    cropX,
    cropY,
    cropped: true,
  }
}

/**
 * Analyze image luminance distribution and gradient strength.
 * Used to auto-tune edge thresholds so users don't need manual tweaking.
 */
function analyzeImageForAutoTuning(imageData) {
  const { width, height, data } = imageData
  const gray = new Uint8Array(width * height)
  const histogram = new Array(256).fill(0)

  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    const gi = i / 4
    gray[gi] = luminance
    histogram[luminance]++
  }

  const total = width * height
  const percentile = (p) => {
    const target = Math.max(1, Math.floor(total * p))
    let count = 0
    for (let i = 0; i < histogram.length; i++) {
      count += histogram[i]
      if (count >= target) return i
    }
    return 255
  }

  const p10 = percentile(0.1)
  const p50 = percentile(0.5)
  const p90 = percentile(0.9)
  const contrast = Math.max(1, p90 - p10)

  // Sample Sobel-like gradient magnitude on a 1px neighborhood.
  // A sparse sample keeps the operation fast even on larger images.
  const samples = []
  const step = Math.max(1, Math.floor(Math.max(width, height) / 280))
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)]
      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)]
      samples.push(Math.sqrt(gx * gx + gy * gy))
    }
  }

  samples.sort((a, b) => a - b)
  const sampleAt = (p) => {
    if (!samples.length) return 0
    const idx = Math.min(samples.length - 1, Math.floor(p * samples.length))
    return samples[idx]
  }

  return {
    p10,
    p50,
    p90,
    contrast,
    gradientP50: sampleAt(0.5),
    gradientP75: sampleAt(0.75),
    gradientP90: sampleAt(0.9),
  }
}

/**
 * Build source-specific defaults for robust vectorization.
 * PDF/SVG are treated as line-art first to reduce manual setting changes.
 */
export function buildAutoVectorizationProfile(imageData, sourceType = 'image') {
  const stats = analyzeImageForAutoTuning(imageData)
  const isPdfSource = sourceType === 'pdf'
  const isLineArtSource = sourceType === 'svg'

  const cannyHigh = Math.max(70, Math.min(220, Math.round(stats.gradientP90 * 0.95)))
  const cannyLow = Math.max(20, Math.min(cannyHigh - 10, Math.round(cannyHigh * 0.42)))
  const edgeThreshold = Math.max(18, Math.min(95, Math.round(stats.gradientP75 * 0.35)))

  if (isPdfSource) {
    return {
      // PDFs are often clean line-art already; thresholding plus centerline is more stable than Canny.
      useCanny: false,
      useEdgeDetection: false,
      useAdaptiveThreshold: false,
      autoThreshold: true,
      threshold: 128,
      cannyLowThreshold: cannyLow,
      cannyHighThreshold: cannyHigh,
      edgeThreshold,
      enhanceContrastFirst: false,
      useCLAHE: false,
      claheClipLimit: 2.0,
      claheTileSize: 8,
      useUnsharpMask: false,
      unsharpAmount: 1.5,
      unsharpRadius: 1.0,
      useMorphology: true,
      morphologyOperation: 'closing',
      morphologyIterations: 1,
      medianFilterSize: 1,
      applySkeletonize: true,
      pruneSpurs: true,
      spurMaxLength: 10,
      spurIterations: 2,
      simplifyTolerance: 1.5,
      smoothIterations: 0,
      minPathLength: 5,
      minPathPoints: 3,
      mergePathGap: 4,
      sortPaths: true,
      cropToContent: true,
      removeBorderArtifacts: true,
      useBezierFitting: false,
      bezierError: 1.0,
      _autoProfileName: 'pdf-line-art',
    }
  }

  if (isLineArtSource) {
    return {
      // For imported line drawings, Canny + gap-closing keeps strokes consistent.
      useCanny: true,
      useEdgeDetection: false,
      useAdaptiveThreshold: false,
      autoThreshold: false,
      threshold: Math.max(110, Math.min(190, Math.round((stats.p50 + stats.p10) / 2))),
      cannyLowThreshold: cannyLow,
      cannyHighThreshold: cannyHigh,
      edgeThreshold,
      enhanceContrastFirst: true,
      useCLAHE: true,
      claheClipLimit: stats.contrast < 60 ? 3.0 : 2.0,
      claheTileSize: 8,
      useUnsharpMask: true,
      unsharpAmount: stats.contrast < 55 ? 2.0 : 1.5,
      unsharpRadius: 1.0,
      useMorphology: true,
      morphologyOperation: 'closing',
      morphologyIterations: 1,
      medianFilterSize: 3,
      applySkeletonize: true,
      pruneSpurs: true,
      spurMaxLength: 8,
      spurIterations: 2,
      simplifyTolerance: 1.8,
      smoothIterations: 1,
      minPathLength: 5,
      minPathPoints: 3,
      mergePathGap: 4,
      sortPaths: true,
      cropToContent: false,
      removeBorderArtifacts: true,
      useBezierFitting: false,
      bezierError: 1.0,
      _autoProfileName: 'line-art',
    }
  }

  return {
    // For photos/scans, adaptive thresholding plus opening reduces texture noise.
    useCanny: false,
    useEdgeDetection: false,
    useAdaptiveThreshold: true,
    autoThreshold: false,
    threshold: 128,
    adaptiveBlockSize: stats.contrast < 55 ? 19 : 15,
    cannyLowThreshold: cannyLow,
    cannyHighThreshold: cannyHigh,
    edgeThreshold,
    enhanceContrastFirst: true,
    useCLAHE: stats.contrast < 70,
    claheClipLimit: stats.contrast < 55 ? 2.8 : 2.0,
    claheTileSize: 8,
    useUnsharpMask: stats.contrast < 65,
    unsharpAmount: 1.5,
    unsharpRadius: 1.0,
    useMorphology: true,
    morphologyOperation: 'opening',
    morphologyIterations: 1,
    medianFilterSize: 3,
    applySkeletonize: true,
    pruneSpurs: false,
    spurMaxLength: 8,
    spurIterations: 1,
    simplifyTolerance: 2.0,
    smoothIterations: 2,
    minPathLength: 4,
    minPathPoints: 3,
    mergePathGap: 3,
    sortPaths: true,
    cropToContent: false,
    removeBorderArtifacts: false,
    useBezierFitting: false,
    bezierError: 1.0,
    _autoProfileName: 'general-image',
  }
}

/**
 * Resize image if too large to prevent freezing
 */
export function resizeImageIfNeeded(imageElement, maxDimension = 1000) {
  const width = imageElement.width
  const height = imageElement.height
  const maxSize = Math.max(width, height)
  
  if (maxSize <= maxDimension) {
    return { element: imageElement, scale: 1, resized: false }
  }
  
  const scale = maxDimension / maxSize
  const newWidth = Math.floor(width * scale)
  const newHeight = Math.floor(height * scale)
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = newWidth
  canvas.height = newHeight
  
  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imageElement, 0, 0, newWidth, newHeight)
  
  const resizedImage = new Image()
  resizedImage.src = canvas.toDataURL()
  
  return new Promise((resolve) => {
    resizedImage.onload = () => {
      resolve({ 
        element: resizedImage, 
        scale: 1 / scale, // Scale to apply to output
        resized: true,
        originalSize: { width, height },
        newSize: { width: newWidth, height: newHeight }
      })
    }
  })
}

/**
 * Main vectorization function
 */
export async function vectorizeImage(imageElement, options = {}) {
  const {
    threshold = 128,
    medianFilterSize = 3,
    simplifyTolerance = 2.0,
    smoothIterations = 2,
    applySkeletonize = true,
    useAdaptiveThreshold = false,
    useEdgeDetection = false,
    enhanceContrastFirst = true,
    autoThreshold = false,
    adaptiveBlockSize = 15,
    edgeThreshold = 30,
    maxImageSize = 1000,
    onProgress = null,
    // New professional options
    useCLAHE = false,
    claheClipLimit = 2.0,
    claheTileSize = 8,
    useCanny = false,
    cannyLowThreshold = 50,
    cannyHighThreshold = 150,
    useUnsharpMask = false,
    unsharpAmount = 1.5,
    unsharpRadius = 1.0,
    useMorphology = false,
    morphologyOperation = 'opening', // 'opening', 'closing', 'dilate', 'erode'
    morphologyIterations = 1,
    useBezierFitting = false,
    bezierError = 1.0,
    pruneSpurs = false,
    spurMaxLength = 8,
    spurIterations = 1,
    cleanupPaths = true,
    minPathLength = 4,
    minPathPoints = 3,
    mergePathGap = 3.5,
    sortPaths = true,
    cropToContent = false,
    removeBorderArtifacts = false,
    sourceType = 'image',
    autoTuneForSource = false
  } = options
  
  // Resize image if too large
  if (onProgress) onProgress('Checking image size...', 0)
  const resizeInfo = await resizeImageIfNeeded(imageElement, maxImageSize)
  const workingImage = resizeInfo.element
  
  if (resizeInfo.resized && onProgress) {
    onProgress(
      `Image resized from ${resizeInfo.originalSize.width}x${resizeInfo.originalSize.height} to ${resizeInfo.newSize.width}x${resizeInfo.newSize.height}`,
      5
    )
  }
  
  // Create canvas and get image data
  if (onProgress) onProgress('Preparing image data...', 10)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = workingImage.width
  canvas.height = workingImage.height
  ctx.drawImage(workingImage, 0, 0)
  
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  
  let effectiveThreshold = threshold
  let effectiveMedianFilterSize = medianFilterSize
  let effectiveSimplifyTolerance = simplifyTolerance
  let effectiveSmoothIterations = smoothIterations
  let effectiveApplySkeletonize = applySkeletonize
  let effectiveUseAdaptiveThreshold = useAdaptiveThreshold
  let effectiveUseEdgeDetection = useEdgeDetection
  let effectiveEnhanceContrastFirst = enhanceContrastFirst
  let effectiveAutoThreshold = autoThreshold
  let effectiveAdaptiveBlockSize = adaptiveBlockSize
  let effectiveEdgeThreshold = edgeThreshold
  let effectiveUseCLAHE = useCLAHE
  let effectiveClaheClipLimit = claheClipLimit
  let effectiveClaheTileSize = claheTileSize
  let effectiveUseCanny = useCanny
  let effectiveCannyLowThreshold = cannyLowThreshold
  let effectiveCannyHighThreshold = cannyHighThreshold
  let effectiveUseUnsharpMask = useUnsharpMask
  let effectiveUnsharpAmount = unsharpAmount
  let effectiveUnsharpRadius = unsharpRadius
  let effectiveUseMorphology = useMorphology
  let effectiveMorphologyOperation = morphologyOperation
  let effectiveMorphologyIterations = morphologyIterations
  let effectiveUseBezierFitting = useBezierFitting
  let effectiveBezierError = bezierError
  let effectivePruneSpurs = pruneSpurs
  let effectiveSpurMaxLength = spurMaxLength
  let effectiveSpurIterations = spurIterations
  let effectiveCleanupPaths = cleanupPaths
  let effectiveMinPathLength = minPathLength
  let effectiveMinPathPoints = minPathPoints
  let effectiveMergePathGap = mergePathGap
  let effectiveSortPaths = sortPaths
  let effectiveCropToContent = cropToContent
  let effectiveRemoveBorderArtifacts = removeBorderArtifacts
  let cropOffsetX = 0
  let cropOffsetY = 0

  if (autoTuneForSource) {
    if (onProgress) onProgress('Auto-tuning vectorization settings...', 12)
    const profile = buildAutoVectorizationProfile(imageData, sourceType)
    effectiveThreshold = profile.threshold
    effectiveMedianFilterSize = profile.medianFilterSize
    effectiveSimplifyTolerance = profile.simplifyTolerance
    effectiveSmoothIterations = profile.smoothIterations
    effectiveApplySkeletonize = profile.applySkeletonize
    effectiveUseAdaptiveThreshold = profile.useAdaptiveThreshold
    effectiveUseEdgeDetection = profile.useEdgeDetection
    effectiveEnhanceContrastFirst = profile.enhanceContrastFirst
    effectiveAutoThreshold = profile.autoThreshold
    effectiveAdaptiveBlockSize = profile.adaptiveBlockSize ?? effectiveAdaptiveBlockSize
    effectiveEdgeThreshold = profile.edgeThreshold
    effectiveUseCLAHE = profile.useCLAHE
    effectiveClaheClipLimit = profile.claheClipLimit
    effectiveClaheTileSize = profile.claheTileSize
    effectiveUseCanny = profile.useCanny
    effectiveCannyLowThreshold = profile.cannyLowThreshold
    effectiveCannyHighThreshold = profile.cannyHighThreshold
    effectiveUseUnsharpMask = profile.useUnsharpMask
    effectiveUnsharpAmount = profile.unsharpAmount
    effectiveUnsharpRadius = profile.unsharpRadius
    effectiveUseMorphology = profile.useMorphology
    effectiveMorphologyOperation = profile.morphologyOperation
    effectiveMorphologyIterations = profile.morphologyIterations
    effectiveUseBezierFitting = profile.useBezierFitting
    effectiveBezierError = profile.bezierError
    effectivePruneSpurs = profile.pruneSpurs ?? effectivePruneSpurs
    effectiveSpurMaxLength = profile.spurMaxLength ?? effectiveSpurMaxLength
    effectiveSpurIterations = profile.spurIterations ?? effectiveSpurIterations
    effectiveMinPathLength = profile.minPathLength ?? effectiveMinPathLength
    effectiveMinPathPoints = profile.minPathPoints ?? effectiveMinPathPoints
    effectiveMergePathGap = profile.mergePathGap ?? effectiveMergePathGap
    effectiveSortPaths = profile.sortPaths ?? effectiveSortPaths
    effectiveCropToContent = profile.cropToContent ?? effectiveCropToContent
    effectiveRemoveBorderArtifacts = profile.removeBorderArtifacts ?? effectiveRemoveBorderArtifacts
  }

  // Professional preprocessing pipeline
  
  // 1. Apply unsharp masking for edge enhancement (optional)
  if (effectiveUseUnsharpMask) {
    if (onProgress) onProgress('Sharpening edges...', 15)
    imageData = unsharpMask(imageData, effectiveUnsharpAmount, effectiveUnsharpRadius)
  }
  
  // 2. Enhance contrast - choose between CLAHE (professional) or standard histogram equalization
  if (effectiveEnhanceContrastFirst) {
    if (effectiveUseCLAHE) {
      if (onProgress) onProgress('Enhancing contrast (CLAHE)...', 20)
      imageData = applyCLAHE(imageData, effectiveClaheClipLimit, effectiveClaheTileSize)
    } else {
      if (onProgress) onProgress('Enhancing contrast...', 20)
      imageData = enhanceContrast(imageData)
    }
  }

  if (effectiveCropToContent) {
    if (onProgress) onProgress('Cropping empty margins...', 24)
    const cropped = cropImageDataToContent(imageData)
    imageData = cropped.imageData
    cropOffsetX = cropped.cropX
    cropOffsetY = cropped.cropY
  }
  
  let binary
  let width = imageData.width
  let height = imageData.height
  
  // Choose detection method
  if (onProgress) onProgress('Detecting features...', 30)
  
  if (effectiveUseCanny) {
    // Use professional Canny edge detection
    binary = cannyEdgeDetection(imageData, effectiveCannyLowThreshold, effectiveCannyHighThreshold)
  } else if (effectiveUseEdgeDetection) {
    // Use edge detection for complex images
    binary = detectEdges(imageData, effectiveEdgeThreshold)
  } else if (effectiveUseAdaptiveThreshold) {
    // Use adaptive threshold for uneven lighting
    binary = adaptiveThreshold(imageData, effectiveAdaptiveBlockSize, 10)
  } else {
    // Use standard threshold
    let finalThreshold = effectiveThreshold
    
    // Auto-calculate threshold using Otsu's method
    if (effectiveAutoThreshold) {
      finalThreshold = calculateOtsuThreshold(imageData)
      console.log('Auto-calculated threshold:', finalThreshold)
    }
    
    const result = imageToBinary(imageData, finalThreshold, false)
    binary = result.binary
  }
  
  // Apply morphological operations for noise removal and feature enhancement
  if (effectiveUseMorphology) {
    if (onProgress) onProgress(`Applying morphological ${effectiveMorphologyOperation}...`, 40)
    switch (effectiveMorphologyOperation) {
      case 'opening':
        binary = morphologicalOpening(binary, width, height, effectiveMorphologyIterations)
        break
      case 'closing':
        binary = morphologicalClosing(binary, width, height, effectiveMorphologyIterations)
        break
      case 'dilate':
        binary = dilate(binary, width, height, effectiveMorphologyIterations)
        break
      case 'erode':
        binary = erode(binary, width, height, effectiveMorphologyIterations)
        break
    }
  }
  
  // Apply median filter
  if (effectiveMedianFilterSize > 0) {
    if (onProgress) onProgress('Applying noise filter...', 45)
    binary = medianFilter(binary, width, height, effectiveMedianFilterSize)
  }
  
  // Skeletonize
  if (effectiveApplySkeletonize) {
    if (onProgress) onProgress('Tracing centerlines (this may take a while)...', 50)
    binary = skeletonize(binary, width, height)

    if (effectivePruneSpurs) {
      if (onProgress) onProgress('Removing tiny branch artifacts...', 60)
      binary = pruneSkeletonSpurs(binary, width, height, effectiveSpurMaxLength, effectiveSpurIterations)
    }
  }
  
  // Trace centerlines
  if (onProgress) onProgress('Extracting paths...', 75)
  let paths = traceCenterlines(binary, width, height)

  // Adapted from Incrediplotter's post-vector pipeline idea:
  // keep only meaningful strokes, merge close endpoints, and sort draw order.
  if (effectiveCleanupPaths) {
    if (onProgress) onProgress('Cleaning vector paths...', 80)
    paths = cleanupVectorPaths(paths, {
      minPathLength: effectiveMinPathLength,
      minPathPoints: effectiveMinPathPoints,
      mergePathGap: effectiveMergePathGap,
      sortPaths: effectiveSortPaths,
      imageWidth: width,
      imageHeight: height,
      removeBorderArtifacts: effectiveRemoveBorderArtifacts,
    })
  }
  
  // Simplify and smooth paths
  if (onProgress) onProgress('Simplifying and smoothing...', 85)
  paths = paths.map(path => {
    let processed = path
    
    // Apply Bezier curve fitting for smoother, more professional results
    if (effectiveUseBezierFitting) {
      processed = fitBezierCurves(processed, effectiveBezierError)
    } else {
      // Traditional simplification and smoothing
      processed = simplifyPath(processed, effectiveSimplifyTolerance)
      if (effectiveSmoothIterations > 0) {
        processed = smoothPath(processed, effectiveSmoothIterations)
      }
    }
    
    return processed
  })
  
  // Scale paths back to original size if image was resized
  if (resizeInfo.resized) {
    if (onProgress) onProgress('Scaling to original size...', 95)
    paths = paths.map(path => 
      path.map(([x, y]) => [
        (x + cropOffsetX) * resizeInfo.scale,
        (y + cropOffsetY) * resizeInfo.scale,
      ])
    )
  } else if (cropOffsetX !== 0 || cropOffsetY !== 0) {
    paths = paths.map(path =>
      path.map(([x, y]) => [x + cropOffsetX, y + cropOffsetY])
    )
  }
  
  if (onProgress) onProgress('Complete!', 100)
  
  return paths
}
/**
 * Path Optimization Utilities for Embroidery
 * Implements professional punching principles to minimize jump stitches
 */

/**
 * Optimizes stitch paths using Traveling Salesman approach
 * @param {Array} steps - Array of stitch steps with x1, y1, x2, y2, penDown
 * @returns {Array} Optimized stitch steps with fewer jumps
 */
export function optimizeStitchPaths(steps) {
  if (!steps || steps.length === 0) return steps

  console.log('🎯 Optimizing stitch paths...')
  console.log('Original steps:', steps.length)
  
  // Step 1: Separate into continuous paths
  const paths = separateIntoPaths(steps)
  console.log('Separated into', paths.length, 'paths')
  
  // Step 2: Optimize path order (Nearest Neighbor TSP)
  const optimizedPaths = optimizePathOrder(paths)
  console.log('Optimized path order')
  
  // Step 3: Optimize path directions (minimize jumps)
  const directionOptimizedPaths = optimizePathDirections(optimizedPaths)
  console.log('Optimized path directions')
  
  // Step 4: Merge nearby paths if possible
  const mergedPaths = mergeNearbyPaths(directionOptimizedPaths, 5) // 5mm threshold
  console.log('Merged nearby paths, now', mergedPaths.length, 'paths')
  
  // Step 5: Convert back to steps
  const optimizedSteps = pathsToSteps(mergedPaths)
  console.log('Optimized steps:', optimizedSteps.length)
  
  // Show statistics
  const beforeStats = analyzeStitches(steps)
  const afterStats = analyzeStitches(optimizedSteps)
  console.log('📊 Before optimization:', beforeStats)
  console.log('📊 After optimization:', afterStats)
  console.log('✅ Jump stitches reduced by:', 
    ((beforeStats.jumpStitches - afterStats.jumpStitches) / beforeStats.jumpStitches * 100).toFixed(1) + '%')
  
  return optimizedSteps
}

/**
 * Separates continuous stitch sequences into individual paths
 */
function separateIntoPaths(steps) {
  const paths = []
  let currentPath = []
  
  for (const step of steps) {
    if (step.penDown) {
      currentPath.push(step)
    } else {
      // Jump stitch - end current path and start new one
      if (currentPath.length > 0) {
        paths.push(currentPath)
        currentPath = []
      }
    }
  }
  
  // Add last path
  if (currentPath.length > 0) {
    paths.push(currentPath)
  }
  
  return paths
}

/**
 * Optimizes the order of paths using Nearest Neighbor algorithm
 * This is a greedy approximation of the Traveling Salesman Problem
 */
function optimizePathOrder(paths) {
  if (paths.length <= 1) return paths
  
  const optimized = []
  const remaining = [...paths]
  
  // Start with first path
  let current = remaining.shift()
  optimized.push(current)
  
  // Repeatedly find nearest unvisited path
  while (remaining.length > 0) {
    const currentEnd = getPathEnd(current)
    let nearestIndex = 0
    let nearestDistance = Infinity
    let shouldReverse = false
    
    // Find nearest path
    for (let i = 0; i < remaining.length; i++) {
      const path = remaining[i]
      const pathStart = getPathStart(path)
      const pathEnd = getPathEnd(path)
      
      // Check distance to start of path
      const distToStart = distance(currentEnd, pathStart)
      if (distToStart < nearestDistance) {
        nearestDistance = distToStart
        nearestIndex = i
        shouldReverse = false
      }
      
      // Check distance to end of path (reversed)
      const distToEnd = distance(currentEnd, pathEnd)
      if (distToEnd < nearestDistance) {
        nearestDistance = distToEnd
        nearestIndex = i
        shouldReverse = true
      }
    }
    
    // Get nearest path and remove from remaining
    current = remaining.splice(nearestIndex, 1)[0]
    
    // Reverse if needed
    if (shouldReverse) {
      current = reversePath(current)
    }
    
    optimized.push(current)
  }
  
  return optimized
}

/**
 * Optimizes individual path directions to minimize jump distances
 */
function optimizePathDirections(paths) {
  if (paths.length <= 1) return paths
  
  const optimized = [paths[0]]
  
  for (let i = 1; i < paths.length; i++) {
    const prevEnd = getPathEnd(optimized[i - 1])
    const currentPath = paths[i]
    const currentStart = getPathStart(currentPath)
    const currentEnd = getPathEnd(currentPath)
    
    // Check if reversing would reduce jump distance
    const distNormal = distance(prevEnd, currentStart)
    const distReversed = distance(prevEnd, currentEnd)
    
    if (distReversed < distNormal) {
      optimized.push(reversePath(currentPath))
    } else {
      optimized.push(currentPath)
    }
  }
  
  return optimized
}

/**
 * Merges paths that are very close to each other
 * Reduces jump stitches by connecting nearby segments
 */
function mergeNearbyPaths(paths, threshold = 5) {
  if (paths.length <= 1) return paths
  
  const merged = []
  let i = 0
  
  while (i < paths.length) {
    let currentPath = paths[i]
    let foundMerge = true
    
    // Keep trying to merge with subsequent paths
    while (foundMerge && i + 1 < paths.length) {
      foundMerge = false
      const nextPath = paths[i + 1]
      const currentEnd = getPathEnd(currentPath)
      const nextStart = getPathStart(nextPath)
      
      // If paths are close enough, merge them
      if (distance(currentEnd, nextStart) <= threshold) {
        // Create connecting stitch
        const connector = {
          x1: currentEnd.x,
          y1: currentEnd.y,
          x2: nextStart.x,
          y2: nextStart.y,
          penDown: true // Convert jump to running stitch
        }
        
        currentPath = [...currentPath, connector, ...nextPath]
        i++
        foundMerge = true
      }
    }
    
    merged.push(currentPath)
    i++
  }
  
  return merged
}

/**
 * Converts optimized paths back to step format
 */
function pathsToSteps(paths) {
  const steps = []
  
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    
    // Add all stitches in the path
    steps.push(...path)
    
    // Add jump stitch to next path (if not last)
    if (i < paths.length - 1) {
      const currentEnd = getPathEnd(path)
      const nextStart = getPathStart(paths[i + 1])
      
      steps.push({
        x1: currentEnd.x,
        y1: currentEnd.y,
        x2: nextStart.x,
        y2: nextStart.y,
        penDown: false // Jump stitch
      })
    }
  }
  
  return steps
}

/**
 * Helper: Get start point of a path
 */
function getPathStart(path) {
  if (path.length === 0) return { x: 0, y: 0 }
  return { x: path[0].x1, y: path[0].y1 }
}

/**
 * Helper: Get end point of a path
 */
function getPathEnd(path) {
  if (path.length === 0) return { x: 0, y: 0 }
  const last = path[path.length - 1]
  return { x: last.x2, y: last.y2 }
}

/**
 * Helper: Reverse a path
 */
function reversePath(path) {
  return path.map(step => ({
    x1: step.x2,
    y1: step.y2,
    x2: step.x1,
    y2: step.y1,
    penDown: step.penDown
  })).reverse()
}

/**
 * Helper: Calculate Euclidean distance
 */
function distance(p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Analyzes stitches and provides statistics
 */
export function analyzeStitches(steps) {
  let runningStitches = 0
  let jumpStitches = 0
  let totalRunningDistance = 0
  let totalJumpDistance = 0
  
  for (const step of steps) {
    const dist = Math.sqrt(
      Math.pow(step.x2 - step.x1, 2) + 
      Math.pow(step.y2 - step.y1, 2)
    )
    
    if (step.penDown) {
      runningStitches++
      totalRunningDistance += dist
    } else {
      jumpStitches++
      totalJumpDistance += dist
    }
  }
  
  return {
    totalStitches: steps.length,
    runningStitches,
    jumpStitches,
    jumpPercentage: ((jumpStitches / steps.length) * 100).toFixed(1),
    totalRunningDistance: totalRunningDistance.toFixed(2),
    totalJumpDistance: totalJumpDistance.toFixed(2),
    avgRunningLength: runningStitches > 0 ? (totalRunningDistance / runningStitches).toFixed(2) : '0',
    avgJumpLength: jumpStitches > 0 ? (totalJumpDistance / jumpStitches).toFixed(2) : '0'
  }
}

/**
 * Applies pull compensation
 * Adjusts stitch coordinates to compensate for fabric stretch
 */
export function applyPullCompensation(steps, compensationFactor = 0.05) {
  return steps.map(step => {
    const dx = step.x2 - step.x1
    const dy = step.y2 - step.y1
    
    return {
      ...step,
      x2: step.x2 + dx * compensationFactor,
      y2: step.y2 + dy * compensationFactor
    }
  })
}

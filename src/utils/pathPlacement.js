// Utilities to place/scale vector paths into a target rectangle.
// Paths are arrays of points: [[x, y], ...]

export function calculatePathBounds(paths) {
  if (!paths || paths.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const path of paths) {
    if (!path) continue
    for (const pt of path) {
      const x = pt?.[0]
      const y = pt?.[1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null

  const width = maxX - minX
  const height = maxY - minY
  return { minX, minY, maxX, maxY, width, height }
}

/**
 * Fit/place raw vector paths into a target rectangle.
 *
 * - If `autoFit` is true: scales uniformly to fit within `targetRect` (with margin) and centers.
 * - If `autoFit` is false: applies `userScale` and places at the top-left of the target area (with margin).
 *
 * The returned paths are in the target coordinate space (same units as `targetRect`).
 */
export function fitPathsToRect(
  paths,
  targetRect,
  {
    bounds = null,
    autoFit = true,
    margin = 0.9,
    userScale = 1.0,
  } = {}
) {
  if (!paths || paths.length === 0) return []
  if (!targetRect || !Number.isFinite(targetRect.x) || !Number.isFinite(targetRect.y) || !Number.isFinite(targetRect.w) || !Number.isFinite(targetRect.h)) {
    return paths
  }

  const b = bounds || calculatePathBounds(paths)
  if (!b || !Number.isFinite(b.width) || !Number.isFinite(b.height) || b.width <= 0 || b.height <= 0) {
    return paths
  }

  const safeMargin = Number.isFinite(margin) ? Math.max(0.1, Math.min(1, margin)) : 0.9
  const scaleFactor = Number.isFinite(userScale) ? userScale : 1.0

  const targetW = targetRect.w * safeMargin
  const targetH = targetRect.h * safeMargin
  const targetX = targetRect.x + (targetRect.w - targetW) / 2
  const targetY = targetRect.y + (targetRect.h - targetH) / 2

  let scale = scaleFactor
  let offsetX = targetX
  let offsetY = targetY

  if (autoFit) {
    const scaleX = targetW / b.width
    const scaleY = targetH / b.height
    const autoScale = Math.min(scaleX, scaleY)
    scale = autoScale * scaleFactor

    const scaledW = b.width * scale
    const scaledH = b.height * scale
    offsetX = targetRect.x + (targetRect.w - scaledW) / 2
    offsetY = targetRect.y + (targetRect.h - scaledH) / 2
  }

  const toTarget = ([x, y]) => {
    const tx = (x - b.minX) * scale + offsetX
    const ty = (y - b.minY) * scale + offsetY
    return [tx, ty]
  }

  return paths.map((path) => {
    if (!path) return []
    return path.map(toTarget)
  })
}

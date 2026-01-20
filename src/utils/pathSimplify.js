// Corner-preserving progressive path simplification.
//
// Uses a Visvalingam-Whyatt style algorithm (remove lowest-area points first)
// and hard-protects endpoints + detected corners so sharp turns are preserved.

function triangleArea2(a, b, c) {
  // Twice the triangle area (absolute).
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const acx = c[0] - a[0]
  const acy = c[1] - a[1]
  return Math.abs(abx * acy - aby * acx)
}

function angleDeg(prev, cur, next) {
  const v1x = prev[0] - cur[0]
  const v1y = prev[1] - cur[1]
  const v2x = next[0] - cur[0]
  const v2y = next[1] - cur[1]

  const n1 = Math.hypot(v1x, v1y)
  const n2 = Math.hypot(v2x, v2y)
  if (n1 === 0 || n2 === 0) return 180

  const dot = (v1x * v2x + v1y * v2y) / (n1 * n2)
  const clamped = Math.max(-1, Math.min(1, dot))
  return (Math.acos(clamped) * 180) / Math.PI
}

class MinHeap {
  constructor() {
    this.data = []
  }
  push(item) {
    this.data.push(item)
    this._siftUp(this.data.length - 1)
  }
  pop() {
    if (this.data.length === 0) return null
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0 && last) {
      this.data[0] = last
      this._siftDown(0)
    }
    return top
  }
  _siftUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].key <= this.data[i].key) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }
  _siftDown(i) {
    const n = this.data.length
    while (true) {
      let smallest = i
      const l = i * 2 + 1
      const r = i * 2 + 2
      if (l < n && this.data[l].key < this.data[smallest].key) smallest = l
      if (r < n && this.data[r].key < this.data[smallest].key) smallest = r
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
  }
}

function computeProtectedSet(points, cornerAngleThresholdDeg) {
  const n = points.length
  const protectedIdx = new Set([0, n - 1])
  if (n < 3) return protectedIdx

  for (let i = 1; i < n - 1; i++) {
    const a = angleDeg(points[i - 1], points[i], points[i + 1])
    // Smaller angle = sharper corner.
    if (a <= cornerAngleThresholdDeg) {
      protectedIdx.add(i)
    }
  }

  return protectedIdx
}

/**
 * Simplify a polyline to a target point count.
 *
 * @param {Array<Array<number>>} points
 * @param {number} targetCount
 * @param {object} options
 * @param {number} options.cornerAngleDeg - protect corners at/under this angle.
 */
export function simplifyPathToTargetCount(points, targetCount, { cornerAngleDeg = 120 } = {}) {
  if (!points || points.length <= 2) return points

  const n = points.length
  const safeTarget = Math.max(2, Math.min(Math.floor(targetCount), n))
  if (safeTarget >= n) return points

  const protectedIdx = computeProtectedSet(points, cornerAngleDeg)
  const protectedCount = protectedIdx.size
  const finalTarget = Math.max(safeTarget, protectedCount)
  if (finalTarget >= n) return points

  // Doubly-linked list representation via index arrays.
  const prev = new Array(n)
  const next = new Array(n)
  const alive = new Array(n).fill(true)
  for (let i = 0; i < n; i++) {
    prev[i] = i - 1
    next[i] = i + 1
  }
  next[n - 1] = -1

  const heap = new MinHeap()
  const version = new Array(n).fill(0)

  const pushIfCandidate = (i) => {
    if (i <= 0 || i >= n - 1) return
    if (!alive[i]) return
    if (protectedIdx.has(i)) return

    const pi = prev[i]
    const ni = next[i]
    if (pi < 0 || ni < 0) return

    const key = triangleArea2(points[pi], points[i], points[ni])
    version[i] += 1
    heap.push({ key, i, v: version[i] })
  }

  // Initialize heap with all removable interior points.
  for (let i = 1; i < n - 1; i++) pushIfCandidate(i)

  let aliveCount = n
  while (aliveCount > finalTarget) {
    const item = heap.pop()
    if (!item) break

    const i = item.i
    if (!alive[i]) continue
    if (protectedIdx.has(i)) continue
    if (item.v !== version[i]) continue

    const pi = prev[i]
    const ni = next[i]
    if (pi < 0 || ni < 0) continue

    // Remove i
    alive[i] = false
    aliveCount -= 1
    next[pi] = ni
    prev[ni] = pi

    // Neighbor priorities changed
    pushIfCandidate(pi)
    pushIfCandidate(ni)
  }

  // Rebuild points from linked list
  const out = []
  let idx = 0
  while (idx !== -1) {
    if (alive[idx]) out.push(points[idx])
    idx = next[idx]
  }

  return out.length >= 2 ? out : [points[0], points[n - 1]]
}

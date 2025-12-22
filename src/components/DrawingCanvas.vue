<template>
  <div
    ref="canvasRef"
    class="drawing-canvas"
    :class="{ importing: isImporting }"
    :style="{ '--toolbar-height': `${toolbarHeight}px`, '--shadow-padding': `${shadowPadding}px` }"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @touchstart.prevent="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend.prevent="onTouchEnd"
    @touchcancel.prevent="onTouchEnd"
    @dragover.prevent
    @drop="onDrop"
  >
    <div v-if="isImporting" class="import-overlay">
      <div class="import-message">
        ⏳ Importing file...
      </div>
    </div>

    <!-- Stitch Length Scale Control or Eraser Size Control -->
    <div 
      class="stitch-control"
      :class="{ 'eraser-control': uiStore.isEraser }"
      :style="stitchControlStyle"
      @mousedown.stop
      @mousemove.stop
      @mouseup.stop
      @click.stop
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <div v-if="!uiStore.isEraser" class="stitch-scale">
        <label>Stitch Length</label>
        <div class="scale-container">
          <span class="scale-label">Short</span>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="1" 
            v-model="stitchLength"
            class="scale-slider"
            @mousedown.stop
            @mousemove.stop
            @mouseup.stop
          />
          <span class="scale-label">Long</span>
        </div>
        <div class="scale-value">{{ stitchLength }}px</div>
      </div>
      <div v-else class="stitch-scale">
        <label>Eraser Size</label>
        <div class="scale-container">
          <span class="scale-label">Small</span>
          <input 
            type="range" 
            min="5" 
            max="100" 
            step="5" 
            v-model="eraserSize"
            class="scale-slider"
            @mousedown.stop
            @mousemove.stop
            @mouseup.stop
          />
          <span class="scale-label">Large</span>
        </div>
        <div class="scale-value">{{ eraserSize }}px</div>
      </div>
    </div>

    <svg
      ref="svgRef"
      :width="width"
      :height="height"
      style="background: transparent; width: 100%; height: 100%"
      :style="{ 
        cursor: uiStore.isEraser ? 'crosshair' : (isSpaceDown ? (isPanning ? 'grabbing' : 'grab') : 'default'),
        overflow: 'visible'
      }"
    >
      <defs>
        <clipPath id="paper-clip" clipPathUnits="userSpaceOnUse">
          <rect
            :x="paperRect.x"
            :y="paperRect.y"
            :width="paperRect.w"
            :height="paperRect.h"
            rx="6"
            ry="6"
          />
        </clipPath>

        <!-- Inset clip for grid so it doesn't draw over the paper border stroke -->
        <clipPath id="paper-clip-grid" clipPathUnits="userSpaceOnUse">
          <rect
            :x="paperRect.x + gridClipInset"
            :y="paperRect.y + gridClipInset"
            :width="paperRect.w - gridClipInset * 2"
            :height="paperRect.h - gridClipInset * 2"
            :rx="Math.max(0, 6 - gridClipInset)"
            :ry="Math.max(0, 6 - gridClipInset)"
          />
        </clipPath>

        <filter id="paperShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.14" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.06" />
        </filter>

        <!-- Base grid: fixed in world units so lines do NOT shift when zooming -->
        <pattern
          id="paperGrid"
          patternUnits="userSpaceOnUse"
          :width="GRID_PX"
          :height="GRID_PX"
          :patternTransform="`translate(${paperRect.x} ${paperRect.y})`"
        >
          <path
            :d="`M ${GRID_PX} 0 L 0 0 0 ${GRID_PX}`"
            fill="none"
            stroke="#e6e6e6"
            :stroke-width="gridStrokeWidth"
          />
        </pattern>

        <!-- Subdivision grid: spacing is a power-of-two divisor of GRID_PX so it "splits" squares -->
        <pattern
          id="paperGridSub"
          patternUnits="userSpaceOnUse"
          :width="gridSubSpacing"
          :height="gridSubSpacing"
          :patternTransform="`translate(${paperRect.x} ${paperRect.y})`"
        >
          <path
            :d="`M ${gridSubSpacing} 0 L 0 0 0 ${gridSubSpacing}`"
            fill="none"
            stroke="#e6e6e6"
            stroke-opacity="0.6"
            :stroke-width="gridStrokeWidth"
          />
        </pattern>

        <pattern
          id="paperGridBold"
          patternUnits="userSpaceOnUse"
          :width="GRID_PX * 5"
          :height="GRID_PX * 5"
          :patternTransform="`translate(${paperRect.x} ${paperRect.y})`"
        >
          <path
            :d="`M ${GRID_PX * 5} 0 L 0 0 0 ${GRID_PX * 5}`"
            fill="none"
            stroke="#d6d6d6"
            :stroke-width="gridStrokeWidth"
          />
        </pattern>
      </defs>

      <!-- Apply viewport transform (scale + pan) so zoom can anchor under cursor/pinch center -->
      <g :transform="viewportTransform">
        <!-- Workspace background (non-drawable) -->
        <rect x="0" y="0" :width="width" :height="height" fill="#eeeeee" />

        <!-- White paper (drawable) -->
        <rect
          :x="paperRect.x"
          :y="paperRect.y"
          :width="paperRect.w"
          :height="paperRect.h"
          rx="6"
          ry="6"
          fill="#ffffff"
          stroke="#bfbfbf"
          stroke-width="1"
          filter="url(#paperShadow)"
        />

        <!-- Background image (clipped to paper) -->
        <image
          v-if="drawingStore.backgroundImage"
          :href="drawingStore.backgroundImage"
          :x="paperRect.x"
          :y="paperRect.y"
          :width="paperRect.w"
          :height="paperRect.h"
          preserveAspectRatio="xMidYMid meet"
          :opacity="0.7"
          :transform="backgroundTransform"
          clip-path="url(#paper-clip)"
        />

        <!-- Grid (clipped to paper) -->
        <rect
          v-if="uiStore.grid && showSubGrid"
          :x="paperRect.x"
          :y="paperRect.y"
          :width="paperRect.w"
          :height="paperRect.h"
          fill="url(#paperGridSub)"
          clip-path="url(#paper-clip-grid)"
        />
        <rect
          v-if="uiStore.grid"
          :x="paperRect.x"
          :y="paperRect.y"
          :width="paperRect.w"
          :height="paperRect.h"
          fill="url(#paperGrid)"
          clip-path="url(#paper-clip-grid)"
        />
        <rect
          v-if="uiStore.grid"
          :x="paperRect.x"
          :y="paperRect.y"
          :width="paperRect.w"
          :height="paperRect.h"
          fill="url(#paperGridBold)"
          clip-path="url(#paper-clip-grid)"
        />

        <!-- Stitches (clipped to paper) -->
        <g clip-path="url(#paper-clip)">
          <!-- Render each step as individual line segments -->
          <line
            v-for="(step, i) in visibleSteps"
            :key="i"
            :x1="step.x1"
            :y1="step.y1"
            :x2="step.x2"
            :y2="step.y2"
            :stroke="step.penDown ? '#333' : '#f00'"
            :stroke-width="getScaleAwareLineWidth(step.penDown)"
            :opacity="step.penDown ? 1 : 0.5"
          />
          <!-- Show interpolation points as purple dots -->
          <circle
            v-for="(step, i) in visibleSteps"
            :key="'pt-' + i"
            :cx="step.x2"
            :cy="step.y2"
            :r="getScaleAwareDotRadius()"
            :fill="'#7a0081'"
            opacity="0.8"
          />
        </g>
        
        <!-- Eraser Cursor Preview -->
        <circle
          v-if="uiStore.isEraser && eraserPreview.visible"
          :cx="eraserPreview.x"
          :cy="eraserPreview.y"
          :r="eraserSize / effectiveScale"
          fill="none"
          stroke="#ff4444"
          :stroke-width="2 / effectiveScale"
          stroke-dasharray="5,5"
          pointer-events="none"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\DrawingCanvas.vue
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { useUIStore } from '@/stores/ui.js'

import { PAPER_PX, GRID_PX } from '@/config/paper.js'

// ### ADD THIS IMPORT ###
import { lineInterpolate } from '@/services/embroidery.js'  // your old adaptive routine

const drawingStore = useDrawingStore()
const uiStore = useUIStore()
const canvasRef = ref(null)
const svgRef = ref(null)
const width = ref(window.innerWidth)
const toolbarHeight = ref(0)
const height = ref(window.innerHeight)

// Keep enough breathing room so the paper shadow isn't clipped by the SVG bounds.
const PAPER_SHADOW_MARGIN = 80

const shadowPadding = PAPER_SHADOW_MARGIN
const isImporting = ref(false)

let drawing = false
let lastPos = ref(null)
const stitchLength = ref(15)

// Panning (Space+Drag on desktop)
const isSpaceDown = ref(false)
const isPanning = ref(false)
const lastPanClient = ref({ x: 0, y: 0 })

// Keep at least some paper visible (in screen px)
const PAN_VISIBILITY_MARGIN = 40
const isClampingPan = ref(false)

const eraserSize = computed({
  get: () => uiStore.eraserSize,
  set: (val) => uiStore.setEraserSize(val)
})

const stitchControlStyle = computed(() => {
  const base = toolbarHeight.value || 0
  const bottom = Math.max(16, base + 16)
  return {
    bottom: `${bottom}px`
  }
})

const eraserPreview = ref({
  visible: false,
  x: 0,
  y: 0
})


let prevStepsLen = drawingStore.shepherd.steps.length
watch(
  () => drawingStore.shepherd.steps.length,
  (newLen, oldLen) => {
    // only run on undo (step count decreased)
    if (newLen < oldLen) {
      const steps = drawingStore.shepherd.steps
      if (steps.length > 0) {
        // reconnect to the last remaining point
        const last = steps[steps.length - 1]
        lastPos.value = { x: last.x2, y: last.y2 }
      } else {
        // nothing left
        lastPos.value = null
      }
    }
    prevStepsLen = newLen
  }
)

// Base visual constants
const BASE_DOT_RADIUS = 2
const BASE_LINE_WIDTH = 2

// User zoom from drawing store (buttons control this)
const userScale = computed(() => drawingStore.scale || 1)

// Auto-fit the paper to the available viewport (minus margin), then apply user zoom.
const fitScale = computed(() => {
  const availableW = Math.max(1, width.value - PAPER_SHADOW_MARGIN * 2)
  const availableH = Math.max(1, height.value - PAPER_SHADOW_MARGIN * 2)

  const sx = availableW / PAPER_PX.w
  const sy = availableH / PAPER_PX.h

  // Never upscale beyond 1 by default; user can zoom in.
  return Math.min(sx, sy, 1)
})

const effectiveScale = computed(() => {
  return Math.max(0.1, fitScale.value * userScale.value)
})

// Viewport pan (SVG-local pixels)
const pan = computed(() => {
  return {
    x: drawingStore.panX || 0,
    y: drawingStore.panY || 0
  }
})

// Matrix transform: x' = s*x + panX, y' = s*y + panY
const viewportTransform = computed(() => {
  const s = effectiveScale.value
  const x = pan.value.x
  const y = pan.value.y
  return `matrix(${s} 0 0 ${s} ${x} ${y})`
})

// Grid stroke width: constant 1px on screen
const gridStrokeWidth = computed(() => 1 / effectiveScale.value)

// Inset grid from the paper border by ~1px on screen (in world units)
const gridClipInset = computed(() => 1 / effectiveScale.value)

// Subdivision grid: add finer lines when zooming in.
// We pick a power-of-two divisor so existing grid lines remain and new ones appear between them.
const showSubGrid = computed(() => (userScale.value || 1) > 1)
const gridSubDivPow = computed(() => {
  // Determine how many times to subdivide so minor spacing on screen is ~16-28px.
  const baseScreen = GRID_PX * effectiveScale.value
  const target = 22
  if (!Number.isFinite(baseScreen) || baseScreen <= 0) return 0
  const raw = Math.floor(Math.log2(baseScreen / target))
  // cap to avoid overly dense grids
  return Math.max(0, Math.min(raw, 4))
})
const gridSubSpacing = computed(() => {
  const pow = gridSubDivPow.value
  return GRID_PX / Math.pow(2, pow)
})

const paperRect = computed(() => {
  const w = PAPER_PX.w
  const h = PAPER_PX.h
  const totalHeight = height.value
  const totalWidth = width.value

  let x = (totalWidth - w) / 2
  let y = (totalHeight - h) / 2

  const ensureMargin = (value, minMargin, maxValue) => {
    if (value < minMargin) return minMargin
    if (value > maxValue) return maxValue
    return value
  }

  const minX = PAPER_SHADOW_MARGIN
  const maxX = Math.max(minX, totalWidth - w - PAPER_SHADOW_MARGIN)
  x = ensureMargin(x, minX, maxX)

  const minTop = PAPER_SHADOW_MARGIN
  const maxTop = Math.max(minTop, totalHeight - h - PAPER_SHADOW_MARGIN)
  y = ensureMargin(y, minTop, maxTop)

  // If bottom margin is still too small (because viewport is tight), shift up
  const bottomMargin = totalHeight - (y + h)
  if (bottomMargin < PAPER_SHADOW_MARGIN) {
    const shift = PAPER_SHADOW_MARGIN - bottomMargin
    y = Math.max(minTop, y - shift)
  }

  return { x, y, w, h }
})

const backgroundTransform = computed(() => {
  const s = drawingStore.backgroundScale || 1
  const cx = paperRect.value.x + paperRect.value.w / 2
  const cy = paperRect.value.y + paperRect.value.h / 2
  return `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`
})

function isInsidePaper(pos) {
  const r = paperRect.value
  return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h
}

// Calculate distance between two points
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

// Check if mouse event is over the stitch control
function isOverStitchControl(eventOrTouch) {
  const stitchControl = document.querySelector('.stitch-control')
  if (!stitchControl) return false
  
  const rect = stitchControl.getBoundingClientRect()
  const clientX = eventOrTouch.clientX
  const clientY = eventOrTouch.clientY
  
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

// Scale-aware visual elements
function getScaleAwareDotRadius() {
  return BASE_DOT_RADIUS / effectiveScale.value
}

function getScaleAwareLineWidth(isPenDown) {
  const baseWidth = isPenDown ? BASE_LINE_WIDTH : 1
  return baseWidth / effectiveScale.value
}

// Scale-aware stitch spacing
function getScaleAwareStitchSpacing() {
  // IMPORTANT: Stitch spacing should be constant in world/paper coordinates.
  // Pointer positions are already converted back into world units via inverse viewport transform.
  // Therefore, dividing by effectiveScale would incorrectly change the real stitch length when zooming.
  return stitchLength.value
}

function getRelativePos(e) {
  const target = svgRef.value || canvasRef.value
  const rect = target.getBoundingClientRect()
  const localX = e.clientX - rect.left
  const localY = e.clientY - rect.top
  return {
    x: (localX - pan.value.x) / effectiveScale.value,
    y: (localY - pan.value.y) / effectiveScale.value,
  }
}

// Get relative position for touch events
function getTouchRelativePos(touch) {
  const target = svgRef.value || canvasRef.value
  const rect = target.getBoundingClientRect()
  const localX = touch.clientX - rect.left
  const localY = touch.clientY - rect.top
  return {
    x: (localX - pan.value.x) / effectiveScale.value,
    y: (localY - pan.value.y) / effectiveScale.value,
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function getSvgLocalPointFromClient(clientX, clientY) {
  const el = svgRef.value || canvasRef.value
  const rect = el.getBoundingClientRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function clampPanToKeepPaperVisible(candidatePanX, candidatePanY) {
  const s = effectiveScale.value
  const r = paperRect.value
  const vw = width.value
  const vh = height.value
  const m = PAN_VISIBILITY_MARGIN

  // Constraints for "at least part visible":
  // paperRight >= m  and  paperLeft <= vw - m
  // where paperLeft = s*r.x + panX, paperRight = s*(r.x+r.w) + panX
  const minPanX = m - s * (r.x + r.w)
  const maxPanX = (vw - m) - s * r.x
  const minPanY = m - s * (r.y + r.h)
  const maxPanY = (vh - m) - s * r.y

  let x = candidatePanX
  let y = candidatePanY

  if (minPanX > maxPanX) {
    x = (minPanX + maxPanX) / 2
  } else {
    x = Math.max(minPanX, Math.min(maxPanX, x))
  }

  if (minPanY > maxPanY) {
    y = (minPanY + maxPanY) / 2
  } else {
    y = Math.max(minPanY, Math.min(maxPanY, y))
  }

  return { x, y }
}

function setPanClamped(candidatePanX, candidatePanY) {
  const c = clampPanToKeepPaperVisible(candidatePanX, candidatePanY)
  drawingStore.setPan(c.x, c.y)
}

function recenterView() {
  const cx = width.value / 2
  // Shift up a bit so the paper is visually centered above the bottom toolbar
  const cy = Math.max(0, height.value / 2 - 420)
  const s = effectiveScale.value
  setPanClamped((1 - s) * cx, (1 - s) * cy)
  drawingStore.ackRecenter()
}

// Trackpad gestures:
// - Pinch zoom usually arrives as wheel + ctrlKey/metaKey
// - Two-finger pan arrives as wheel without ctrl/meta (deltaX/deltaY)
function onWheelGesture(e) {
  // Don't pan/zoom when interacting with the control overlay
  if (isOverStitchControl(e)) return

  // Pinch zoom
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const anchor = getSvgLocalPointFromClient(e.clientX, e.clientY)
    // Stronger/smoother zoom across devices: normalize delta into pixels.
    const deltaPx =
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * height.value : e.deltaY
    const zoomFactorRaw = Math.exp(-deltaPx * 0.004)
    const zoomFactor = Math.max(0.5, Math.min(2, zoomFactorRaw))
    drawingStore.zoomAt(anchor.x, anchor.y, zoomFactor)
    // Clamp after zoom so paper cannot be lost
    setPanClamped(drawingStore.panX || 0, drawingStore.panY || 0)
    return
  }

  // Two-finger pan (wheel scroll)
  // Only when not actively drawing; otherwise it fights with drawing.
  if (drawing) return

  // Prevent the page from scrolling while panning the canvas.
  e.preventDefault()

  const speed = 1
  setPanClamped(
    (drawingStore.panX || 0) - (e.deltaX || 0) * speed,
    (drawingStore.panY || 0) - (e.deltaY || 0) * speed
  )
}

// Touch pinch zoom (smartphone/tablet)
const pinchState = ref(null)

function getTouchDist(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
}

function getTouchCenterLocal(t1, t2) {
  const cx = (t1.clientX + t2.clientX) / 2
  const cy = (t1.clientY + t2.clientY) / 2
  return getSvgLocalPointFromClient(cx, cy)
}

function beginPinch(t1, t2) {
  const dist = getTouchDist(t1, t2)
  if (!Number.isFinite(dist) || dist <= 0) return

  drawing = false

  const center = getTouchCenterLocal(t1, t2)
  const oldEff = effectiveScale.value
  const oldPan = { x: pan.value.x, y: pan.value.y }

  // World anchor point under pinch center at start
  const worldAnchor = {
    x: (center.x - oldPan.x) / oldEff,
    y: (center.y - oldPan.y) / oldEff,
  }

  pinchState.value = {
    startDist: dist,
    startUserScale: userScale.value,
    worldAnchor,
  }
}

function updatePinch(t1, t2) {
  if (!pinchState.value) return

  const distNow = getTouchDist(t1, t2)
  if (!Number.isFinite(distNow) || distNow <= 0) return

  const centerNow = getTouchCenterLocal(t1, t2)
  const factor = distNow / pinchState.value.startDist
  const nextUser = clamp(pinchState.value.startUserScale * factor, 0.2, 5)

  // Keep worldAnchor under the *moving* center
  const nextEff = fitScale.value * nextUser
  const nextPanX = centerNow.x - pinchState.value.worldAnchor.x * nextEff
  const nextPanY = centerNow.y - pinchState.value.worldAnchor.y * nextEff

  drawingStore.setScale(nextUser)
  setPanClamped(nextPanX, nextPanY)
}

function endPinch() {
  pinchState.value = null
}

// Inline “fixed‐spacing” interpolator:
function lineInterpolateFixed(start, end, fixedDistance) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const total = Math.hypot(dx, dy)
  // if very short, just return endpoints
  if (total < fixedDistance * 0.5) {
    return [start, end]
  }
  const steps = Math.max(1, Math.round(total / fixedDistance))
  const pts = [start]
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    pts.push({ x: start.x + dx * t, y: start.y + dy * t })
  }
  pts.push(end)
  return pts
}

// FIXED: Restore proper interpolate and jump functionality
function ensureConnectedPoints(pos) {
  if (!lastPos.value) {
    lastPos.value = pos
    return
  }

  const spacing = getScaleAwareStitchSpacing()

  if (uiStore.interpolate) {
    // INT ON → break into evenly-spaced stitches
    const pts = lineInterpolateFixed(lastPos.value, pos, spacing)
    for (let i = 1; i < pts.length; i++) {
      addLine(pts[i-1], pts[i])
    }
  } else {
    // INT OFF → one long running stitch
    addLine(lastPos.value, pos)
  }

  lastPos.value = pos
}

function addLine(pos1, pos2) {
  if (uiStore.isJump) {
    drawingStore.addLine(pos1.x, pos1.y, pos2.x, pos2.y, false)
    uiStore.toggleJump() // Toggle back to normal drawing
  } else {
    drawingStore.addLine(pos1.x, pos1.y, pos2.x, pos2.y, true)
  }
}

function onPointerDown(e) {
  if (isOverStitchControl(e)) {
    return
  }

  // Space+Drag panning on desktop
  if (isSpaceDown.value) {
    drawing = false
    isPanning.value = true
    lastPanClient.value = { x: e.clientX, y: e.clientY }
    return
  }
  
  drawing = true
  const pos = getRelativePos(e)

  if (!isInsidePaper(pos)) {
    drawing = false
    eraserPreview.value.visible = false
    return
  }

  if (uiStore.isEraser) {
    const deleted = drawingStore.eraseStitchesInRadius(pos.x, pos.y, eraserSize.value / effectiveScale.value)
    console.log(`🧹 Erased ${deleted} stitches`)
    return
  }

  if (lastPos.value) {
    ensureConnectedPoints(pos)
  } else {
    lastPos.value = pos
  }
}

function onPointerMove(e) {
  if (isPanning.value) {
    const dx = e.clientX - lastPanClient.value.x
    const dy = e.clientY - lastPanClient.value.y
    lastPanClient.value = { x: e.clientX, y: e.clientY }
    setPanClamped((drawingStore.panX || 0) + dx, (drawingStore.panY || 0) + dy)
    return
  }

  const pos = getRelativePos(e)

  const insidePaper = isInsidePaper(pos)
  
  if (uiStore.isEraser) {
    eraserPreview.value = {
      visible: insidePaper,
      x: pos.x,
      y: pos.y
    }
    
    if (insidePaper && drawing && !isOverStitchControl(e)) {
      const deleted = drawingStore.eraseStitchesInRadius(pos.x, pos.y, eraserSize.value / effectiveScale.value)
      if (deleted > 0) {
        console.log(`🧹 Erased ${deleted} stitches`)
      }
    }
    return
  } else {
    eraserPreview.value.visible = false
  }
  
  if (!drawing) return
  if (isOverStitchControl(e)) return

  if (!insidePaper) {
    drawing = false
    return
  }

  if (distance(lastPos.value || pos, pos) >= getScaleAwareStitchSpacing()) {
    ensureConnectedPoints(pos)
  }
}

function onPointerUp(e) {
  drawing = false
  isPanning.value = false
  eraserPreview.value.visible = false
}

// Touch event handlers
function onTouchStart(e) {
  if (e.touches.length === 2) {
    beginPinch(e.touches[0], e.touches[1])
    return
  }
  if (e.touches.length !== 1) return
  if (isOverStitchControl(e.touches[0])) return
  
  drawing = true
  const pos = getTouchRelativePos(e.touches[0])

  if (!isInsidePaper(pos)) {
    drawing = false
    eraserPreview.value.visible = false
    return
  }
  
  if (uiStore.isEraser) {
    const deleted = drawingStore.eraseStitchesInRadius(pos.x, pos.y, eraserSize.value / effectiveScale.value)
    console.log(`🧹 Erased ${deleted} stitches`)
    return
  }
  
  if (lastPos.value) {
    ensureConnectedPoints(pos)
  } else {
    lastPos.value = pos
  }
}

function onTouchMove(e) {
  if (pinchState.value && e.touches.length === 2) {
    updatePinch(e.touches[0], e.touches[1])
    return
  }
  if (!drawing || e.touches.length !== 1) return
  if (isOverStitchControl(e.touches[0])) return

  const pos = getTouchRelativePos(e.touches[0])

  if (!isInsidePaper(pos)) {
    drawing = false
    eraserPreview.value.visible = false
    return
  }
  
  if (uiStore.isEraser) {
    const deleted = drawingStore.eraseStitchesInRadius(pos.x, pos.y, eraserSize.value / effectiveScale.value)
    if (deleted > 0) {
      console.log(`🧹 Erased ${deleted} stitches`)
    }
    return
  }
  
  if (distance(lastPos.value || pos, pos) >= getScaleAwareStitchSpacing()) {
    ensureConnectedPoints(pos)
  }
}

function onTouchEnd(e) {
  if (pinchState.value && e.touches.length < 2) {
    endPinch()
  }
  drawing = false
  eraserPreview.value.visible = false
}

const onDrop = async (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (!file) return

  try {
    isImporting.value = true
    await drawingStore.importDST(file)
  } catch (error) {
    console.error('Import failed:', error)
    alert('Import failed: ' + error.message)
  } finally {
    isImporting.value = false
  }
}

// Virtualize large step lists
const visibleSteps = computed(() => {
  return drawingStore.shepherd.steps
})

// Keep pan within bounds whenever something changes that affects visibility.
watch(
  [
    () => drawingStore.panX,
    () => drawingStore.panY,
    () => drawingStore.scale,
    fitScale,
    paperRect,
    width,
    height,
  ],
  () => {
    if (isClampingPan.value) return
    isClampingPan.value = true
    try {
      const c = clampPanToKeepPaperVisible(drawingStore.panX || 0, drawingStore.panY || 0)
      if (c.x !== (drawingStore.panX || 0) || c.y !== (drawingStore.panY || 0)) {
        drawingStore.setPan(c.x, c.y)
      }
    } finally {
      isClampingPan.value = false
    }
  }
)

function handleGlobalKeydown(event) {
  if (event.code === 'Space') {
    isSpaceDown.value = true
    // Avoid page scrolling while user intends to pan
    event.preventDefault()
  }

  // Handle Ctrl+Z / Cmd+Z for undo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    drawingStore.undo()
    lastPos.value = null
    event.preventDefault()
    return
  }
  
  // Pass other keys to UI store handler
  uiStore.handleKeydown(event)
}

function handleGlobalKeyup(event) {
  if (event.code === 'Space') {
    isSpaceDown.value = false
    isPanning.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('keyup', handleGlobalKeyup)

  const getToolbarHeight = () => {
    const el = document.querySelector('.toolbar-bottom')
    return el ? el.getBoundingClientRect().height : 0
  }

  const onResize = () => {
    toolbarHeight.value = getToolbarHeight()
    width.value = window.innerWidth
    // reserve bottom space for the fixed toolbar + a small breathing room
    height.value = window.innerHeight - toolbarHeight.value

    drawingStore.setViewportSize(width.value, height.value)

    // If view requests recenter (initial load/reset/clear), center around viewport center
    if (drawingStore.needsRecenter) {
      recenterView()
    }
  }

  // Initial measurement
  onResize()

  window.addEventListener('resize', onResize)

  // store reference for cleanup
  canvasRef.value.__onResize = onResize

  if (drawingStore.shepherd && typeof drawingStore.shepherd.zoom === 'function') {
    drawingStore.shepherd.zoom = (factor) => {
      drawingStore.zoomAtCenter(factor)
    }
  }

  // Trackpad pinch zoom (ctrl/meta + wheel)
  if (svgRef.value) {
    svgRef.value.addEventListener('wheel', onWheelGesture, { passive: false })
  }

  // Ensure pan is clamped on first render
  setPanClamped(drawingStore.panX || 0, drawingStore.panY || 0)

  // Recenter when requested (e.g., reset/clear without a resize)
  watch(
    () => drawingStore.needsRecenter,
    (v) => {
      if (v) recenterView()
    }
  )
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('keyup', handleGlobalKeyup)
  if (canvasRef.value?.__onResize) {
    window.removeEventListener('resize', canvasRef.value.__onResize)
  }

  if (svgRef.value) {
    svgRef.value.removeEventListener('wheel', onWheelGesture)
  }
})

function undo() {
  drawingStore.undo()
  lastPos.value = null // Reset lastPos when undo is triggered
}
</script>

<style scoped>
.drawing-canvas {
  width: 100vw;
  height: calc(100vh - var(--toolbar-height, 0px) + var(--shadow-padding, 0px));
  padding-bottom: var(--shadow-padding, 0px);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  background: #eeeeee;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.stitch-control {
  position: absolute;
  bottom: 45px;  
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 200px;
  pointer-events: auto;
  touch-action: auto;
}

.eraser-control {
  border-color: #ff4444;
  background: rgba(255, 244, 244, 0.95);
}

.eraser-control label {
  color: #ff4444;
}

.eraser-control .scale-slider::-webkit-slider-thumb {
  background: #ff4444;
}

.eraser-control .scale-slider::-moz-range-thumb {
  background: #ff4444;
}

.eraser-control .scale-value {
  background: #ffe0e0;
  color: #ff4444;
}

.stitch-scale label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 0.9rem;
}

.scale-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.scale-label {
  font-size: 0.8rem;
  color: #666;
  min-width: 35px;
  text-align: center;
}

.scale-slider {
  flex: 1;
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.scale-slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  background: #7a0081;
  border-radius: 50%;
  cursor: pointer;
}

.scale-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: #7a0081;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.scale-value {
  text-align: center;
  font-size: 0.8rem;
  color: #7a0081;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background: #f8f0f9;
  border-radius: 4px;
}

svg {
  display: block;
  position: relative;
  z-index: 1;
}

.import-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgb(255, 255, 255);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.import-message {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 1.2rem;
}

/* Mobile-specific adjustments */
@media (max-width: 768px) {
  .stitch-control {
    bottom: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }
  
  .drawing-canvas {
    height: calc(100vh - var(--toolbar-height, 0px) + var(--shadow-padding, 0px));
  }
}
</style>

import { defineStore } from 'pinia'
import { TurtleShepherd } from '@/lib/app.js'
import { ExportService } from '@/services/exportService.js'
import { MACHINE_CONFIG, MACHINE_BOUNDS_PORTRAIT, MACHINE_BOUNDS_LANDSCAPE } from '@/config/machine.js'
import { DEFAULT_PAPER_ORIENTATION, GRID_PX, PAPER_PX_PORTRAIT, PAPER_PX_LANDSCAPE } from '@/config/paper.js'
import { optimizeStitchPaths, analyzeStitches } from '@/utils/pathOptimizer.js'
import { fitPathsToRect, calculatePathBounds } from '@/utils/pathPlacement.js'
import { simplifyPathToTargetCount } from '@/utils/pathSimplify.js'

// Default view scale (used on initial load/reset). Increased by ~20%.
const DEFAULT_VIEW_SCALE = 1.08

function clonePaths(paths) {
  if (!Array.isArray(paths)) return null
  return paths.map((path) => Array.isArray(path) ? path.map((pt) => [pt[0], pt[1]]) : [])
}

export const useDrawingStore = defineStore('drawing', {
  state: () => ({
    shepherd: new TurtleShepherd(MACHINE_CONFIG.maxX, MACHINE_CONFIG.maxY),
    scale: DEFAULT_VIEW_SCALE,
    paperOrientation: DEFAULT_PAPER_ORIENTATION,
    // Current paper rect in world coords (used for exports)
    paperRect: { x: 0, y: 0, w: 0, h: 0 },
    // Viewport transform (for cursor-centered zoom / future pan)
    panX: 0,
    panY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    // When true, UI should recenter the viewport to its default centered position
    needsRecenter: true,
    backgroundImage: null,
    backgroundScale: 1,
    stitchType: 'running',
    lastVectorizedImage: null,
    lastVectorizeSettings: null,
    optimizePathsEnabled: true, // New: Path optimization toggle
    // Separation of vectorization and stitching
    vectorizedPaths: null, // Stores raw vectorized paths (not stitches yet)
    vectorizationMetadata: null, // Stores bounds, scale info, etc.
    showVectorizedOverlay: false, // When true, render vector paths overlay on canvas

    // Optional simplification for vector paths (affects overlay + stitching)
    vectorSimplifyEnabled: false,
    // Progressive corner-preserving simplification:
    // - Each level reduces points by ~8% (configurable) while preserving corners.
    vectorSimplifyLevel: 0,
    vectorSimplifyStepReduction: 0.08,
    vectorSimplifyCornerAngleDeg: 120,

    // Track whether the current stitch design was generated from vector paths
    vectorStitchesApplied: false,
    lastVectorStitchSettings: null,
    _applyingVectorStitches: false,

    // Undo snapshots for non-step operations (erase, Ctrl+L simplify, vector re-apply).
    // We keep the existing step-based undo for normal drawing (shepherd.undoStep()).
    undoStack: [],
    redoStack: [],
    _skipNextUndoSnapshot: false,
    _inUndoRedo: false,
  }),

  getters: {
    machineBounds: (state) => {
      return state.paperOrientation === 'landscape' ? MACHINE_BOUNDS_LANDSCAPE : MACHINE_BOUNDS_PORTRAIT
    },
    paperPx: (state) => {
      return state.paperOrientation === 'landscape' ? PAPER_PX_LANDSCAPE : PAPER_PX_PORTRAIT
    },
    scaleAwareDistances: (state) => {
      const BASE_DIST_MIN = 8
      const BASE_DIST_MAX = 12
      return {
        dist_min: BASE_DIST_MIN / state.scale,
        dist_max: BASE_DIST_MAX / state.scale,
      }
    },

    scaleAwareLineWidth: (state) => (isPenDown) => {
      const baseWidth = isPenDown ? 2 : 1
      return baseWidth / state.scale
    },

    scaleAwareDotRadius: (state) => {
      return 2 / state.scale
    },

    scaledBackgroundImage: (state) => {
      if (!state.backgroundImage) return null
      return {
        url: state.backgroundImage,
        scale: state.backgroundScale,
      }
    },

    effectiveVectorizedPaths: (state) => {
      const paths = state.vectorizedPaths
      if (!paths || paths.length === 0) return null

      const level = Number.isFinite(state.vectorSimplifyLevel) ? state.vectorSimplifyLevel : 0
      if (!state.vectorSimplifyEnabled || level <= 0) return paths

      const stepReduction = Number.isFinite(state.vectorSimplifyStepReduction) ? state.vectorSimplifyStepReduction : 0.08
      const clampedStepReduction = Math.min(0.25, Math.max(0.01, stepReduction))
      const cornerAngleDeg = Number.isFinite(state.vectorSimplifyCornerAngleDeg) ? state.vectorSimplifyCornerAngleDeg : 120

      const simplified = []
      for (const path of paths) {
        if (!path || path.length < 2) continue
        const target = Math.max(2, Math.round(path.length * Math.pow(1 - clampedStepReduction, level)))
        const sp = simplifyPathToTargetCount(path, target, { cornerAngleDeg })
        if (sp && sp.length >= 2) simplified.push(sp)
      }
      return simplified.length ? simplified : paths
    },
  },

  actions: {
    setPaperRect(rect) {
      if (!rect) return
      const x = Number.isFinite(rect.x) ? rect.x : 0
      const y = Number.isFinite(rect.y) ? rect.y : 0
      const w = Number.isFinite(rect.w) ? rect.w : 0
      const h = Number.isFinite(rect.h) ? rect.h : 0
      this.paperRect = { x, y, w, h }
    },
    togglePaperOrientation() {
      this.paperOrientation = this.paperOrientation === 'landscape' ? 'portrait' : 'landscape'
      // Keep current pan/zoom when flipping orientation.
      // DrawingCanvas will still clamp pan to keep some paper visible.
      this.needsRecenter = false
    },

    // Rotate all stitches by 90° around the paper center when flipping orientation.
    // This keeps the drawing "on the paper" and matches the visual flip (no scaling).
    rotateDesignForOrientationFlip(oldRect, newRect, direction) {
      if (!oldRect || !newRect) return
      if (!Number.isFinite(oldRect.w) || !Number.isFinite(oldRect.h) || oldRect.w === 0 || oldRect.h === 0) return
      if (!Number.isFinite(newRect.w) || !Number.isFinite(newRect.h) || newRect.w === 0 || newRect.h === 0) return

      const steps = this.shepherd.steps || []
      if (steps.length === 0) return

      const snapToGrid = (v, origin) => {
        const step = Number.isFinite(GRID_PX) && GRID_PX > 0 ? GRID_PX : 1
        return origin + Math.round((v - origin) / step) * step
      }

      const oldCx = oldRect.x + oldRect.w / 2
      const oldCy = oldRect.y + oldRect.h / 2
      const newCx = newRect.x + newRect.w / 2
      const newCy = newRect.y + newRect.h / 2

      const oldPivot = {
        x: snapToGrid(oldCx, oldRect.x),
        y: snapToGrid(oldCy, oldRect.y),
      }
      const newPivot = {
        x: snapToGrid(newCx, newRect.x),
        y: snapToGrid(newCy, newRect.y),
      }

      const tx = newPivot.x - oldPivot.x
      const ty = newPivot.y - oldPivot.y

      const rotatePoint = (x, y) => {
        const dx = x - oldPivot.x
        const dy = y - oldPivot.y

        // SVG coordinates are y-down.
        // portrait -> landscape should map "top" to "right" (clockwise visual rotation).
        let rdx, rdy
        if (direction === 'cw') {
          rdx = -dy
          rdy = dx
        } else {
          rdx = dy
          rdy = -dx
        }

        return { x: oldPivot.x + rdx + tx, y: oldPivot.y + rdy + ty }
      }

      this.shepherd.steps = steps.map((s) => {
        const p1 = rotatePoint(s.x1, s.y1)
        const p2 = rotatePoint(s.x2, s.y2)
        return { ...s, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
      })

      const last = this.shepherd.steps[this.shepherd.steps.length - 1]
      this.shepherd.currentX = last?.x2 ?? 0
      this.shepherd.currentY = last?.y2 ?? 0

      // Recompute extents
      this.shepherd.maxX = Math.max(...this.shepherd.steps.map((s) => Math.max(s.x1, s.x2)), 0)
      this.shepherd.maxY = Math.max(...this.shepherd.steps.map((s) => Math.max(s.y1, s.y2)), 0)
    },
    // Viewport helpers
    setPan(x, y) {
      const nx = Number.isFinite(x) ? x : 0
      const ny = Number.isFinite(y) ? y : 0
      this.panX = nx
      this.panY = ny
      this.needsRecenter = false
    },

    ackRecenter() {
      this.needsRecenter = false
    },

    setViewportSize(width, height) {
      const w = Number.isFinite(width) ? Math.max(0, width) : 0
      const h = Number.isFinite(height) ? Math.max(0, height) : 0
      this.viewportWidth = w
      this.viewportHeight = h
    },

    // Zoom around an anchor point in SVG-local coordinates
    zoomAt(anchorX, anchorY, factor) {
      if (!Number.isFinite(factor) || factor === 0) return

      const oldScale = this.scale
      const nextScale = Math.max(0.2, Math.min(oldScale * factor, 5))
      if (nextScale === oldScale) return

      const k = nextScale / oldScale
      const ax = Number.isFinite(anchorX) ? anchorX : (this.viewportWidth || 0) / 2
      const ay = Number.isFinite(anchorY) ? anchorY : (this.viewportHeight || 0) / 2

      // Keep world point under (ax, ay) stable: newPan = a - (a - oldPan) * k
      this.panX = ax - (ax - this.panX) * k
      this.panY = ay - (ay - this.panY) * k
      this.scale = nextScale
      this.needsRecenter = false
    },

    zoomAtCenter(factor) {
      const cx = (this.viewportWidth || 0) / 2
      const cy = (this.viewportHeight || 0) / 2
      // If viewport size is unknown, fall back to plain scale change
      if (!cx && !cy) {
        this.setScale(this.scale * factor)
        return
      }
      this.zoomAt(cx, cy, factor)
    },

    resetView() {
      this.scale = DEFAULT_VIEW_SCALE
      this.panX = 0
      this.panY = 0
      this.needsRecenter = true
    },

    // Drawing actions
    clear() {
      this.shepherd.clear()
      // Reset the drawing state completely
      this.resetView()
      this.backgroundImage = null
      this.backgroundScale = 1

      this.undoStack = []
      this.redoStack = []
    },

    // Clear stitches without touching the current viewport (pan/zoom) or background.
    // Used for re-applying vector stitches (e.g. Ctrl+L) without "jumping" the canvas.
    clearStitchesOnly() {
      this.shepherd.clear()
    },

    _takeSnapshot(reason = '') {
      const steps = Array.isArray(this.shepherd.steps) ? this.shepherd.steps : []
      return {
        reason,
        steps: steps.map((s) => ({ ...s })),
        currentX: this.shepherd.currentX,
        currentY: this.shepherd.currentY,
        maxX: this.shepherd.maxX,
        maxY: this.shepherd.maxY,
        vectorStitchesApplied: this.vectorStitchesApplied,
        lastVectorStitchSettings: this.lastVectorStitchSettings ? { ...this.lastVectorStitchSettings } : null,
        vectorizedPaths: clonePaths(this.vectorizedPaths),
        vectorizationMetadata: this.vectorizationMetadata ? { ...this.vectorizationMetadata } : null,
        showVectorizedOverlay: this.showVectorizedOverlay,
        vectorSimplifyEnabled: this.vectorSimplifyEnabled,
        vectorSimplifyLevel: this.vectorSimplifyLevel,
      }
    },

    _clearRedoOnEdit() {
      if (this._inUndoRedo) return
      if (this.redoStack.length > 0) {
        this.redoStack = []
      }
    },

    captureUndoSnapshot(reason = '') {
      this._clearRedoOnEdit()
      const snapshot = this._takeSnapshot(reason)
      this.undoStack.push(snapshot)

      // Cap memory growth.
      const MAX_UNDO_SNAPSHOTS = 30
      if (this.undoStack.length > MAX_UNDO_SNAPSHOTS) {
        this.undoStack.splice(0, this.undoStack.length - MAX_UNDO_SNAPSHOTS)
      }
    },

    _restoreUndoSnapshot(snapshot) {
      if (!snapshot) return

      this.shepherd.steps = Array.isArray(snapshot.steps) ? snapshot.steps.map((s) => ({ ...s })) : []
      this.shepherd.currentX = Number.isFinite(snapshot.currentX) ? snapshot.currentX : 0
      this.shepherd.currentY = Number.isFinite(snapshot.currentY) ? snapshot.currentY : 0
      this.shepherd.maxX = Number.isFinite(snapshot.maxX) ? snapshot.maxX : 0
      this.shepherd.maxY = Number.isFinite(snapshot.maxY) ? snapshot.maxY : 0

      this.vectorStitchesApplied = !!snapshot.vectorStitchesApplied
      this.lastVectorStitchSettings = snapshot.lastVectorStitchSettings ? { ...snapshot.lastVectorStitchSettings } : null
      this.vectorizedPaths = clonePaths(snapshot.vectorizedPaths)
      this.vectorizationMetadata = snapshot.vectorizationMetadata ? { ...snapshot.vectorizationMetadata } : null
      this.showVectorizedOverlay = !!snapshot.showVectorizedOverlay
      this.vectorSimplifyEnabled = !!snapshot.vectorSimplifyEnabled
      this.vectorSimplifyLevel = Number.isFinite(snapshot.vectorSimplifyLevel) ? snapshot.vectorSimplifyLevel : 0
    },

    undo() {
      this._inUndoRedo = true
      try {
      // Prefer snapshot undo for non-step operations (erase, simplify, vector re-apply).
      if (this.undoStack.length > 0) {
        this.redoStack.push(this._takeSnapshot('redo'))
        const snapshot = this.undoStack.pop()
        this._restoreUndoSnapshot(snapshot)
        return
      }

      this.redoStack.push(this._takeSnapshot('redo'))

      // Fallback: step-based undo for normal drawing.
      this.shepherd.undoStep()
      this.vectorStitchesApplied = false
      if (this.shepherd.steps.length > 0) {
        const lastStep = this.shepherd.steps[this.shepherd.steps.length - 1]
        this.shepherd.currentX = lastStep.x2
        this.shepherd.currentY = lastStep.y2
      } else {
        this.shepherd.currentX = 0
        this.shepherd.currentY = 0
      }
      } finally {
        this._inUndoRedo = false
      }
    },

    redo() {
      if (this.redoStack.length === 0) return

      this._inUndoRedo = true
      try {
        this.undoStack.push(this._takeSnapshot('undo'))
        const snapshot = this.redoStack.pop()
        this._restoreUndoSnapshot(snapshot)
      } finally {
        this._inUndoRedo = false
      }
    },

    addLine(x1, y1, x2, y2, penDown) {
      this.shepherd.moveTo(x1, y1, x2, y2, penDown)

      // Any new edits invalidate redo history.
      if (!this._applyingVectorStitches) {
        this._clearRedoOnEdit()
      }

      if (!this._applyingVectorStitches) {
        this.vectorStitchesApplied = false
      }
    },
 
    addPoint(x, y) {
      this.shepherd.addPoint(x, y)

      if (!this._applyingVectorStitches) {
        this._clearRedoOnEdit()
      }

      if (!this._applyingVectorStitches) {
        this.vectorStitchesApplied = false
      }
    },

    eraseStitchesInRadius(x, y, radius, captureUndo = false) {
      if (captureUndo) {
        this.captureUndoSnapshot('erase')
      }

      const originalCount = this.shepherd.steps.length
      
      this.shepherd.steps = this.shepherd.steps.filter(step => {
        const distStart = Math.sqrt(
          Math.pow(step.x1 - x, 2) + Math.pow(step.y1 - y, 2)
        )
        const distEnd = Math.sqrt(
          Math.pow(step.x2 - x, 2) + Math.pow(step.y2 - y, 2)
        )
        
        return distStart > radius && distEnd > radius
      })

      const deletedCount = originalCount - this.shepherd.steps.length
      
      if (this.shepherd.steps.length > 0) {
        this.shepherd.maxX = Math.max(...this.shepherd.steps.map((s) => Math.max(s.x1, s.x2)))
        this.shepherd.maxY = Math.max(...this.shepherd.steps.map((s) => Math.max(s.y1, s.y2)))
      } else {
        this.shepherd.maxX = 0
        this.shepherd.maxY = 0
      }

      this.vectorStitchesApplied = false

      return deletedCount
    },

    eraseVectorizedPathsInRadius(x, y, radius, captureUndo = false) {
      if (!Array.isArray(this.vectorizedPaths) || this.vectorizedPaths.length === 0) return 0
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) return 0

      const autoFit = this.vectorizationMetadata?.autoFit ?? this.vectorizationMetadata?.settings?.autoFitToCanvas ?? true
      const outputScale = Number.isFinite(this.vectorizationMetadata?.outputScale)
        ? this.vectorizationMetadata.outputScale
        : (Number.isFinite(this.vectorizationMetadata?.settings?.outputScale) ? this.vectorizationMetadata.settings.outputScale : 1)

      // Erase against raw vector paths so geometry edits are persistent and predictable.
      this.vectorSimplifyEnabled = false
      this.vectorSimplifyLevel = 0

      const sourcePaths = this.vectorizedPaths
      const originalBounds = this.vectorizationMetadata?.bounds || calculatePathBounds(sourcePaths)
      const bounds = originalBounds
      if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
        return 0
      }

      const targetRect = this.paperRect
      const safeMargin = 0.9
      const targetW = targetRect.w * safeMargin
      const targetH = targetRect.h * safeMargin
      const targetX = targetRect.x + (targetRect.w - targetW) / 2
      const targetY = targetRect.y + (targetRect.h - targetH) / 2

      let scale = outputScale
      let offsetX = targetX
      let offsetY = targetY

      if (autoFit) {
        const scaleX = targetW / bounds.width
        const scaleY = targetH / bounds.height
        const autoScale = Math.min(scaleX, scaleY)
        scale = autoScale * outputScale

        const scaledW = bounds.width * scale
        const scaledH = bounds.height * scale
        offsetX = targetRect.x + (targetRect.w - scaledW) / 2
        offsetY = targetRect.y + (targetRect.h - scaledH) / 2
      }

      const hitRadius2 = radius * radius
      const nextPaths = []
      let removedPoints = 0

      for (const path of sourcePaths) {
        if (!Array.isArray(path) || path.length < 2) continue

        let segment = []
        for (const [px, py] of path) {
          const tx = (px - bounds.minX) * scale + offsetX
          const ty = (py - bounds.minY) * scale + offsetY
          const dx = tx - x
          const dy = ty - y
          const inside = (dx * dx + dy * dy) <= hitRadius2

          if (inside) {
            removedPoints++
            if (segment.length >= 2) nextPaths.push(segment)
            segment = []
          } else {
            segment.push([px, py])
          }
        }

        if (segment.length >= 2) nextPaths.push(segment)
      }

      if (removedPoints <= 0) return 0

      if (captureUndo) {
        this.captureUndoSnapshot('erase')
      }

      this.vectorizedPaths = nextPaths.length ? nextPaths : null

      if (this.vectorizationMetadata) {
        this.vectorizationMetadata = {
          ...this.vectorizationMetadata,
          // Keep original bounds stable so overlay placement does not drift while erasing.
          bounds: originalBounds,
          pathCount: this.vectorizedPaths ? this.vectorizedPaths.length : 0,
        }
      }

      this.showVectorizedOverlay = !!(this.vectorizedPaths && this.vectorizedPaths.length)
      this.vectorStitchesApplied = false

      return removedPoints
    },

    // Export actions with path optimization
    async exportSVG(name = 'design') {
      const steps = this.optimizePathsEnabled ? optimizeStitchPaths(this.shepherd.steps) : this.shepherd.steps
      await ExportService.exportSVG(steps, name, this.paperPx, this.paperRect)
    },

    async exportGCode(name = 'design') {
      const steps = this.optimizePathsEnabled 
        ? optimizeStitchPaths(this.shepherd.steps)
        : this.shepherd.steps
      await ExportService.exportGCode(steps, name, this.machineBounds, this.paperPx, this.paperRect)
    },

    async exportTXT(name = 'design') {
      const steps = this.optimizePathsEnabled
        ? optimizeStitchPaths(this.shepherd.steps)
        : this.shepherd.steps
      await ExportService.exportTXT(steps, name, this.paperPx, this.paperRect)
    },

    async exportPNG(name = 'design') {
      const steps = this.optimizePathsEnabled
        ? optimizeStitchPaths(this.shepherd.steps)
        : this.shepherd.steps
      await ExportService.exportPNG(steps, name, this.paperPx, this.paperRect)
    },

    async exportJPG(name = 'design') {
      const steps = this.optimizePathsEnabled
        ? optimizeStitchPaths(this.shepherd.steps)
        : this.shepherd.steps
      await ExportService.exportJPG(steps, name, this.paperPx, this.paperRect)
    },

    async exportPDF(name = 'design') {
      const steps = this.optimizePathsEnabled
        ? optimizeStitchPaths(this.shepherd.steps)
        : this.shepherd.steps
      await ExportService.exportPDF(steps, name, this.paperPx, this.paperRect)
    },

    // Helper to get shepherd with optimized paths if enabled
    getOptimizedShepherd() {
      if (this.optimizePathsEnabled) {
        const optimizedSteps = optimizeStitchPaths(this.shepherd.steps)

        // IMPORTANT: Do not spread a class instance into a plain object.
        // That drops prototype methods (toSVG/toDST/...) and breaks exports.
        const s = new TurtleShepherd()
        s.steps = optimizedSteps
        if (s.steps.length > 0) {
          const last = s.steps[s.steps.length - 1]
          s.currentX = last.x2
          s.currentY = last.y2
          s.maxX = Math.max(...s.steps.map((st) => Math.max(st.x1, st.x2)), 0)
          s.maxY = Math.max(...s.steps.map((st) => Math.max(st.y1, st.y2)), 0)
        }
        return s
      }
      return this.shepherd
    },

    // Toggle path optimization
    setPathOptimization(enabled) {
      this.optimizePathsEnabled = enabled
      console.log(`Path optimization ${enabled ? 'enabled' : 'disabled'}`)
    },

    // Get optimization statistics
    getOptimizationStats() {
      if (this.shepherd.steps.length === 0) {
        return null
      }
      
      const originalStats = analyzeStitches(this.shepherd.steps)
      const optimizedSteps = optimizeStitchPaths(this.shepherd.steps)
      const optimizedStats = analyzeStitches(optimizedSteps)
      
      return {
        original: originalStats,
        optimized: optimizedStats,
        improvement: {
          jumpsReduced: originalStats.jumps - optimizedStats.jumps,
          jumpsPercent: ((originalStats.jumps - optimizedStats.jumps) / originalStats.jumps * 100).toFixed(1),
          distanceSaved: (originalStats.jumpDistance - optimizedStats.jumpDistance).toFixed(1),
        }
      }
    },

    // Scale actions
    setScale(newScale) {
      this.scale = Math.max(0.2, Math.min(newScale, 5))
    },

    zoomIn(factor = 1.1) {
      this.zoomAtCenter(factor)
    },

    zoomOut(factor = 0.9) {
      this.zoomAtCenter(factor)
    },

    resetZoom() {
      this.resetView()
    },

    // Background actions
    setBackground(imageDataUrl) {
      this.backgroundImage = imageDataUrl
    },

    setBackgroundScale(scale) {
      this.backgroundScale = Math.max(0.1, Math.min(scale, 3))
    },

    clearBackground() {
      this.backgroundImage = null
      this.backgroundScale = 1
    },

    // Import action
    importDST(file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const fileContent = new Uint8Array(event.target.result)
          if (fileContent.length > 0) {
            this.shepherd.fromDST(fileContent)
            console.log('DST file imported successfully')
          } else {
            console.error('DST file is empty')
          }
        } catch (error) {
          console.error('DST file import failed:', error.message)
        }
      }
      reader.readAsArrayBuffer(file)
    },

    setStitchType(type) { 
      this.stitchType = type;
      console.log(`Stitch type set to: ${type}`);
    },

    // Add vectorized paths as stitches
    addVectorizedPaths(paths, scale = 1) {
      for (const path of paths) {
        for (let i = 0; i < path.length - 1; i++) {
          const [x1, y1] = path[i]
          const [x2, y2] = path[i + 1]
          
          this.addLine(
            x1 * scale,
            y1 * scale,
            x2 * scale,
            y2 * scale,
            true
          )
        }
      }
    },

    // NEW: Store vectorized paths without converting to stitches
    setVectorizedPaths(paths, metadata = null) {
      this.vectorizedPaths = paths
      this.vectorizationMetadata = metadata
      this.showVectorizedOverlay = !!(paths && paths.length)
      this.vectorStitchesApplied = false

      // Reset progressive simplification for new vectorization.
      this.vectorSimplifyEnabled = false
      this.vectorSimplifyLevel = 0
      console.log('📦 Vectorized paths stored:', {
        pathCount: paths?.length,
        metadata
      })
    },

    // NEW: Clear vectorized paths
    clearVectorizedPaths() {
      this.vectorizedPaths = null
      this.vectorizationMetadata = null
      this.showVectorizedOverlay = false
    },

    setVectorizedOverlayVisible(visible) {
      this.showVectorizedOverlay = !!visible
    },

    // Ctrl+L / Cmd+L: each press increases simplification level.
    stepVectorSimplify() {
      // Make Ctrl+L undoable.
      this.captureUndoSnapshot('simplify')

      this.vectorSimplifyEnabled = true
      const nextLevel = (Number.isFinite(this.vectorSimplifyLevel) ? this.vectorSimplifyLevel : 0) + 1
      this.vectorSimplifyLevel = Math.max(0, Math.min(nextLevel, 50))

      // Make the effect visible immediately:
      // - If the current stitches were generated from vector paths, reapply using last settings.
      // - Otherwise show the vector overlay (if vector paths exist) so the user sees the simplification.
      if (this.vectorStitchesApplied && this.lastVectorStitchSettings && this.vectorizedPaths && this.shepherd.steps.length > 0) {
        // Avoid double snapshot (we already captured above).
        this._skipNextUndoSnapshot = true
        this.applyVectorizedPathsAsStitches(this.lastVectorStitchSettings)
        return
      }

      if (this.vectorizedPaths && this.vectorizedPaths.length > 0) {
        this.showVectorizedOverlay = true
      }
    },

    setVectorSimplifyLevel(level) {
      const n = Number.isFinite(level) ? level : 0
      const clamped = Math.max(0, Math.min(Math.floor(n), 50))
      this.vectorSimplifyLevel = clamped
      this.vectorSimplifyEnabled = clamped > 0
    },

    resetVectorSimplify() {
      this.vectorSimplifyEnabled = false
      this.vectorSimplifyLevel = 0
    },

    // NEW: Apply vectorized paths as stitches with settings
    applyVectorizedPathsAsStitches(stitchSettings = {}) {
      if (!this.vectorizedPaths) {
        console.warn('No vectorized paths to apply')
        return
      }

      if (!this._skipNextUndoSnapshot) {
        this.captureUndoSnapshot('applyVectors')
      }

      // Persist last settings so keyboard shortcuts can re-apply.
      this.lastVectorStitchSettings = { ...stitchSettings }
      this.vectorStitchesApplied = true
      this._applyingVectorStitches = true

      const {
        stitchType = 'running',
        stitchLength = 3.0,
        scale = 1.0,
        autoFitToCanvas = true,
      } = stitchSettings

      console.log('🎯 Applying vectorized paths as stitches:', {
        pathCount: this.vectorizedPaths.length,
        stitchType,
        stitchLength,
        scale
      })

      try {
        // Clear existing stitches
        this.clearStitchesOnly()

      // Place paths onto the paper rect in world coordinates.
      // This ensures the stitched output matches the vector overlay placement.
      const meta = this.vectorizationMetadata
      const baseScale = Number.isFinite(meta?.outputScale)
        ? meta.outputScale
        : (Number.isFinite(meta?.settings?.outputScale) ? meta.settings.outputScale : 1.0)
      const bounds = meta?.bounds ?? null

      const sourcePaths = this.effectiveVectorizedPaths || this.vectorizedPaths

      const placedPaths = fitPathsToRect(sourcePaths, this.paperRect, {
        bounds: this.vectorSimplifyEnabled ? null : bounds,
        autoFit: !!autoFitToCanvas,
        margin: 0.9,
        userScale: baseScale * scale,
      })

        // Convert paths to stitches based on type
        for (const path of placedPaths) {
          if (stitchType === 'running') {
            // Running stitch: interpolate points based on stitch length
            // Scale is already applied in placedPaths.
            this.addRunningStitchPath(path, stitchLength, 1.0)
          }
          // TODO: Add other stitch types (satin, fill) later
        }

        // Once stitches exist, hide the vector overlay so we don't show both.
        this.showVectorizedOverlay = false

        console.log('✅ Applied stitches:', this.shepherd.steps.length)
      } finally {
        this._applyingVectorStitches = false
        this._skipNextUndoSnapshot = false
      }
    },

    // NEW: Helper function to add running stitch with proper interpolation
    addRunningStitchPath(path, stitchLength, scale) {
      if (path.length < 2) return

      // Iterate through path segments
      for (let i = 0; i < path.length - 1; i++) {
        const [x1, y1] = path[i]
        const [x2, y2] = path[i + 1]
        
        // Calculate distance between points (in scaled coordinates)
        const dx = (x2 - x1) * scale
        const dy = (y2 - y1) * scale
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // If distance is very small, skip
        if (distance < 0.1) continue
        
        // Calculate how many stitches we need for this segment
        const numStitches = Math.max(1, Math.ceil(distance / stitchLength))
        
        // Interpolate stitches along the segment
        for (let j = 0; j < numStitches; j++) {
          const t1 = j / numStitches
          const t2 = (j + 1) / numStitches
          
          const sx1 = x1 + (x2 - x1) * t1
          const sy1 = y1 + (y2 - y1) * t1
          const sx2 = x1 + (x2 - x1) * t2
          const sy2 = y1 + (y2 - y1) * t2
          
          this.addLine(
            sx1 * scale,
            sy1 * scale,
            sx2 * scale,
            sy2 * scale,
            true
          )
        }
      }
    },

    // Vectorization persistence actions
    setLastVectorization(imageDataUrl, settings) {
      this.lastVectorizedImage = imageDataUrl
      this.lastVectorizeSettings = { ...settings }
      
      // Persist to localStorage
      try {
        localStorage.setItem('lastVectorizedImage', imageDataUrl)
        localStorage.setItem('lastVectorizeSettings', JSON.stringify(settings))
      } catch (e) {
        console.warn('Failed to save vectorization settings:', e)
      }
    },

    loadLastVectorization() {
      try {
        const image = localStorage.getItem('lastVectorizedImage')
        const settings = localStorage.getItem('lastVectorizeSettings')
        
        if (image) this.lastVectorizedImage = image
        if (settings) this.lastVectorizeSettings = JSON.parse(settings)
      } catch (e) {
        console.warn('Failed to load vectorization settings:', e)
      }
    },

    clearLastVectorization() {
      this.lastVectorizedImage = null
      this.lastVectorizeSettings = null

      try {
        localStorage.removeItem('lastVectorizedImage')
        localStorage.removeItem('lastVectorizeSettings')
      } catch (e) {
        console.warn('Failed to clear vectorization settings:', e)
      }
    },
  },
})
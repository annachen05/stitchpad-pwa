// Central paper configuration for the drawing surface.
// We keep coordinates in CSS pixels and use a fixed 96dpi baseline for cm→px conversion.
// This is for consistent on-screen sizing; physical output mapping is handled elsewhere.

export const PX_PER_CM = 96 / 2.54

// Physical stitchable area (cm). Orientation can be flipped in the UI.
export const BASE_PAPER_CM = Object.freeze({ w: 13, h: 8.6 })

export const PAPER_CM_PORTRAIT = Object.freeze({ w: BASE_PAPER_CM.h, h: BASE_PAPER_CM.w })
export const PAPER_CM_LANDSCAPE = Object.freeze({ w: BASE_PAPER_CM.w, h: BASE_PAPER_CM.h })

// Default drawing surface orientation
export const DEFAULT_PAPER_ORIENTATION = 'portrait'
export const PAPER_CM = DEFAULT_PAPER_ORIENTATION === 'portrait' ? PAPER_CM_PORTRAIT : PAPER_CM_LANDSCAPE

export const PAPER_PX = Object.freeze({
  w: Math.round(PAPER_CM.w * PX_PER_CM),
  h: Math.round(PAPER_CM.h * PX_PER_CM),
})

export const PAPER_PX_PORTRAIT = Object.freeze({
  w: Math.round(PAPER_CM_PORTRAIT.w * PX_PER_CM),
  h: Math.round(PAPER_CM_PORTRAIT.h * PX_PER_CM),
})

export const PAPER_PX_LANDSCAPE = Object.freeze({
  w: Math.round(PAPER_CM_LANDSCAPE.w * PX_PER_CM),
  h: Math.round(PAPER_CM_LANDSCAPE.h * PX_PER_CM),
})

// Grid spacing in the same coordinate space as stitches
export const GRID_PX = 25

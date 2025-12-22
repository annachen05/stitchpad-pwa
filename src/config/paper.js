// Central paper configuration for the drawing surface.
// We keep coordinates in CSS pixels and use a fixed 96dpi baseline for cm→px conversion.
// This is for consistent on-screen sizing; physical output mapping is handled elsewhere.

export const PX_PER_CM = 96 / 2.54

// Requested drawing surface size: 11 x 17 cm
export const PAPER_CM = Object.freeze({ w: 11, h: 17 })

export const PAPER_PX = Object.freeze({
  w: Math.round(PAPER_CM.w * PX_PER_CM),
  h: Math.round(PAPER_CM.h * PX_PER_CM),
})

// Grid spacing in the same coordinate space as stitches
export const GRID_PX = 25

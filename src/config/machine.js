// Create src/config/machine.js
export const MACHINE_BOUNDS_PORTRAIT = Object.freeze({ maxX: 87, maxY: 129 })
export const MACHINE_BOUNDS_LANDSCAPE = Object.freeze({ maxX: 129, maxY: 87 })

export const MACHINE_CONFIG = {
  ...MACHINE_BOUNDS_PORTRAIT,
  defaultScale: 1,
  gridSize: 25,
  maxStitches: 10000,
  supportedFormats: ['dst', 'exp', 'svg', 'gcode'],
  
  // Klipper/Moonraker configuration
  machineHost: 'stitchlab03.local',
  websocketPort: 7125,
  websocketUrl: 'ws://stitchlab03.local:7125/websocket',
  
  // Machine-specific settings
  machineType: 'embroidery',
  homingRequired: true,
  maxFeedRate: 3000, // mm/min
  defaultFeedRate: 1500,
  
  // Safety limits
  emergencyStopEnabled: true,
  boundsChecking: true,
}
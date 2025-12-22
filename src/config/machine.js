// Create src/config/machine.js
export const MACHINE_CONFIG = {
  maxX: 110,
  maxY: 170,
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
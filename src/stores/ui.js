import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    grid: true,
    isJump: false,
    interpolate: false,
    sideToolbarOpen: true,
    isEraser: false,
    eraserSize: 20,
  }),

  actions: {
    toggleGrid() {
      this.grid = !this.grid
    },

    toggleJump() {
      this.isJump = !this.isJump
    },

    toggleInterpolate() {
      this.interpolate = !this.interpolate
    },

    toggleSideToolbar() {
      this.sideToolbarOpen = !this.sideToolbarOpen
    },

    toggleEraser() {
      this.isEraser = !this.isEraser
      if (this.isEraser) {
        this.isJump = false
      }
    },

    setEraserSize(size) {
      this.eraserSize = Math.max(5, Math.min(size, 100))
    },

    // Add keyboard shortcut handler
    handleKeydown(event) {
      if (event.key === 'j' || event.key === 'J') {
        this.toggleJump()
        event.preventDefault()
      }
      if (event.key === 'i' || event.key === 'I') {
        this.toggleInterpolate()
        event.preventDefault()
      }
      if (event.key === 'e' || event.key === 'E') {
        this.toggleEraser()
        event.preventDefault()
      }
    },
  },
})
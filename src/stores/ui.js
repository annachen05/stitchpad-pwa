import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    grid: true,
    isJump: false,
    interpolate: false,
    sideToolbarOpen: true,
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
    },
  },
})
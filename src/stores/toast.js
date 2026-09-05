import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
  state: () => ({
    message: '',
    type: 'info', // 'info', 'success', 'error'
    visible: false,
  }),
  actions: {
    showToast(message, type = 'info', duration = 5000) {
      this.message = message
      this.type = type
      this.visible = true
      setTimeout(() => {
        this.hideToast()
      }, duration)
    },
    showError(message) {
      this.showToast(message, 'error')
    },
    hideToast() {
      this.visible = false
    },
  },
})
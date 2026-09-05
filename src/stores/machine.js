import { defineStore } from 'pinia'
import { klipperService } from '@/services/klipperService.js'
import { useToastStore } from '@/stores/toast.js'

export const useMachineStore = defineStore('machine', {
  state: () => ({
    isConnected: false,
    status: 'disconnected',
    currentPosition: { x: 0, y: 0, z: 0 },
    isHomed: false,
    isMoving: false,
    lastError: null,
    machineInfo: null,
  }),

  getters: {
    canSendCommands: (state) => state.isConnected && state.isHomed,
    statusColor: (state) => {
      switch (state.status) {
        case 'connected': return '#4CAF50'
        case 'connecting': return '#FF9800'
        case 'error': return '#f44336'
        default: return '#9E9E9E'
      }
    }
  },

  actions: {
    async connect() {
      try {
        this.status = 'connecting'
        const info = await klipperService.connect()
        this.isConnected = true
        this.status = 'connected'
        this.machineInfo = info
        
        // Get initial status
        await this.updateStatus()
      } catch (error) {
        this.status = 'error'
        this.lastError = error.message
        throw error
      }
    },

    disconnect() {
      klipperService.disconnect()
      this.isConnected = false
      this.status = 'disconnected'
      this.isHomed = false
    },

    async updateStatus() {
      if (!this.isConnected) return
      
      try {
        const status = await klipperService.getPrinterStatus()
        
        if (status.toolhead) {
          this.currentPosition = {
            x: status.toolhead.position[0],
            y: status.toolhead.position[1], 
            z: status.toolhead.position[2]
          }
          this.isHomed = status.toolhead.homed_axes.includes('xyz')
        }
      } catch (error) {
        console.error('Failed to update machine status:', error)
      }
    },

    async homeAll() {
      if (!this.isConnected) {
        throw new Error('Machine not connected')
      }

      try {
        this.isMoving = true
        await klipperService.sendGCode('G28') // Home all axes
        await this.updateStatus()
        useToastStore().showToast('Machine homed successfully', 'success')
      } catch (error) {
        useToastStore().showError(`Homing failed: ${error.message}`)
        throw error
      } finally {
        this.isMoving = false
      }
    },

    async sendDesign(gcode) {
      if (!this.canSendCommands) {
        throw new Error('Machine not ready. Please connect and home first.')
      }

      try {
        this.isMoving = true
        await klipperService.sendGCode(gcode)
      } finally {
        this.isMoving = false
      }
    },

    async emergencyStop() {
      klipperService.emergencyStop()
      this.isMoving = false
    }
  }
})
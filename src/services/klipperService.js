import { MACHINE_CONFIG } from '@/config/machine.js'
import { useToastStore } from '@/stores/toast.js'

class KlipperService {
  constructor() {
    this.socket = null
    this.messageId = 1
    this.callbacks = new Map()
    this.status = 'disconnected'
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.status = 'connecting'
      const toastStore = useToastStore()
      toastStore.showToast('Connecting to machine...', 'info')

      const wsUrl = `ws://${MACHINE_CONFIG.machineHost || 'stitchlab03.local'}/websocket`
      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        this.status = 'connected'
        this.reconnectAttempts = 0
        console.log('WebSocket connection established.')
        toastStore.showToast('Connected to machine!', 'success')
        
        // Send initial handshake
        this.sendMessage('server.info', {}, (result) => {
          console.log('Server info:', result)
          resolve(result)
        })
      }

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        
        if (data.id && this.callbacks.has(data.id)) {
          const callback = this.callbacks.get(data.id)
          callback(data.result, data.error)
          this.callbacks.delete(data.id)
        }
      }

      this.socket.onerror = (error) => {
        this.status = 'error'
        console.error('WebSocket error:', error)
        toastStore.showError('WebSocket connection error.')
        reject(error)
      }

      this.socket.onclose = () => {
        this.status = 'disconnected'
        console.log('WebSocket connection closed.')
        toastStore.showToast('Disconnected from machine.', 'info')
        this.socket = null
        
        // Auto-reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++
            console.log(`Reconnection attempt ${this.reconnectAttempts}`)
            this.connect()
          }, 2000 * this.reconnectAttempts)
        }
      }
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  sendMessage(method, params = {}, callback) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected.')
      useToastStore().showError('Not connected to machine.')
      return false
    }

    const id = this.messageId++
    const message = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: id,
    }

    if (callback) {
      this.callbacks.set(id, callback)
    }

    this.socket.send(JSON.stringify(message))
    return true
  }

  // Send G-code to the machine
  sendGCode(gcode) {
    return new Promise((resolve, reject) => {
      if (!gcode || gcode.trim() === '') {
        reject(new Error('G-code is empty'))
        return
      }

      this.sendMessage('printer.gcode.script', { script: gcode }, (result, error) => {
        const toastStore = useToastStore()
        
        if (error) {
          console.error('G-code execution error:', error)
          toastStore.showError(`Failed to send G-code: ${error.message}`)
          reject(error)
        } else {
          console.log('G-code sent successfully:', result)
          toastStore.showToast('Design sent to machine!', 'success')
          resolve(result)
        }
      })
    })
  }

  // Legacy method name for compatibility with existing code
  printGCode(gcode) {
    return this.sendGCode(gcode)
  }

  // Get printer status
  getPrinterStatus() {
    return new Promise((resolve, reject) => {
      this.sendMessage('printer.objects.query', {
        objects: {
          'print_stats': null,
          'toolhead': null,
          'extruder': null
        }
      }, (result, error) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  // Emergency stop
  emergencyStop() {
    this.sendMessage('printer.emergency_stop', {}, (result, error) => {
      const toastStore = useToastStore()
      if (error) {
        toastStore.showError('Emergency stop failed!')
      } else {
        toastStore.showToast('Emergency stop executed!', 'info')
      }
    })
  }
}

export const klipperService = new KlipperService()
<template>
  <div class="machine-control">
    <div class="machine-status">
      <div class="status-indicator" :style="{ backgroundColor: machineStore.statusColor }"></div>
      <span class="status-text">{{ machineStore.status.toUpperCase() }}</span>
    </div>

    <div class="machine-actions">
      <button 
        v-if="!machineStore.isConnected" 
        @click="connect" 
        :disabled="connecting"
        class="btn btn-primary"
      >
        {{ connecting ? 'Connecting...' : 'Connect Machine' }}
      </button>

      <template v-else>
        <button @click="disconnect" class="btn btn-secondary">
          Disconnect
        </button>
        
        <button 
          v-if="!machineStore.isHomed" 
          @click="homeAll" 
          :disabled="machineStore.isMoving"
          class="btn btn-primary"
        >
          {{ machineStore.isMoving ? 'Homing...' : 'Home Machine' }}
        </button>

        <button 
          @click="sendCurrentDesign" 
          :disabled="!canSendDesign"
          class="btn btn-success"
        >
          {{ machineStore.isMoving ? 'Sending...' : 'Send to Machine' }}
        </button>

        <button 
          @click="emergencyStop" 
          class="btn btn-danger"
        >
          Emergency Stop
        </button>
      </template>
    </div>

    <div v-if="machineStore.isConnected" class="machine-position">
      <h4>Current Position</h4>
      <div class="position-display">
        <span>X: {{ machineStore.currentPosition.x.toFixed(2) }}mm</span>
        <span>Y: {{ machineStore.currentPosition.y.toFixed(2) }}mm</span>
        <span>Z: {{ machineStore.currentPosition.z.toFixed(2) }}mm</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMachineStore } from '@/stores/machine.js'
import { useDrawingStore } from '@/stores/drawing.js'
import { useToastStore } from '@/stores/toast.js'
import { generateGCode } from '@/utils/exportUtils.js'

const machineStore = useMachineStore()
const drawingStore = useDrawingStore()
const toastStore = useToastStore()

const connecting = ref(false)

const canSendDesign = computed(() => 
  machineStore.canSendCommands && 
  !machineStore.isMoving && 
  drawingStore.shepherd.steps.length > 0
)

async function connect() {
  try {
    connecting.value = true
    await machineStore.connect()
  } catch (error) {
    toastStore.showError(`Connection failed: ${error.message}`)
  } finally {
    connecting.value = false
  }
}

function disconnect() {
  machineStore.disconnect()
}

async function homeAll() {
  try {
    await machineStore.homeAll()
  } catch (error) {
    console.error('Homing failed:', error)
  }
}

async function sendCurrentDesign() {
  if (drawingStore.shepherd.steps.length === 0) {
    toastStore.showError('No design to send. Please create a design first.')
    return
  }

  try {
    const gcode = generateGCode(drawingStore.shepherd.steps, 'stitchpad-design')
    await machineStore.sendDesign(gcode)
  } catch (error) {
    toastStore.showError(`Failed to send design: ${error.message}`)
  }
}

function emergencyStop() {
  machineStore.emergencyStop()
}
</script>

<style scoped>
.machine-control {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
  min-width: 280px;
}

.machine-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.machine-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.machine-actions button {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.machine-position {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.machine-position h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.position-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
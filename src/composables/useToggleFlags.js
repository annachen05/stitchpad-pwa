// src/composables/useToggleFlags.js
import { reactive, computed, onMounted, onUnmounted } from 'vue'

// Ein einziger, geteilter Zustand
const state = reactive({
  jump: false,
  interpolate: false,
})

export function useToggleFlags() {
  // Umschalter für Toolbar-Buttons
  function toggleJump(evt) {
    state.jump = !state.jump
    evt?.preventDefault()
  }
  function toggleInterpolate(evt) {
    state.interpolate = !state.interpolate
    evt?.preventDefault()
  }

  // Globales Key-Binding
  function onKeyDown(evt) {
    if (evt.key === 'j' || evt.key === 'J') {
      toggleJump(evt)
    }
    if (evt.key === 'i' || evt.key === 'I') {
      toggleInterpolate(evt)
    }
  }
  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })

  return {
    // reactive Flags für die Komponenten
    jump: computed(() => state.jump),
    interpolate: computed(() => state.interpolate),
    // direkte Methoden für Toolbar
    toggleJump,
    toggleInterpolate,
  }
}

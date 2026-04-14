<template>
  <div
    ref="toolbarBottomRef"
    class="toolbar toolbar-bottom"
    :class="{ 'is-overflowing': isBottomToolbarOverflowing }"
  >
    <button class="btn btn-toolbar btn-toolbar-icon" @click="drawingStore.undo" title="Undo" aria-label="Undo">
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12.5 7c-2.34 0-4.47 1.07-5.9 2.7L4 7v6h6l-2.35-2.35C8.85 9.06 10.57 8 12.5 8 15 8 17 10 17 12.5S15 17 12.5 17H6v2h6.5C16.09 19 19 16.09 19 12.5S16.09 7 12.5 7z"
          fill="currentColor"
        />
      </svg>
      <span class="sr-only">Undo</span>
    </button>

    <button class="btn btn-toolbar btn-toolbar-icon" @click="drawingStore.redo" title="Redo" aria-label="Redo">
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M11.5 7c2.34 0 4.47 1.07 5.9 2.7L20 7v6h-6l2.35-2.35C15.15 9.06 13.43 8 11.5 8 9 8 7 10 7 12.5S9 17 11.5 17H18v2h-6.5C7.91 19 5 16.09 5 12.5S7.91 7 11.5 7z"
          fill="currentColor"
        />
      </svg>
      <span class="sr-only">Redo</span>
    </button>

    <button
      class="btn btn-toolbar btn-toolbar-icon"
      :class="{ active: uiStore.grid }"
      @click="uiStore.toggleGrid"
      title="Toggle Grid"
      aria-label="Toggle Grid"
    >
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 4h16v16H4V4zm6 2H6v4h4V6zm2 0v4h4V6h-4zm6 0h-4v4h4V6zM6 12v4h4v-4H6zm6 0v4h4v-4h-4zm6 0h-4v4h4v-4z"
          fill="currentColor"
        />
      </svg>
      <span class="sr-only">Grid</span>
    </button>

    <button
      class="btn btn-toolbar btn-toolbar-icon"
      @click="drawingStore.togglePaperOrientation"
      :title="`Flip paper orientation (currently ${drawingStore.paperOrientation})`"
      aria-label="Flip paper orientation"
    >
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <!-- paper -->
        <path d="M8 6h8v10H8V6z" fill="currentColor" opacity="0.95" />
        <!-- clockwise arrow -->
        <path
          d="M16.8 5.6A7.5 7.5 0 0 1 20 12h-2a5.5 5.5 0 0 0-2.3-4.5l-1.2 1.2V5h3.3z"
          fill="currentColor"
        />
        <!-- counter-clockwise arrow -->
        <path
          d="M7.2 18.4A7.5 7.5 0 0 1 4 12h2a5.5 5.5 0 0 0 2.3 4.5l1.2-1.2V19H6.2z"
          fill="currentColor"
        />
      </svg>
      <span class="sr-only">Flip</span>
    </button>

    <button class="btn btn-toolbar btn-toolbar-icon" @click="zoomIn" title="Zoom In" aria-label="Zoom In">
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M14.5 14.5 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M10 8v4M8 10h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="sr-only">Zoom In</span>
    </button>

    <button class="btn btn-toolbar btn-toolbar-icon" @click="zoomOut" title="Zoom Out" aria-label="Zoom Out">
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M14.5 14.5 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M8 10h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="sr-only">Zoom Out</span>
    </button>

    <button class="btn btn-toolbar btn-toolbar-icon" @click="resetZoom" title="Reset Zoom (Default)" aria-label="Reset Zoom">
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm-1 6h2v3h3v2h-3v3h-2v-3H8v-2h3V9z" fill="currentColor" />
      </svg>
      <span class="sr-only">Reset Zoom</span>
    </button>

    <button
      id="jump-icon"
      class="btn btn-toolbar btn-toolbar-icon"
      :class="{ active: uiStore.isJump }"
      @click="uiStore.toggleJump"
      title="Toggle Jump (Shortcut: J)"
      aria-label="Toggle Jump"
    >
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <!-- dashed travel line with arrow head -->
        <path d="M4 12h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="2.5 2.5" />
        <path d="M15 9l4 3-4 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <!-- small lift indicator -->
        <path d="M6 8c1.5-1 3-1 4.5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9" />
      </svg>
      <span class="sr-only">Jump</span>
    </button>

    <button
      id="interp-icon"
      class="btn btn-toolbar btn-toolbar-icon"
      :class="{ active: uiStore.interpolate }"
      @click="uiStore.toggleInterpolate"
      title="Toggle Interpolate (Shortcut: I)"
      aria-label="Toggle Interpolate"
    >
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <!-- points -->
        <circle cx="6" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="8" r="2" fill="currentColor" />
        <circle cx="18" cy="12" r="2" fill="currentColor" />
        <!-- interpolated path -->
        <path d="M6 12C8 9 10 8 12 8s4 1 6 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="sr-only">Interpolate</span>
    </button>

    <button
      id="eraser-icon"
      class="btn btn-toolbar btn-toolbar-icon"
      :class="{ active: uiStore.isEraser }"
      @click="uiStore.toggleEraser"
      title="Toggle Eraser (Shortcut: E)"
      aria-label="Toggle Eraser"
    >
      <svg class="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <!-- Erasing action: eraser rubbing out a dotted line -->

        <!-- dotted line being erased -->
        <path
          d="M5 18h14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="1.2 3"
          opacity="0.95"
        />

        <!-- eraser body (tilted) -->
        <g transform="rotate(-28 12 12)">
          <path d="M8 7h10a1.6 1.6 0 0 1 1.6 1.6V13a1.6 1.6 0 0 1-1.6 1.6H8A1.6 1.6 0 0 1 6.4 13V8.6A1.6 1.6 0 0 1 8 7z" fill="currentColor" />
          <path d="M7.4 12.7h11.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.28" />
        </g>

        <!-- (no debris/sparkles) -->
      </svg>
      <span class="sr-only">Eraser</span>
    </button>

    <button
      class="btn btn-toolbar btn-toolbar-text"
      @click="showStitchSettings"
      :disabled="!drawingStore.vectorizedPaths || drawingStore.vectorizedPaths.length === 0"
      title="Open stitch settings for vectorized paths"
    >
      Stitch Settings
    </button>

    <button class="btn btn-toolbar btn-toolbar-text" @click="showImportDialog">Import</button>
  </div>
</template>

<script setup>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\components\Toolbar.vue
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { useUIStore } from '@/stores/ui.js'

const drawingStore = useDrawingStore()
const uiStore = useUIStore()
const toolbarBottomRef = ref(null)
const isBottomToolbarOverflowing = ref(false)

let toolbarResizeObserver = null

function updateBottomToolbarOverflow() {
  const el = toolbarBottomRef.value
  if (!el) return
  isBottomToolbarOverflowing.value = el.scrollWidth > el.clientWidth + 1
}

const emit = defineEmits(['show-import-dialog', 'show-stitch-settings'])

// Updated zoom functions
function zoomIn() {
  drawingStore.zoomIn(1.1)
}

function zoomOut() {
  drawingStore.zoomOut(0.9)
}

function resetZoom() {
  drawingStore.resetZoom()
}

// Fix: Emit the event
function showImportDialog() {
  emit('show-import-dialog')
}

function showStitchSettings() {
  emit('show-stitch-settings')
}

onMounted(() => {
  nextTick(updateBottomToolbarOverflow)
  window.addEventListener('resize', updateBottomToolbarOverflow)

  if (typeof ResizeObserver !== 'undefined') {
    toolbarResizeObserver = new ResizeObserver(updateBottomToolbarOverflow)
    if (toolbarBottomRef.value) {
      toolbarResizeObserver.observe(toolbarBottomRef.value)
      for (const child of toolbarBottomRef.value.children) {
        toolbarResizeObserver.observe(child)
      }
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateBottomToolbarOverflow)
  if (toolbarResizeObserver) {
    toolbarResizeObserver.disconnect()
    toolbarResizeObserver = null
  }
})
</script>

<style scoped>
.toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  background-color: #f8f8f8;
  border-top: none; /* Remove top border */
  padding: 10px;
}

.toolbar-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #222222;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  z-index: 100;
  gap: 1rem;
  border: none;
}

.toolbar-bottom.is-overflowing {
  justify-content: flex-start;
}

.toolbar-bottom > * {
  flex: 0 0 auto;
}

.btn-toolbar-icon {
  width: 56px;
  height: 56px;
  padding: 0;
  border-radius: 999px;
  background: #333;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  border: 0;
}

.btn-toolbar-icon:hover {
  background: #7b008161;
}

.btn-toolbar-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-toolbar-text {
  width: auto;
  min-width: 120px;
  height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  background: #333;
  color: #fffffffd;
  font-size: 1rem;
}

.btn-toolbar-text:hover {
  background: #7b008161;
}

.toolbar-icon {
  width: 28px;
  height: 28px;
  display: block;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

button.active {
  background-color: #7a0081;
}

#eraser-icon.active {
  background: #ff4444;
  color: white;
}

#eraser-icon.active:hover {
  background: #ff6666;
}
</style>

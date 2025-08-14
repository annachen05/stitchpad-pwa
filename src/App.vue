<template>
  <div id="app">
    <!-- Use uiStore for sideToolbarOpen instead of local data -->
    <button class="toolbar-toggle" @click="uiStore.toggleSideToolbar()">
      {{ uiStore.sideToolbarOpen ? '⮜' : '⮞' }}
    </button>
    <div class="side-toolbar" :class="{ closed: !uiStore.sideToolbarOpen }">
      <button class="btn btn-toolbar" @click="showSaveDialog = true">Speichern</button>
      <button class="btn btn-toolbar" @click="drawingStore.clear">Neu</button>
      <button class="btn btn-toolbar" @click="exportGCode" :disabled="isExportingGCode" title="Export G-code">
        {{ isExportingGCode ? '⏳' : 'Export G-code' }}
      </button>
      <ExportButtons />
    </div>

    <router-view />

    <Toolbar @show-import-dialog="showImportDialog = true" />
    <ImportDialog :show="showImportDialog" @close="showImportDialog = false" />
    <SaveDialog v-if="showSaveDialog" @close="showSaveDialog = false" />
    <AboutDialog v-if="showAboutDialog" @close="showAboutDialog = false" />
    <button class="btn btn-primary" @click="showAboutDialog = true">Über</button>

    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null">×</button>
    </div>
  </div>
</template>

<script>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\App.vue
import Toolbar from './components/Toolbar.vue'
import ExportButtons from './components/ExportButtons.vue'
import SaveDialog from './components/SaveDialog.vue'
import AboutDialog from './components/AboutDialog.vue'
import ImportDialog from './components/ImportDialog.vue'
import { useDrawingStore } from '@/stores/drawing.js'
import { useUIStore } from '@/stores/ui.js'
import { ref } from 'vue'

export default {
  components: {
    Toolbar,
    ExportButtons,
    SaveDialog,
    AboutDialog,
    ImportDialog,
  },
  data() {
    return {
      showSaveDialog: false,
      showAboutDialog: false,
      showImportDialog: false,
      error: null,
    }
  },
  setup() {
    const drawingStore = useDrawingStore()
    const uiStore = useUIStore()
    const error = ref(null)
    const isExportingGCode = ref(false)

    async function exportGCode() {
      if (isExportingGCode.value) return

      try {
        isExportingGCode.value = true
        await drawingStore.exportGCode('my-design')
      } catch (error) {
        console.error('G-code export failed:', error)

        alert('Failed to export G-code: ' + error.message)
      } finally {
        isExportingGCode.value = false
      }
    }

    function showError(message) {
      error.value = message
      setTimeout(() => (error.value = null), 5000)
    }

    return {
      drawingStore,
      uiStore,
      error,
      isExportingGCode,
      showError,
      exportGCode,
    }
  },
}
</script>

<style>
.side-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 150px;
  background: #222;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2rem;
  z-index: 10;
  transition:
    transform 0.3s cubic-bezier(0.4, 2, 0.6, 1),
    opacity 0.3s;
}
.side-toolbar.closed {
  transform: translateX(-100%);
  opacity: 0.2;
  pointer-events: none;
}
.toolbar-toggle {
  position: fixed;
  top: 1rem;
  left: 150px;
  z-index: 20;
  background: #7a0081;
  color: #fff;
  border: none;
  border-radius: 0 6px 6px 0;
  font-size: 1.5rem;
  padding: 0.2em 0.5em;
  cursor: pointer;
  transition: background 0.2s;
}
.toolbar-toggle:hover {
  background: #b62b8c;
}
.side-toolbar button {
  margin: 1rem 0;
  width: 90px;
  color: #fff;
  background: #333;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  padding: 0.7em 0.5em;
  cursor: pointer;
  transition: background 0.2s;
}
.side-toolbar button:hover {
  background: #7b008161;
}
.side-toolbar .export-bar {
  margin-top: 2rem;
}
.error-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: #f44336;
  color: white;
  padding: 1rem;
  border-radius: 5px;
  z-index: 100;
  display: flex;
  align-items: center;
}
.error-toast button {
  margin-left: 1rem;
  background: none;
  border: none;
  color: white;
  font-weight: bold;
  cursor: pointer;
}
</style>

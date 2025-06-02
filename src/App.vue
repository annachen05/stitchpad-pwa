<template>
  <div id="app">
    <button class="toolbar-toggle" @click="sideToolbarOpen = !sideToolbarOpen">
      {{ sideToolbarOpen ? '⮜' : '⮞' }}
    </button>
    <div class="side-toolbar" :class="{ closed: !sideToolbarOpen }">
      <button @click="showSaveDialog = true">Speichern</button>
      <button @click="store.clear">Neu</button>
      <ExportButtons />
    </div>
    <router-view />
    <Toolbar />
    <DrawingCanvas />
    <SaveDialog v-if="showSaveDialog" @close="showSaveDialog = false" />
    <AboutDialogue v-if="showAboutDialog" @close="showAboutDialog = false" />
    <button @click="showAboutDialog = true">Über</button>
  </div>
</template>

<script>
import Toolbar from './components/Toolbar.vue'
import DrawingCanvas from './components/DrawingCanvas.vue'
import ExportButtons from './components/ExportButtons.vue'
import SaveDialog from './components/SaveDialog.vue'
import AboutDialogue from './components/AboutDialogue.vue'
import { useStitchStore } from '@/store/stitch'

export default {
  components: { Toolbar, DrawingCanvas, ExportButtons, SaveDialog, AboutDialogue },
  data() {
    return {
      showSaveDialog: false,
      showAboutDialog: false,
      sideToolbarOpen: true,
    }
  },
  setup() {
    const store = useStitchStore()
    return { store }
  },
}
</script>

<style>
.side-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 120px;
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
  left: 120px;
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
  background: #8c2e70;
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
</style>

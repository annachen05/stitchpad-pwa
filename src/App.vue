git status<template>
  <div id="app">
    <!-- … andere Komponenten wie Toolbar & Canvas … -->
    <SaveDialog v-if="showSaveDialog" @close="showSaveDialog = false" />
    <AboutDialogue v-if="showAboutDialog" @close="showAboutDialog = false" />
    <button @click="showAboutDialog = true">Über</button>
  </div>
</template>

<script>
import SaveDialog from './components/SaveDialog.vue'
import AboutDialogue from './components/AboutDialogue.vue'

export default {
  components: { SaveDialog, AboutDialogue },
  data() {
    return {
      showSaveDialog: false,
      showAboutDialog: false
    }
  }
}
</script>

<style>
/* Leere Styles – wir stylen später */
</style>

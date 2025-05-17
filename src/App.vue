git status<template>
  <div id="app">
    <!-- … andere Komponenten wie Toolbar & Canvas … -->
    <SaveDialog />
  </div>
</template>

<script>
import SaveDialog from './components/SaveDialog.vue'
export default { components: { SaveDialog }}
</script>

<style>
/* Leere Styles – wir stylen später */
</style>

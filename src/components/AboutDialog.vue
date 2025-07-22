<template>
  <!-- Dialog mit eindeutiger Klasse -->
  <div class="about-dialog" data-test="about-dialog">
    <h2>Über Stitchpad</h2>
    <p>Version: 1.0.0
      Stitchpad PWA<br />
      © 2025 Anna und TechSisTask<br />
      Dieses Projekt steht unter der MIT-Lizenz.<br />
      Siehe LICENSE-Datei für Details.
    </p>
    <button @click="$emit('close')">Schließen</button>
  </div>
</template>

<script>
export default {
  methods: {
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.about-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000; /* Wichtig: Höherer z-index als andere Elemente */
}
</style>

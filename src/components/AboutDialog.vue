<template>
  <div class="dialog-overlay" @click="$emit('close')">
    <div class="dialog about-dialog" data-test="about-dialog" @click.stop>
      <h2>Über Stitchpad</h2>
      <p>
        Version: 1.0.0<br />
        Stitchpad PWA<br />
        © 2025 Anna und TechSisTask<br />
        Dieses Projekt steht unter der MIT-Lizenz.<br />
        Siehe LICENSE-Datei für Details.
      </p>
      <button class="btn btn-secondary" @click="$emit('close')">Schließen</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close'])
</script>

<style scoped>
/* No additional styles needed - using design system */
</style>

<template>
  <div class="about-dialogue">
    <p>
      Stitchpad PWA<br />
      © 2025 Anna und TechSisTask<br />
      Dieses Projekt steht unter der MIT-Lizenz.<br />
      Siehe LICENSE-Datei für Details.
    </p>
    <button @click="close">Schließen</button>
  </div>
</template>

<script setup>
const emit = defineEmits(['close'])
function close() {
  emit('close')
}
</script>

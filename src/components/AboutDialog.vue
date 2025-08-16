<template>
  <div class="dialog-overlay" @click="$emit('close')">
    <div class="dialog about-dialog" data-test="about-dialog" @click.stop>
      <h2>About Stitchpad</h2>
      <p>
        Version: 1.0.0<br />
        Stitchpad PWA<br />
        © 2025 Anna and TechSisTask<br />
        This project is licensed under the MIT License.<br />
        See the LICENSE file for details.
      </p>
      <button class="btn btn-secondary" @click="$emit('close')">Close</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close'])
</script>

<style scoped>
/* No additional styles needed - using design system */
</style>

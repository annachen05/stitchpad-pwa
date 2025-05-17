<script setup>
import { useStitchStore } from '@/store/stitch'
const stitchStore = useStitchStore()

function exportSVG() {
  stitchStore.export('svg', 'meinDesign')
}
function exportDST() {
  stitchStore.export('dst', 'meinDesign')
}
function exportEXP() {
  stitchStore.export('exp', 'meinDesign')
}
</script>

<template>
  <button @click="exportSVG">SVG exportieren</button>
  <button @click="exportDST">DST exportieren</button>
  <button @click="exportEXP">EXP exportieren</button>
</template>
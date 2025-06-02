<script setup>
import { useStitchStore } from '@/store/stitch'
import { saveAs } from 'file-saver'
const store = useStitchStore()

function saveDST() {
  const blob = new Blob([store.exportDST('design')], { type: 'application/octet-stream' })
  saveAs(blob, 'design.dst')
}
function saveEXP() {
  const blob = new Blob([store.exportEXP()], { type: 'application/octet-stream' })
  saveAs(blob, 'design.exp')
}
function saveSVG() {
  const blob = new Blob([store.exportSVG()], { type: 'image/svg+xml' })
  saveAs(blob, 'design.svg')
}
</script>

<template>
  <button @click="saveDST">Export DST</button>
  <button @click="saveEXP">Export EXP</button>
  <button @click="saveSVG">Export SVG</button>
</template>

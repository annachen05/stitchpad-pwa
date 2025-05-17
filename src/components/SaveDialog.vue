<template>
  <div class="save-dialog">
    <input v-model="fileName" placeholder="Dateiname" />
    <select v-model="format">
      <option value="dst">DST</option>
      <option value="exp">EXP</option>
      <option value="svg">SVG</option>
    </select>
    <button @click="onOk">OK</button>
    <button @click="onCancel">Abbrechen</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStitchStore } from '@/store/stitch'

const emit = defineEmits(['close'])
const store = useStitchStore()
const fileName = ref('mein-design')
const format = ref('dst')

function onOk() {
  store.export(format.value, fileName.value)
  emit('close')
}
function onCancel() {
  emit('close')
}
</script>

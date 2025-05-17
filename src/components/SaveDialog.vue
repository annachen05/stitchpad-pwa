<template>
  <div class="save-dialog">
    <input v-model="fileName" placeholder="Dateiname" />
    <select v-model="format">
      <option value="dst">DST</option>
      <option value="exp">EXP</option>
      <option value="svg">SVG</option>
    </select>
    <button @click="onSave">Speichern</button>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useStitchStore } from '@/stores/stitch'

export default {
  setup() {
    const store     = useStitchStore()
    const fileName  = ref('mein-design')
    const format    = ref('dst')

    function onSave() {
      store.exportDesign(format.value, fileName.value)
    }

    return { fileName, format, onSave }
  }
}
</script>

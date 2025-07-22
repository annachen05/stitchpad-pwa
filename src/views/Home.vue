<template>
  <div class="home">
    <DrawingCanvas />
  </div>
</template>

<script>
import DrawingCanvas from '@/components/DrawingCanvas.vue'

export default {
  name: 'Home',
  components: {
    DrawingCanvas
  }
}
</script>
// filepath: c:\Users\annam\Desktop\stitchpad-pwa\src\stores\design.js
import { defineStore } from 'pinia'
import { useDesignStore } from '@/stores/design'
const designStore = useDesignStore()
// Zugriff auf designStore.paths oder designStore.setPaths(...)

import { exportDST, exportEXP, exportSVG, importDST } from '@/utils/embroidery'

export const useDesignStore = defineStore('design', {
  state: () => ({
    paths: []
  }),
  actions: {
    setPaths(newPaths) {
      this.paths = newPaths
    }
  }
})

import { saveDesign } from '@/utils/embroidery'

actions: {
  export(format, name) {
    saveDesign(format, name, this.paths)
  }
}

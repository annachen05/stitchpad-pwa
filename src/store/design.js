import { defineStore } from 'pinia'
import { useDesignStore } from '@/store/design'
const designStore = useDesignStore()

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
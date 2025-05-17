import { defineStore } from 'pinia'

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
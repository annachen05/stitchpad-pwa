import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/components/DrawingCanvas.vue') // Main drawing component
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
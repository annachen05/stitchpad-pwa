import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/components/HelloWorld.vue') // Example route
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
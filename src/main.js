// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router' // Updated import

const app = createApp(App)
app.use(createPinia())
app.use(router) // Use the router
app.mount('#app')

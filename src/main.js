import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Register Service Worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('PWA update available')
    // Optional: Show update notification to user
    if (confirm('App update available. Reload to apply?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('PWA ready to work offline')
  },
  onRegisterError(error) {
    console.error('SW registration error:', error)
  },
})

app.mount('#app')

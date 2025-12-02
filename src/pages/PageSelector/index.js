import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router/index'

// 如果使用了 Vant 组件，确保引入样式
import 'vant/lib/index.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
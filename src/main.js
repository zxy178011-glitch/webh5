// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VConsole from 'vconsole'
import '../public/js/common'
import { setToastDefaultOptions } from 'vant';
import SuccessPopup from './components/Popup/SuccessPopup.vue'

// 全局设置所有 toast 的默认时长为 2500ms
setToastDefaultOptions({ duration: 3500 });


// VConsole 调试
  // const vConsole = new VConsole()

const app = createApp(App)
app.use(router)

// //  全局注册组件
app.component('SuccessPopup', SuccessPopup)

app.mount('#app')

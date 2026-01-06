import SuccessPopup from '@/components/Popup/SuccessPopup.vue'
import TopNotification from '@/components/Popup/TopNotification.vue'
import BindingPopup from '@/components/Popup/BindingPopup.vue'
const components = {
    SuccessPopup,
    TopNotification,
    BindingPopup
}

export default {
    install(app) {
        Object.entries(components).forEach(([name, component]) => {
            app.component(name, component)
        })
    }
}

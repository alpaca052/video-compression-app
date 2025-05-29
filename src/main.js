// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

// Vuetify用インポート
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    }
})

// i18n用インポート
import i18n from './i18n'

createApp(App).use(vuetify).use(i18n).mount('#app')
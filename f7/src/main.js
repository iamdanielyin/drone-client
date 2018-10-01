import Vue from 'vue'
import App from './App.vue'
import store from './store'
// import router from './router'
import 'framework7/css/framework7.min.css'

// Import F7 Bundle
import Framework7 from 'framework7/framework7.esm.bundle'
// Import F7-Vue Plugin Bundle (with all F7 components registered)
import Framework7Vue from 'framework7-vue/framework7-vue.esm.bundle'

Framework7.use(Framework7Vue)
Vue.config.productionTip = false

new Vue({
  // router,
  store,
  render: h => h(App)
}).$mount('#app')

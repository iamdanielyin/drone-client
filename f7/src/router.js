import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      name: 'home',
      path: '/',
      component: Home
    },
    {
      name: 'about',
      path: '/about',
      component: () => import('./views/About.vue')
    },
    {
      name: 'login',
      path: '/login',
      component: () => import('./views/Login.vue')
    }
  ]
})

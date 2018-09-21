import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'

Vue.use(Router)

export default new Router({
  // mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/bind',
      name: 'bind',
      component: () => import('./views/Bind.vue')
    },
    {
      path: '/build',
      name: 'build',
      component: () => import('./views/Build.vue')
    },
    {
      path: '/log',
      name: 'log',
      component: () => import('./views/Log.vue')
    }
  ]
})

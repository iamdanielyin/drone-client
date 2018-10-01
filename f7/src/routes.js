/**
 * Async Lazy Components
 * @param {Array} routes app routes
 */
function asyncLazy (routes) {
  return routes.map(item => {
    const vueComponent = item.component
    item.async = (routeTo, routeFrom, resolve, reject) => {
      vueComponent().then((vc) => {
        resolve({ component: vc.default })
      })
    }
    delete item.component
    return item
  })
}

const routes = asyncLazy([
  {
    name: 'home',
    path: '/',
    component: () => import('./views/Home.vue')
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
])

export default routes

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
    path: '/',
    component: () => import('./views/Home.vue')
  },
  {
    path: '/home',
    component: () => import('./views/Home.vue')
  },
  {
    path: '/build',
    component: () => import('./views/Build.vue')
  }
])

export default routes

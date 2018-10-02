import axios from 'axios'
import { app } from '@/utils/utility'

/**
 * token拦截器
 * @param config
 * @returns {*}
 */
function tokenInterceptor (config) {
  config.headers['cache-control'] = 'no-cache'
  return config
}

/**
 * 请求发起时的错误处理
 * @param error
 */
function networkInterceptor (error) {
  console.error(`Before request: ${error}`)
  Promise.reject(error)
}

/**
 * 响应拦截
 * @param error
 * @returns {Promise<never>}
 */
function responseInterceptor (error) {
  console.error(`Network error: ${error}`)
  app().$f7.dialog.alert(error.message)
  return Promise.reject(error)
}

const instance = axios.create({
  baseURL: process.env.BASE_API,
  timeout: 60 * 1000
})

// 请求拦截器
instance.interceptors.request.use(
  tokenInterceptor,
  networkInterceptor
)

// 响应拦截器
instance.interceptors.response.use(
  res => {
    if (res.status >= 200 && res.status < 300) {
      return res.data
    }
    app().$f7.dialog.alert('Network error')
  },
  responseInterceptor
)

export default instance

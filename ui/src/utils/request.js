import axios from 'axios'
import { Toast } from 'vant'
import store from '@/store'
import _ from 'lodash'

// 若项目中不包含access_token，忽略即可。
const TOKEN_KEY = 'token'

/**
 * token拦截器
 * @param config
 * @returns {*}
 */
function tokenInterceptor (config) {
  config.headers['cache-control'] = 'no-cache'
  const token = store.getters['user/token']
  if (token) {
    config.headers[TOKEN_KEY] = token
  } else {
    console.warn('No token')
  }
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
  Toast({
    message: error.message,
    type: 'fail',
    duration: 5 * 1000
  })
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
    let data = null
    if (res.status >= 200 && res.status < 300) {
      const json = res.data
      if (json.errcode || json.errmsg) {
        if (json.errstack) {
          console.error(`API error: ${json.errstack}`)
        }
        Toast({
          message: json.errmsg,
          type: 'fail',
          duration: 5 * 1000
        })
      } else {
        data = _.result(json, 'data', json)
      }
    } else {
      Toast({
        message: 'Network error',
        type: 'fail',
        duration: 5 * 1000
      })
    }
    return data
  },
  responseInterceptor
)

export default instance

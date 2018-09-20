import request from '@/utils/request'

/**
 * Repo List
 * Returns repositories which are registered to Drone.
 */
export function getUserRepos () {
  return request({
    url: '/api/drone/user/repos',
    method: 'get'
  })
}

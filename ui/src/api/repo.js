import request from '@/utils/request'
import qs from 'qs'

/**
 * Repo List
 * Returns repositories which are registered to Drone.
 */
export function getUserRepos (query) {
  return request({
    url: `/api/drone/user/repos?${qs.stringify(query)}`,
    method: 'get'
  })
}

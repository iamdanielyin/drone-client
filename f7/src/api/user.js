import request from '@/utils/request'

/**
 * Current User Feed
 * Returns the currently authenticated user’s activity feed.
 */
export function getUserFeed () {
  return request({
    url: `/api/drone/user/feed?latest=true`,
    method: 'get'
  })
}

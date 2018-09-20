import request from '@/utils/request'

/**
 * Build List
 * Returns recent builds for the repository based on name. Please note this api requires read access to the repository.
 * @param owner
 * @param repo
 */
export function getReposBuilds (owner, repo) {
  return request({
    url: `/api/drone/repos/${owner}/${repo}/builds`,
    method: 'get'
  })
}

/**
 * Build Start
 * Restart the specified build. Please note this api requires read and write access to the repository and the request parameter {build} is not the build id but the build number.
 * @param owner
 * @param repo
 * @param build
 */
export function postReposBuilds (owner, repo, build) {
  return request({
    url: `/api/drone/repos/${owner}/${repo}/builds/${build}`,
    method: 'post'
  })
}

/**
 * Build Stop
 * Stop the specified build. Please note this api requires administrative privileges and the request parameter {build} is not the build id but the build number.
 * @param owner
 * @param repo
 * @param build
 */
export function deleteReposBuilds (owner, repo, build) {
  return request({
    url: `/api/drone/repos/${owner}/${repo}/builds/${build}`,
    method: 'delete'
  })
}

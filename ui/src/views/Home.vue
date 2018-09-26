<template>
  <div class='home'>
    <van-nav-bar
      title="Repo List"
      fixed
    >
    </van-nav-bar>
    <van-pull-refresh v-model="isLoading" @refresh="fetchRepos" style="padding-top: 46px;">
      <van-collapse v-model='activeNames'>
        <van-collapse-item v-for="(list, owner) in repos" :name='owner' :key='owner'>
          <div slot="title" style="color: #474D5A; font-size: 16px; font-weight: bold;">
            {{owner}}
            <van-tag plain type="primary">{{list.length}}</van-tag>
          </div>
          <router-link v-for="repo in list" :to="{ name: 'build', query: { owner, repo: repo.name } }" :key='repo.id'>
            <van-cell is-link>
              <div slot="title" style="color: #5E6574; font-size: 16px; display: flex; align-items: flex-start; flex-direction: column; justify-content: center;">
                <div style="display: flex; align-items: center;">
                  <span style="margin-right: 5px;">{{repo.name}}</span>
                  <template>
                    <van-icon name="passed" v-if="repo.latest_status === 'success'" style="color: #4dc89a" />
                    <van-icon name="close" v-else-if="repo.latest_status === 'failure'" style="color: #fc4758" />
                    <van-loading type="spinner" v-else-if="repo.latest_status === 'running'" style="width: 16px; height: 16px;" />
                    <van-icon name="clock" v-else style="color: #fdb835" />
                  </template>
                </div>
                <div>
                  <span style="color: #bdbdbd; font-size: 12px; margin-right: 5px;">{{repo.latest_finished | unixDateTime}}</span>
                  <van-tag plain v-if="repo.latest_started && repo.latest_finished">
                    {{calcTime(repo.latest_started, repo.latest_finished)}}
                  </van-tag>
                </div>
              </div>
            </van-cell>
          </router-link>
        </van-collapse-item>
      </van-collapse>
    </van-pull-refresh>
    <p v-show="noData" class="noData">No data.</p>
  </div>
</template>

<script>
import Vue from 'vue'
import _ from 'lodash'
import moment from 'moment'
import { NavBar, Icon, Collapse, CollapseItem, Cell, Tag, CellGroup, PullRefresh, Loading } from 'vant'
import { getUserRepos } from '@/api/repo'
import { getUserFeed } from '@/api/user'
Vue.use(NavBar).use(Icon).use(Collapse).use(CollapseItem).use(Cell).use(Tag).use(CellGroup).use(PullRefresh).use(Loading)

export default {
  name: 'home',
  data () {
    return {
      isLoading: false,
      activeNames: null,
      repos: {}
    }
  },
  computed: {
    noData: function () {
      return Object.keys(this.repos).length === 0
    }
  },
  methods: {
    calcTime: function (startedAt, finishedAt) {
      const time = moment.unix(finishedAt).diff(moment.unix(startedAt), 's')
      return `${time}s`
    },
    combineFeed (repos, feed) {
      for (const owner in repos) {
        const ownerRepos = repos[owner]
        const ownerFeed = feed.filter(item => item.owner === owner)
        for (const feed of ownerFeed) {
          for (const repo of ownerRepos) {
            if (repo.name === feed.name) {
              repo.latest_status = feed.status
              repo.latest_finished = feed.finished_at
              repo.latest_started = feed.started_at
              break
            }
          }
        }
        this.repos = _.cloneDeep(repos)
      }
    },
    fetchRepos: async function () {
      this.isLoading = true
      const repos = await getUserRepos()
      this.repos = _.groupBy(repos, 'owner')
      if (!this.activeNames) {
        this.activeNames = _.take(Object.keys(this.repos), 1)
      }
      this.feed = await this.fetchUserFeed()
      this.combineFeed(this.repos, this.feed)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
      }, 500)()
    },
    fetchUserFeed: async function () {
      const feed = await getUserFeed()
      return feed
    }
  },
  created: function () {
    this.fetchRepos()
  }
}
</script>
<style scoped lang="less">
  :global(.van-pull-refresh__track) {
    min-height: calc(100vh - 46px);
  }
</style>

<template>
  <div class='home'>
    <van-nav-bar
      :title="'Repo List' + ' (' + this.reposTotal + ') '"
      right-text="Sync"
      @click-right="handleSync"
      fixed
    >
    </van-nav-bar>
    <van-pull-refresh v-model="isLoading" @refresh="fetchRepos" style="padding-top: 46px;">
      <van-search placeholder="Search ..." v-model="searchValue" @input="handleSearch" />
      <van-collapse v-model='activeNames'>
        <van-collapse-item name='build-queue'>
          <div slot="title">
            <template>Building Queue</template>
            <van-tag style="margin-left: 5px;">{{runningFeed.length}}</van-tag>
          </div>
          <router-link
            v-for="item in runningFeed"
            :to="{ name: 'log', query: { owner: item.owner, repo: item.name, build: item.number } }"
            :key="item.number"
          >
            <van-cell is-link>
              <div slot="title" style="color: #5E6574; display: flex; align-items: flex-start; flex-direction: column; justify-content: center;">
                <div style="display: flex; align-items: center;">
                  <span style="margin-right: 5px;">{{item.full_name}}</span>
                  <template>
                    <van-icon name="passed" v-if="item.status === 'success'" style="color: #4dc89a" />
                    <van-icon name="close" v-else-if="item.status === 'failure'" style="color: #fc4758" />
                    <van-loading type="spinner" v-else-if="item.status === 'running'" style="width: 16px; height: 16px;" />
                    <van-icon name="clock" v-else style="color: #fdb835" />
                  </template>
                </div>
                <div v-if="item.started_at && item.finished_at">
                  <span style="color: #bdbdbd; font-size: 12px; margin-right: 5px;">{{item.finished_at | unixDateTime}}</span>
                  <van-tag plain>
                    {{calcTime(item.started_at, item.finished_at)}}
                  </van-tag>
                </div>
              </div>
            </van-cell>
          </router-link>
          <p v-show="!runningFeed.length" class="noData">No builds.</p>
        </van-collapse-item>
        <van-collapse-item v-for="(list, owner) in filteredRepos" :name='owner' :key='owner' v-if="list.length" >
          <div slot="title">
            {{owner}}
            <van-tag>{{list.length}}</van-tag>
          </div>
          <router-link v-for="repo in list" :to="{ name: 'build', query: { owner, repo: repo.name } }" :key='repo.id'>
            <van-cell is-link>
              <div slot="title" style="color: #5E6574; display: flex; align-items: flex-start; flex-direction: column; justify-content: center;">
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
    <p v-show="Object.keys(repos).length === 0" class="noData">No data.</p>
    <p class="version">{{version}}</p>
  </div>
</template>

<script>
import Vue from 'vue'
import _ from 'lodash'
import moment from 'moment'
import { NavBar, Icon, Collapse, CollapseItem, Cell, Tag, CellGroup, PullRefresh, Loading, Search } from 'vant'
import { getUserRepos } from '@/api/repo'
import { getUserFeed } from '@/api/user'
Vue.use(NavBar).use(Icon).use(Collapse).use(CollapseItem).use(Cell).use(Tag).use(CellGroup).use(PullRefresh).use(Loading).use(Search)

export default {
  name: 'home',
  data () {
    return {
      searchValue: null,
      feed: [],
      isLoading: false,
      fetchInterval: null,
      activeNames: ['build-queue'],
      rawRepos: [],
      repos: {},
      reposTotal: 0
    }
  },
  computed: {
    runningFeed: function () {
      return _.sortBy(this.feed.filter(item => {
        if (['pending', 'running'].includes(item.status)) {
          if (this.searchValue) {
            return new RegExp(this.searchValue, 'i').test(item.full_name)
          } else {
            return true
          }
        } else {
          return false
        }
      }), 'started_at')
    },
    filteredRepos () {
      return _.mapValues(this.repos, list => {
        if (this.searchValue) {
          return list.filter(item => new RegExp(this.searchValue, 'i').test(item.full_name))
        } else {
          return list
        }
      })
    }
  },
  methods: {
    handleSearch (v) {
      console.log(v)
    },
    autoRefresh (restart = true) {
      if (this.fetchInterval) {
        window.clearInterval(this.fetchInterval)
      }
      if (restart === true) {
        this.fetchInterval = window.setInterval(this.fetchRepos.bind(this, undefined, false), 8 * 1000)
      } else {
        this.fetchInterval = null
      }
    },
    handleSync: function () {
      this.fetchRepos({
        all: true,
        flush: true
      })
    },
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
    fetchRepos: async function (query = { all: true }, needLoading = true) {
      if (needLoading === true) {
        this.isLoading = true
      }
      this.rawRepos = await getUserRepos(query)
      const repos = this.rawRepos.filter(item => item.active === true)
      this.reposTotal = repos.length
      this.repos = _.groupBy(repos, 'owner')
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
    this.version = process.env.VUE_APP_VERSION
  },
  beforeRouteEnter: function (to, from, next) {
    next(vm => {
      vm.autoRefresh()
    })
  },
  beforeRouteLeave: function (to, from, next) {
    this.autoRefresh(false)
    next()
  }
}
</script>
<style scoped lang="less">
  .home {
    :global(.van-pull-refresh__track) {
      min-height: calc(100vh - 46px);
    }
    :global(.van-collapse-item__content) {
      padding: 0 10px;
    }
    .version {
      text-align: center;
      color: #BDC6D2;
      font-size: 14px;
      position: fixed;
      bottom: 0;
      width: 100%;
      z-index: -1;
    }
  }
</style>

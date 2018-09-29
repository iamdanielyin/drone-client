<template>
  <div class="build">
    <van-nav-bar
      :title="this.repo + ' (' + this.filteredBuilds.length + ') '"
      :right-text="filterBranch || 'Branches'"
      fixed
      @click-left="$router.push('/')"
      @click-right="toggleShowBranch"
    >
      <van-icon name="home" slot="left" />
    </van-nav-bar>
    <van-pull-refresh v-model="isLoading" @refresh="fetchBuilds" style="padding-top: 46px;">
      <van-list>
        <router-link v-for="build in filteredBuilds" :to="{ name: 'log', query: { owner, repo, build: build.number } }" :key="build.id">
          <van-card currency="">
            <template slot="thumb">
              <img :src="build.author_avatar" class="van-card__img" style="box-shadow: 0px 0px 4px 0px rgba(0,0,0,0.1); border-radius: 4px;">
            </template>
            <div slot="title" class="van-card__title" style="display: flex; align-items: center;">
              <span style="margin-right: 8px; display: flex; align-items: center;">
                <span style="margin-right: 5px;">{{build.number}}</span>
                <template>
                  <van-icon name="passed" v-if="build.status === 'success'" style="color: #4dc89a" />
                  <van-icon name="close" v-else-if="build.status === 'failure'" style="color: #fc4758" />
                  <van-loading type="spinner" v-else-if="build.status === 'running'" style="width: 16px; height: 16px;" />
                  <van-icon name="clock" v-else style="color: #fdb835" />
                </template>
              </span>
              {{build.author}}:{{build.branch}}
            </div>
            <p slot="desc" style="color: #666; font-size: 12px;">
              {{build.message}}
            </p>
            <template slot="footer">
              <van-button
                size="small"
                @click.stop.prevent="handleRetry(build.number)"
                v-if="build.status !== 'running'"
                :loading="build.number === loadingBuildId"
                plain
                style="color: #4A79DC;"
              >
                RETRY
              </van-button>
              <van-button
                type="danger"
                size="small"
                @click.stop.prevent="handleStop(build.number)"
                v-if="build.status === 'running'"
                :loading="build.number === loadingBuildId"
                style="border: 1px solid #F25E56;"
              >
                STOP
              </van-button>
            </template>
            <template slot="tags">
              <span style="color: #bdbdbd; font-size: 12px; margin-right: 5px;">{{build.created_at | unixDateTime}}</span>
              <van-tag plain v-if="build.started_at && build.finished_at">
                {{calcTime(build.started_at, build.finished_at)}}
              </van-tag>
            </template>
          </van-card>
        </router-link>
      </van-list>
    </van-pull-refresh>
    <p v-show="!builds.length" class="noData">No data.</p>
    <van-actionsheet
      v-model="showBranch"
      :actions="branches"
      @select="handleChangeBranch"
    />
    <div class="intelligentFiltered">
      <van-switch v-model="intelligentFiltered" @change="handleIntelligentFilteredChange" />
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import _ from 'lodash'
import { NavBar, List, Panel, Card, Icon, Button, Tag, PullRefresh, Actionsheet, Loading, Switch } from 'vant'
import { getReposBuilds, postReposBuilds, deleteReposBuilds } from '@/api/build'
Vue.use(NavBar).use(List).use(Panel).use(Card).use(Icon).use(Button).use(Tag).use(PullRefresh).use(Actionsheet).use(Loading).use(Switch)

export default {
  name: 'home',
  data () {
    return {
      intelligentFiltered: false,
      showBranch: false,
      filterBranch: null,
      isLoading: false,
      loadingBuildId: null,
      isShow: false,
      rawBuilds: [],
      builds: [],
      fetchInterval: null
    }
  },
  computed: {
    branches: function () {
      const arr = [{ name: 'ALL' }]
      this.builds.map(build => {
        arr.push({ name: build.branch })
      })
      return _.uniqBy(arr, 'name')
    },
    filteredBuilds: function () {
      if (!this.filterBranch) {
        return this.builds
      } else {
        return this.builds.filter(build => build.branch && build.branch === this.filterBranch)
      }
    }
  },
  methods: {
    autoRefresh (restart = true) {
      if (this.fetchInterval) {
        window.clearInterval(this.fetchInterval)
      }
      if (restart === true) {
        this.fetchInterval = window.setInterval(this.fetchBuilds.bind(this, undefined, false), 8 * 1000)
      } else {
        this.fetchInterval = null
      }
    },
    handleIntelligentFilteredChange: function () {
      this.builds = this.intelligentFiltering(this.rawBuilds)
    },
    toggleShowBranch: function () {
      this.showBranch = !this.showBranch
    },
    handleChangeBranch: function (item) {
      this.filterBranch = item.name === 'ALL' ? null : item.name
      this.toggleShowBranch()
    },
    calcTime: function (startedAt, finishedAt) {
      const time = moment.unix(finishedAt).diff(moment.unix(startedAt), 's')
      return `${time}s`
    },
    intelligentFiltering (builds) {
      if (this.intelligentFiltered !== true) {
        return builds
      }
      builds = builds.filter(item => !item.ref || item.event !== 'push' || (item.event === 'push' && item.ref.endsWith('master')))
      return builds
    },
    fetchBuilds: async function (first, needLoading = true) {
      if (needLoading === true) {
        this.isLoading = true
      }
      this.owner = this.$route.query.owner
      this.repo = this.$route.query.repo
      if (!this.owner || !this.repo) {
        return
      }
      this.rawBuilds = await getReposBuilds(this.owner, this.repo)
      this.builds = this.intelligentFiltering(this.rawBuilds)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
        $this.loadingBuildId = null
        // $this.filterBranch = null
      }, 500)()
      if (first === true) {
        this.autoRefresh()
      }
    },
    handleRetry: async function (buildId) {
      this.loadingBuildId = buildId
      await postReposBuilds(this.owner, this.repo, buildId)
      this.loadingBuildId = null
      await _.debounce(this.fetchBuilds, 800)(undefined, false)
    },
    handleStop: async function (buildId) {
      this.loadingBuildId = buildId
      await deleteReposBuilds(this.owner, this.repo, buildId)
      this.loadingBuildId = null
      await _.debounce(this.fetchBuilds, 1000)(undefined, false)
    }
  },
  created: function () {
    this.fetchBuilds(true)
  },
  watch: {
    '$route': 'fetchBuilds'
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
  .build {
    :global(.van-card) {
      height: auto;
      min-height: 100px;
    }
    .intelligentFiltered{
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      bottom: 30px;
      right: 20px;
      font-size: 16px;
    }
  }
</style>

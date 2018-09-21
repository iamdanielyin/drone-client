<template>
  <div class="build">
    <van-nav-bar
      :title="this.repo || 'Build List'"
      :right-text="filterBranch || '分支过滤'"
      left-arrow
      fixed
      @click-left='$router.back()'
      @click-right="toggleShowBranch"
    >
    </van-nav-bar>
    <van-pull-refresh v-model="isLoading" @refresh="fetchBuilds" style="padding-top: 46px;">
      <van-list>
        <router-link v-for="build in filteredBuilds" :to="{ name: 'log', query: { owner, repo, build: build.number } }" :key="build.id">
          <van-card currency="">
            <template slot="thumb">
              <img :src="build.author_avatar" class="van-card__img">
            </template>
            <div slot="title" class="van-card__title" style="display: flex; align-items: center;">
              <span style="margin-right: 8px; display: flex; align-items: center;">
                <span style="margin-right: 5px;">{{build.number}}</span>
                <template>
                  <van-icon name="passed" v-if="build.status === 'success'" style="color: #4dc89a" />
                  <van-icon name="close" v-else-if="build.status === 'failure'" style="color: #fc4758" />
                  <van-icon name="logistics" v-else-if="build.status === 'running'" style="color: #38f" />
                  <van-icon name="clock" v-else style="color: #fdb835" />
                </template>
              </span>
              {{build.author}}: {{build.branch}}
            </div>
            <p slot="desc" style="color: #666; font-size: 12px;">
              {{build.message}}
            </p>
            <template slot="footer">
              <van-button
                type="primary"
                size="small"
                @click="handleRetry(build.number)"
                v-if="build.status !== 'running'"
                :loading="build.number === loadingBuildId"
                plain
                style="border: 1px solid #4A79DC; color: #4A79DC;"
              >
                重试
              </van-button>
              <van-button
                type="danger"
                size="small"
                @click="handleStop(build.number)"
                v-if="build.status === 'running'"
                :loading="build.number === loadingBuildId"
                plain
                style="border: 1px solid #F25E56; color: #F25E56;"
              >
                停止
              </van-button>
            </template>
            <template slot="tags">
              <span style="color: #bdbdbd; font-size: 12px; margin-right: 5px;">{{build.created_at | unixDateTime}}</span>
              <van-tag plain type="primary" v-if="build.started_at && build.finished_at">
                {{calcTime(build.started_at, build.finished_at)}}
              </van-tag>
            </template>
          </van-card>
        </router-link>
      </van-list>
    </van-pull-refresh>
    <p v-show="noData" class="noData">No data.</p>
    <van-actionsheet
      v-model="showBranch"
      :actions="branches"
      @select="handleChangeBranch"
    />
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import _ from 'lodash'
import { NavBar, List, Panel, Card, Icon, Button, Tag, PullRefresh, Actionsheet } from 'vant'
import { getReposBuilds, postReposBuilds, deleteReposBuilds, getReposBuildInfo, getReposBuildInfoLogs } from '@/api/build'
Vue.use(NavBar).use(List).use(Panel).use(Card).use(Icon).use(Button).use(Tag).use(PullRefresh).use(Actionsheet)

export default {
  name: 'home',
  data () {
    return {
      showBranch: false,
      filterBranch: null,
      branches: [
        {
          name: '所有分支'
        },
        {
          name: 'master',
          subname: '开发主分支'
        },
        {
          name: 'test',
          subname: '测试主分支'
        },
        {
          name: 'release',
          subname: '生产主分支'
        }
      ],
      isLoading: false,
      loadingBuildId: null,
      isShow: false,
      activeNames: ['1'],
      builds: []
    }
  },
  computed: {
    noData: function () {
      return this.builds.length === 0
    },
    filteredBuilds: function () {
      if (!this.filterBranch) {
        return this.builds
      } else {
        return this.builds.filter(build => build.branch && build.branch.toLowerCase() === this.filterBranch.toLowerCase())
      }
    }
  },
  methods: {
    toggleShowBranch: function () {
      this.showBranch = !this.showBranch
    },
    handleChangeBranch: function (item) {
      this.filterBranch = item.name === '所有分支' ? null : item.name
      this.toggleShowBranch()
    },
    calcTime: function (startedAt, finishedAt) {
      const time = moment.unix(finishedAt).diff(moment.unix(startedAt), 's')
      return `${time}s`
    },
    fetchBuilds: async function () {
      this.isLoading = true
      this.owner = this.$route.query.owner
      this.repo = this.$route.query.repo
      if (!this.owner || !this.repo) {
        return
      }
      this.builds = await getReposBuilds(this.owner, this.repo)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
        $this.loadingBuildId = null
        // $this.filterBranch = null
      }, 500)()
    },
    handleRetry: async function (buildId) {
      this.loadingBuildId = buildId
      await postReposBuilds(this.owner, this.repo, buildId)
      this.loadingBuildId = null
      await _.debounce(this.fetchBuilds, 800)()
    },
    handleStop: async function (buildId) {
      this.loadingBuildId = buildId
      await deleteReposBuilds(this.owner, this.repo, buildId)
      this.loadingBuildId = null
      await _.debounce(this.fetchBuilds, 800)()
    }
  },
  created: function () {
    this.fetchBuilds()
  },
  watch: {
    '$route': 'fetchBuilds'
  }
}
</script>
<style scoped lang="less">
  .build {
    :global(.van-card) {
      height: auto;
      min-height: 100px;
    }
  }
</style>

<template>
  <div class="build">
    <van-nav-bar
      :title="this.repo || 'Build List'"
      left-arrow
      fixed
      @click-left='handleGoback'
    >
    </van-nav-bar>
    <van-pull-refresh v-model="isLoading" @refresh="fetchBuilds" style="padding-top: 46px;">
      <van-list>
        <van-card
          v-for="build in builds" :key="build.id"
          :thumb="build.author_avatar"
          currency=""
        >
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
            {{build.author}}:{{build.branch}}
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
            <span style="color: #bdbdbd; font-size: 12px; margin-right: 2px;">{{build.created_at | unixDateTime}}</span>
            <van-tag plain type="primary">
              {{calcTime(build.started_at, build.finished_at)}}
            </van-tag>
          </template>
        </van-card>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import _ from 'lodash'
import { NavBar, List, Panel, Card, Icon, Button, Tag, PullRefresh } from 'vant'
import { getReposBuilds, postReposBuilds, deleteReposBuilds } from '@/api/build'
Vue.use(NavBar).use(List).use(Panel).use(Card).use(Icon).use(Button).use(Tag).use(PullRefresh)

export default {
  name: 'home',
  data () {
    return {
      isLoading: false,
      loadingBuildId: null,
      activeNames: ['1'],
      builds: []
    }
  },
  methods: {
    calcTime: function (startedAt, finishedAt) {
      if (startedAt && finishedAt) {
        const time = moment.unix(finishedAt).diff(moment.unix(startedAt), 's')
        return `${time}s`
      }
      return '-'
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
      }, 500)()
    },
    handleGoback: function () {
      this.$router.back()
    },
    handleRetry: async function (buildId) {
      this.loadingBuildId = buildId
      await postReposBuilds(this.owner, this.repo, buildId)
      await _.debounce(this.fetchBuilds, 1000)()
      this.loadingBuildId = null
    },
    handleStop: async function (buildId) {
      this.loadingBuildId = buildId
      await deleteReposBuilds(this.owner, this.repo, buildId)
      await _.debounce(this.fetchBuilds, 1000)()
      this.loadingBuildId = null
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
:global(.van-card) {
  height: auto;
  min-height: 100px;
}
</style>

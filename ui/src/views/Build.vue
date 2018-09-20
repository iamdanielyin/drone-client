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
          currency=""
        >
          <template slot="thumb">
            <img :src="build.author_avatar" class="van-card__img" @click="handleShowInfo(build.number)">
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
      </van-list>
    </van-pull-refresh>
    <van-popup v-model="isShow" style="width: 100%; height: 100%;">
      <div style="display: flex; justify-content: flex-end; padding: 15px; align-items: center;">
        <van-icon name="close" @click="handleCloseInfo" class="closeInfo" />
      </div>
      <van-collapse
        v-model="showBuildLogsNames"
        accordion
        @change="handleLogChange"
      >
        <van-collapse-item
          v-for="proc in procs"
          :key="proc.id"
          :title="proc.name"
          :name="proc.pid"
          class="logContent"
        >
          <div
            v-for="(log, index) in showBuildLogs"
            :key="index"
          >
            <span class="logContentNo">{{index + 1}}</span>
            <span class="logContentOut">{{log}}</span>
          </div>
        </van-collapse-item>
      </van-collapse>
    </van-popup>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import _ from 'lodash'
import { NavBar, List, Panel, Card, Icon, Button, Tag, PullRefresh, Popup } from 'vant'
import { getReposBuilds, postReposBuilds, deleteReposBuilds, getReposBuildInfo, getReposBuildInfoLogs } from '@/api/build'
Vue.use(NavBar).use(List).use(Panel).use(Card).use(Icon).use(Button).use(Tag).use(PullRefresh).use(Popup)

export default {
  name: 'home',
  data () {
    return {
      isLoading: false,
      loadingBuildId: null,
      isShow: false,
      showBuildId: null,
      showBuildInfo: null,
      showBuildLogs: [],
      showBuildLogsNames: ['1'],
      activeNames: ['1'],
      builds: []
    }
  },
  computed: {
    procs: function () {
      const children = _.get(this.showBuildInfo, 'procs[0].children', [])
      return children
    }
  },
  methods: {
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
      }, 500)()
    },
    handleGoback: function () {
      this.$router.back()
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
    },
    handleShowInfo: async function (buildId) {
      this.showBuildId = buildId
      this.showBuildInfo = await getReposBuildInfo(this.owner, this.repo, buildId)
      this.isShow = true
    },
    handleCloseInfo: function () {
      this.showBuildId = null
      this.showBuildInfo = null
      this.showBuildLogs = []
      this.isShow = false
    },
    handleLogChange: async function (activeName) {
      if (activeName) {
        let logs = await getReposBuildInfoLogs(this.owner, this.repo, this.showBuildId, activeName)
        logs = _.chain(logs).map(item => item.out).value()
        this.showBuildLogs = logs
      }
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
  :global(.van-modal) {
    background-color: transparent;
  }
  .closeInfo {
    font-size: 20px;
  }
  .logContent {
    :global(.van-collapse-item__wrapper) {
      background:#eceff1;
      font-size: 12px;
      color: #212121;
    }
    :global(.van-collapse-item__content) {
      background:transparent;
    }
    .logContentNo {
      padding-right: 10px;
      min-width: 20px;
      color: rgba(0, 0, 0, 0.3);
    }
    .logContentOut {
      min-width: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }
</style>


<template>
  <div class="log">
    <van-nav-bar
      fixed
      right-text="Copy"
      @click-right="handleCopyImage"
    >
      <div slot="title">
        <router-link :to="{ name: 'build', query: { owner: this.owner, repo: this.repo } }" style="color: #4A79DC; display: inline-block;">
          {{this.repo}}
        </router-link>
        <template>{{':' + this.build  || 'Build Logs'}}</template>
      </div>
    </van-nav-bar>
    <p v-show="noData" class="noData">No data.</p>
    <van-pull-refresh v-model="isLoading" @refresh="fetchBuildInfo" style="padding-top: 46px;">
      <van-collapse
        v-model="buildLogsNames"
        accordion
        @change="handleLogChange"
      >
        <van-collapse-item
          v-for="proc in procs"
          :key="proc.id"
          :name="proc.pid"
          class="logContent"
        >
          <span slot="title">
            <span style="margin-right: 5px; color: #474D5A;">{{proc.name}}</span>
            <template>
              <van-tag plain type="success" v-if="proc.state === 'success'">{{proc.state}}</van-tag>
              <van-tag type="primary" v-else-if="proc.state === 'running'">{{proc.state}}</van-tag>
              <van-tag plain type="danger" v-else-if="proc.state === 'failure'">{{proc.state}}</van-tag>
              <van-tag plain v-else-if="['skipped', 'pending'].includes(proc.state)">{{proc.state}}</van-tag>
              <van-tag plain type="primary" v-else>{{proc.state}}</van-tag>
            </template>
            <span style="margin-left: 5px; color: #989DAA; font-size: 12px;" v-if="proc.start_time && proc.end_time">{{calcTime(proc.start_time, proc.end_time)}}</span>
          </span>
          <div
            v-for="(log, index) in buildLogs"
            :key="index"
          >
            <span class="logContentNo">{{index + 1}}</span>
            <span class="logContentOut">{{log}}</span>
          </div>
        </van-collapse-item>
      </van-collapse>
    </van-pull-refresh>
    <div class="logActions">
      <van-button
        size="small"
        @click.stop.prevent="handleRetry"
        v-if="buildInfo.status !== 'running'"
        style="border: 1px solid rgb(74, 121, 220); color: #4A79DC;"
      >
        RETRY
      </van-button>
      <van-button
        type="danger"
        size="small"
        @click.stop.prevent="handleStop"
        v-if="buildInfo.status === 'running'"
        style="border: 1px solid #F25E56;"
      >
        STOP
      </van-button>
    </div>
  </div>
</template>
<script>
import Vue from 'vue'
import moment from 'moment'
import _ from 'lodash'
import VueClipboard from 'vue-clipboard2'
import { NavBar, Icon, Collapse, CollapseItem, Cell, Tag, CellGroup, PullRefresh, Loading, Toast, Button } from 'vant'
import { getReposBuildInfo, getReposBuildInfoLogs, postReposBuilds, deleteReposBuilds } from '@/api/build'
Vue.use(NavBar).use(Icon).use(Collapse).use(CollapseItem).use(Cell).use(Tag).use(CellGroup).use(PullRefresh).use(Loading).use(Toast).use(VueClipboard).use(Button)
VueClipboard.config.autoSetContainer = true

export default {
  name: 'home',
  data () {
    return {
      isLoading: false,
      buildLogsNames: null,
      buildInfo: {},
      buildLogs: [],
      procs: [],
      fetchInterval: null
    }
  },
  computed: {
    noData: function () {
      return this.procs.length === 0
    },
    needAutoFetch: function () {
      return !!this.procs.find(proc => proc.state === 'running')
    }
  },
  methods: {
    handleRetry: async function () {
      await postReposBuilds(this.owner, this.repo, this.build)
      await _.debounce(this.fetchBuildInfo, 200)(false)
    },
    handleStop: async function () {
      await deleteReposBuilds(this.owner, this.repo, this.build)
      await _.debounce(this.fetchBuildInfo, 200)(false)
    },
    autoRefresh (restart = true) {
      if (this.fetchInterval) {
        window.clearInterval(this.fetchInterval)
      }
      if (restart === true) {
        this.fetchInterval = window.setInterval(this.fetchBuildInfo.bind(this, false), 5 * 1000)
      } else {
        this.fetchInterval = null
      }
    },
    calcTime: function (startedAt, finishedAt) {
      const time = moment.unix(finishedAt).diff(moment.unix(startedAt), 's')
      return `${time}s`
    },
    fetchBuildInfo: async function (needLoading = true) {
      this.owner = this.$route.query.owner
      this.repo = this.$route.query.repo
      this.build = this.$route.query.build
      if (!this.owner || !this.repo || !this.build) {
        return
      }
      if (needLoading === true) {
        this.isLoading = true
      }
      this.buildInfo = await getReposBuildInfo(this.owner, this.repo, this.build)
      this.procs = _.get(this.buildInfo, 'procs[0].children', [])
      this.buildLogsNames = _.get(this.procs.find(proc => proc.state === 'running'), 'pid') || _.tail(this.procs.map(item => item.pid))
      await this.handleLogChange(this.buildLogsNames)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
      }, 500)()
      if (this.needAutoFetch !== true) {
        this.autoRefresh(false)
      }
    },
    handleLogChange: async function (activeName) {
      activeName = Array.isArray(activeName) ? _.get(activeName, '[0]') : activeName
      const proc = this.procs.find(item => item.pid === activeName)
      const state = _.get(proc, 'state')
      if (['success', 'failure'].includes(state)) {
        let logs = await getReposBuildInfoLogs(this.owner, this.repo, this.build, activeName)
        logs = _.chain(logs).map(item => item.out).value()
        this.buildLogs = logs
      } else {
        this.buildLogs = proc ? [proc.state] : []
      }
    },
    handleCopyImage: function () {
      let image = null
      const reg1 = new RegExp('image":"(.*)"')
      const reg2 = new RegExp('docker push (.*)')
      for (const item of this.buildLogs) {
        image = _.get(reg1.exec(item), '[1]')
        image = image || _.get(reg2.exec(item), '[1]')
        if (image) {
          break
        }
      }
      if (image) {
        Toast({
          message: image
        })
        this.$copyText(image)
      } else {
        Toast({
          message: 'Image not found',
          duration: 1000
        })
      }
    }
  },
  created: function () {
    this.fetchBuildInfo()
  },
  watch: {
    '$route': 'fetchBuildInfo'
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
  .log {
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
    .logActions {
      position: fixed;
      bottom: 30px;
      right: 20px;
      font-size: 16px;
    }
  }
</style>

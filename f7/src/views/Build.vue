
<template>
  <f7-page class="build" ptr @ptr:refresh="handleLoadMore" @page:afterin="afterin" @page:afterout="afterout">
    <f7-navbar
      :title="`${repo} (${builds.length})` || 'Builds'"
      back-link="Back"
    ></f7-navbar>

    <f7-list v-if="builds.length" class="build-list">
      <f7-list-item
        v-for="build in builds"
        :key="build.id"
        class="build-list-item"
        :link="`/log?${stringify({ owner, repo, build: build.number })}`"
      >
        <f7-card
          class="build-card"
        >
          <f7-card-header class="no-border">
            <div class="build-avatar"><img :src="build.author_avatar" width="34" height="34"/></div>
            <div
              class="build-number"
              :class="{
                successStatus: build.status === 'success',
                runningStatus: build.status === 'running',
                errorStatus: build.finished_at && build.status !== 'success'
              }"
            >
              {{build.number}}
            </div>
            <div class="build-name">{{build.author}}</div>
            <div class="build-date">
              <template>{{build.started_at | unixDateTime}}</template>
            </div>
          </f7-card-header>
          <f7-card-content>
            <p>{{build.message}}</p>
          </f7-card-content>
          <f7-card-footer class="no-border">
            <span>{{build.started_at | calcTime(build.finished_at, true)}}</span>
            <span>
              <span v-if="build.finished_at && build.status !== 'running'" @click="handleRetry(build.number)">
                <f7-icon f7="redo" size="20px"></f7-icon>
              </span>
              <span v-if="build.status === 'running'" @click="handleCancel(build.number)">
                <f7-icon f7="close" size="20px" ></f7-icon>
              </span>
            </span>
          </f7-card-footer>
        </f7-card>
      </f7-list-item>
    </f7-list>
    <div class="build-logs fab-morph-target" slot="fixed">
      <f7-icon class="fab-close btn-close-logs" ios="f7:close" md="material:close"></f7-icon>
      <f7-block-title>build logs</f7-block-title>
      <f7-list accordion-list>
        <f7-list-item
          accordion-item
          v-for="proc in procs"
          :key="proc.id"
          :title="proc.name"
          :accordion-item-opened="activeProcPid === proc.pid"
          @accordion:open="handleProcChange(proc.pid)"
          :class="{ activeProc: activeProcPid === proc.pid }"
        >
          <f7-accordion-content>
            <f7-block style="padding-bottom: 10px;">
              <div
                v-for="(log, index) in buildLogs"
                :key="index + 1"
              >
                <span class="logContentNo">{{index + 1}}</span>
                <span class="logContentOut">{{log}}</span>
              </div>
            </f7-block>
          </f7-accordion-content>
        </f7-list-item>
      </f7-list>
    </div>
    <p v-show="!builds.length" class="noData">No data.</p>
  </f7-page>
</template>
<script>
import qs from 'qs'
import _ from 'lodash'
import { getReposBuilds, postReposBuilds, deleteReposBuilds, getReposBuildInfo, getReposBuildInfoLogs } from '@/api/build'

export default {
  name: 'build',
  data () {
    return {
      owner: null,
      repo: null,
      isLoading: false,
      builds: [],
      build: null,
      activeProcPid: null,
      fetchInterval: null,
      buildInfo: {},
      buildLogs: [],
      procs: []
    }
  },
  mounted () {
    this.owner = this.$f7route.query.owner
    this.repo = this.$f7route.query.repo
  },
  methods: {
    stringify: qs.stringify,
    afterin () {
      this.autoRefresh()
      this.fetchBuilds()
    },
    afterout () {
      this.autoRefresh(false)
    },
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
    handleLogs (build) {
      this.build = build
      this.fetchBuildInfo()
    },
    fetchBuilds: async function (first, needLoading = true) {
      if (needLoading === true) {
        this.isLoading = true
      }
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
    handleRetry: async function (buildId) {
      this.loadingBuildId = buildId
      await postReposBuilds(this.owner, this.repo, buildId)
      this.loadingBuildId = null
      await _.debounce(this.fetchBuilds, 800)(undefined, false)
    },
    handleCancel: async function (buildId) {
      this.loadingBuildId = buildId
      await deleteReposBuilds(this.owner, this.repo, buildId)
      this.loadingBuildId = null
      await _.debounce(this.fetchBuilds, 1000)(undefined, false)
    },
    fetchBuildInfo: async function (needLoading = true) {
      if (!this.owner || !this.repo || !this.build) {
        return
      }
      if (needLoading === true) {
        this.isLoading = true
      }
      this.buildInfo = await getReposBuildInfo(this.owner, this.repo, this.build)
      this.procs = _.get(this.buildInfo, 'procs[0].children', [])
      await _.debounce(async () => {
        const activeProcPid = _.first(this.procs.map(item => item.state === 'running' && item.pid)) || _.last(this.procs.map(item => item.pid))
        await this.handleProcChange(activeProcPid)
        this.isLoading = false
      }, 500).bind(this)()
    },
    handleProcChange: async function (activeProcPid) {
      this.activeProcPid = activeProcPid
      const proc = this.procs.find(item => item.pid === activeProcPid)
      const state = _.get(proc, 'state')
      let logs = null
      if (['success', 'failure'].includes(state)) {
        logs = await getReposBuildInfoLogs(this.owner, this.repo, this.build, activeProcPid)
        logs = _.chain(logs).map(item => item.out).value()
      } else {
        logs = proc ? [proc.state] : []
      }
      this.buildLogs = logs
    },
    async handleLoadMore (e, done) {
      await this.fetchBuilds()
      done()
    }
  }
}
</script>
<style lang="less" scoped>
.build {
  .build-list {
    margin: 0;
    // margin-top: 10px;
    :global(ul) {
      background: transparent;
    }
    .build-list-item {
      margin-bottom: 10px;
      :global(.item-content) {
        padding: 0;
      }
      :global(.item-inner) {
        padding: 0;
      }
    }
  }
  .build-card {
    margin: 0;
    padding: 0;
    width: 100%;
    border-radius: 0;
    :global(.card-header) {
      display: block;
      padding: 10px;
    }
  }
  .build-avatar {
    float: left;
    img {
      border-radius: 50%;
    }
  }
  .build-number {
    float: right;
    font-size: 14px;
    border-width: 2px;
    border-style: solid;
    border-radius: 2px;
    text-align: center;
    line-height: 20px;
    min-width: 65px;
  }
  .build-name {
    margin-left: 44px;
    font-size: 14px;
    font-weight: 500;
  }
  .build-date {
    margin-left: 44px;
    font-size: 13px;
    color: #8e8e93;
  }
  .build-logs {
    position: absolute;
    left: 10px;
    right: 10px;
    top: 64px;
    bottom: 0;
    background: #fff;
    z-index: 1600;
    border-radius: 5px 5px 0 0;
    box-shadow: 0px 3px 30px rgba(0,0,0,0.4);
    overflow: auto;
    .btn-close-logs {
      position: fixed;
      right: 15px;
      top: 10px;
    }
  }
  .btn-build-logs {
    bottom: 10px;
    :global(&>a) {
      width: 25px;
      height: 25px;
      border-radius: 50% !important;
    }

    :global(&>a>i) {
      font-size: 16px !important;
      font-weight: bold;
      color: #007aff;
    }
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
  .activeProc {
    background: #eceff1;
  }
  .successStatus {
    border-color: #4dc89a;
    color: #4dc89a;
  }
  .runningStatus {
    border-color: #2196f3;
    color: #2196f3;
  }
  .errorStatus {
    border-color: #fc4758;
    color: #fc4758;
  }
}
:global(.ios .fab-morph) {
  border-radius: 50% !important;
  background-color: #fff;
}
</style>

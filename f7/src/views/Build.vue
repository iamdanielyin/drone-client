
<template>
  <f7-page class="build">
    <f7-navbar
      :title="`${$f7route.query.repo} (${builds.length})` || 'Builds'"
      back-link="Back"
    ></f7-navbar>

    <template v-if="builds.length">
      <f7-card
        v-for="build in builds"
        :key="build.id"
        class="build-card"
      >
        <f7-card-header class="no-border">
          <div class="build-avatar"><img :src="build.author_avatar" width="34" height="34"/></div>
          <div class="build-number">#{{build.number}}</div>
          <div class="build-name">{{build.author}}:{{build.branch}}</div>
          <div class="build-date">
            <template>{{build.created_at | fromNowWithUnix}}</template>
            <template v-if="build.started_at && build.finished_at">, {{build.started_at | calcTime(build.finished_at)}}</template>
          </div>
        </f7-card-header>
        <f7-card-content>
          <p>{{build.message}}</p>
        </f7-card-content>
        <f7-card-footer class="no-border">
          <f7-link v-if="build.status !== 'running'" @click.stop.prevent="handleRetry(build.number)">RETRY</f7-link>
          <f7-link v-if="build.status === 'running'" @click.stop.prevent="handleStop(build.number)">STOP</f7-link>
          <f7-fab class="btn-build-logs" morph-to=".build-logs.fab-morph-target" @click="handleLogs(build.number)">
            <f7-icon ios="f7:right" md="material:right"></f7-icon>
          </f7-fab>
        </f7-card-footer>
      </f7-card>
      <div class="build-logs fab-morph-target" slot="fixed">
        <f7-icon class="fab-close btn-close-logs" ios="f7:close" md="material:close"></f7-icon>

        <f7-block-title>build logs</f7-block-title>
        <f7-list accordion-list>
          <f7-list-item
            accordion-item
            v-for="proc in procs"
            :key="proc.id"
            :title="proc.name"
            @accordion:open="handleProcChange(proc.pid)"
          >
            <f7-accordion-content>
              <f7-block>
                <div
                  v-for="(log, index) in buildLogs"
                  :key="index"
                >
                  <span class="logContentNo">{{index + 1}}</span>
                  <span class="logContentOut">{{log}}</span>
                </div>
              </f7-block>
            </f7-accordion-content>
          </f7-list-item>
        </f7-list>
      </div>
    </template>
  </f7-page>
</template>
<script>
import moment from 'moment'
import qs from 'qs'
import _ from 'lodash'
import { getReposBuilds, postReposBuilds, deleteReposBuilds, getReposBuildInfo, getReposBuildInfoLogs } from '@/api/build'

export default {
  name: 'build',
  data () {
    return {
      isLoading: false,
      builds: [],
      build: null,
      activeProcPid: null,
      buildInfo: {},
      buildLogs: [],
      procs: [],
    }
  },
  methods: {
    stringify: qs.stringify,
    handleLogs (build) {
      this.build = build
      this.fetchBuildInfo()
    },
    fetchBuilds: async function (first, needLoading = true) {
      if (needLoading === true) {
        this.isLoading = true
      }
      this.owner = this.$f7route.query.owner
      this.repo = this.$f7route.query.repo
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
    handleStop: async function (buildId) {
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
      this.activeProcPid = _.get(this.procs.find(proc => proc.state === 'running'), 'pid') || _.tail(this.procs.map(item => item.pid))
      await this.handleProcChange(this.activeProcPid)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
      }, 500)()
    },
    handleProcChange: async function (activeProcPid) {
      const proc = this.procs.find(item => item.pid === activeProcPid)
      const state = _.get(proc, 'state')
      if (['success', 'failure'].includes(state)) {
        let logs = await getReposBuildInfoLogs(this.owner, this.repo, this.build, activeProcPid)
        logs = _.chain(logs).map(item => item.out).value()
        this.buildLogs = logs
      } else {
        this.buildLogs = proc ? [proc.state] : []
      }
    }
  },
  created () {
    this.fetchBuilds(true)
  }
}
</script>
<style lang="less" scoped>
.build {
  .build-card {
    :global(.card-header) {
      display: block;
      padding: 10px;
    }
  }
  .build-avatar {
    float: left;
  }
  .build-number {
    float: right;
    font-size: 14px;
    color: #8e8e93;
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
}
:global(.ios .fab-morph) {
  border-radius: 50% !important;
  background-color: #fff;
}
</style>

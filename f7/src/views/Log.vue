
<template>
  <f7-page class="log" ptr @ptr:refresh="handleLoadMore" @page:afterin="afterin" @page:afterout="afterout">
    <f7-navbar
      :title="`${repo} #${build}` || 'Logs'"
      back-link="Back"
    >
    </f7-navbar>
    <div
      class="status"
      :class="{
        successStatus: buildInfo.status === 'success',
        runningStatus: buildInfo.status === 'running',
        errorStatus: buildInfo.finished_at && buildInfo.status !== 'success'
      }"
    >
      {{buildInfo.status}}
    </div>
    <div class="message">{{buildInfo.message}}</div>
    <div class="buildTime">
      <div class="buildTimeRow">
        <f7-icon class="buildTimeRowIcon" f7="time" size="16px"></f7-icon>
        <span class="buildTimeRowVal">
          <f7-link popover-open=".popover-buildTime" style="color: #000;">
            {{buildInfo.started_at | fromNowWithUnix}}
          </f7-link>
        </span>
      </div>
      <div class="buildTimeRow">
        <f7-icon class="buildTimeRowIcon" f7="pie_fill" size="16px"></f7-icon>
        <span class="buildTimeRowVal" v-if="buildInfo.started_at && buildInfo.finished_at">{{buildInfo.started_at | calcTime(buildInfo.finished_at, true)}}</span>
      </div>
    </div>
    <div class="buildTime">
      <div class="buildTimeRow">
        <f7-icon class="buildTimeRowIcon" f7="paper_plane_fill" size="16px"></f7-icon>
        <span class="buildTimeRowVal">
          <f7-link popover-open=".popover-buildTime" style="color: #000;">
            <template v-if="buildInfo.commit">{{buildInfo.commit.substr(0, 10)}}</template>
          </f7-link>
        </span>
        <f7-link :href="buildInfo.link_url" target="_blank" external style="position: absolute; right: 0; color: #000;">
          <f7-icon class="buildTimeRowIcon" fa="link" size="16px"></f7-icon>
        </f7-link>
      </div>
      <div class="buildTimeRow">
        <f7-icon class="buildTimeRowIcon" fa="code-branch" size="16px" style="width: 16px;"></f7-icon>
        <span class="buildTimeRowVal">{{buildInfo.branch}}</span>
      </div>
    </div>
    <f7-popover class="popover-buildTime">{{buildInfo.started_at | unixDateTime}}</f7-popover>
    <div class="buildProcs">
      <div
        v-for="(item, index) in procsChildren"
        :key="item.pid"
        class="buildProc"
        @click="handleLogsOpen(item, index)"
        :class="{ buildProcSelected: logsOpenProc.pid === item.pid }"
      >
        <span class="buildProcName">{{item.name}}</span>
        <span class="buildProcTime">
          <span style="display: inline-block; width: 45px; text-align: right;">
            <template v-if="item.start_time && item.end_time">{{item.start_time | calcTimeClock(item.end_time)}}</template>
            <template v-else>00:00</template>
          </span>
          <span style="display: inline-block; width: 25px; text-align: center;">
            <f7-icon v-if="item.state === 'success'" f7="check_round" size="16px" style="color: #4dc89a;"></f7-icon>
            <f7-icon v-if="['failure', 'killed', 'skipped'].includes(item.state)" f7="close_round" size="16px" style="color: #fc4758;"></f7-icon>
            <f7-icon v-if="item.state === 'pending'" f7="alarm" size="16px"></f7-icon>
            <f7-preloader v-if="item.state === 'running'" style="width: 16px;"></f7-preloader>
          </span>
        </span>
      </div>
      <f7-popup class="proc-logs" :opened="logsOpened" @popup:closed="handleLogsClose">
        <f7-page style="background: #fff;">
          <f7-navbar :title="logsOpenProc.name">
            <f7-nav-right>
              <f7-link popup-close>Close</f7-link>
            </f7-nav-right>
          </f7-navbar>
          <f7-block class="logBlock">
            <div
              :class="{
                successColor: logsOpenProc.state === 'success',
                runningColor: logsOpenProc.state === 'running',
                errorColor: logsOpenProc.end_time && logsOpenProc.state !== 'success'
              }"
            >{{logsOpenProc.state}}</div>
          </f7-block>
          <f7-block class="logBlock">
            <div
              v-for="(log, index) in logsContent(logsOpenProc.pid)"
              :key="index + 1"
              class="logContent"
            >
              <span class="logContentNo">{{index + 1}}</span>
              <span class="logContentOut">{{log}}</span>
            </div>
            <div class="logContent">exit code {{logsOpenProc.exit_code}}</div>
          </f7-block>
          <f7-fab position="center-bottom" slot="fixed">
            <f7-segmented round class="proc-logs-actions" >
              <f7-button icon-size="18px" icon-f7="chevron_left" @click="handleLogsUp" :disabled="logsOpenIndex === 0"></f7-button>
              <f7-button icon-size="18px" icon-f7="chevron_right" @click="handleLogsDown" :disabled="logsOpenIndex === procsChildren.length - 1"></f7-button>
            </f7-segmented>
          </f7-fab>
        </f7-page>
      </f7-popup>
    </div>
  </f7-page>
</template>
<script>
import _ from 'lodash'
import { getReposBuildInfo, getReposBuildInfoLogs } from '@/api/build'

export default {
  name: 'log',
  data () {
    return {
      owner: null,
      repo: null,
      build: null,
      fetchInterval: null,
      logsOpenProc: {},
      logsOpenIndex: 0,
      logsOpened: false,
      buildInfo: {},
      activeProcPid: null,
      logsCache: {}
    }
  },
  computed: {
    procsChildren () {
      return _.get(this.buildInfo, 'procs[0].children', [])
    }
  },
  mounted () {
    this.owner = this.$f7route.query.owner
    this.repo = this.$f7route.query.repo
    this.build = this.$f7route.query.build
  },
  methods: {
    afterin () {
      this.autoRefresh()
      this.fetchBuildInfo()
    },
    afterout () {
      this.autoRefresh(false)
    },
    autoRefresh (restart = true) {
      if (this.fetchInterval) {
        window.clearInterval(this.fetchInterval)
      }
      if (restart === true) {
        this.fetchInterval = window.setInterval(this.fetchBuildInfo.bind(this, undefined, false), 8 * 1000)
      } else {
        this.fetchInterval = null
      }
    },
    async handleLoadMore (e, done) {
      await this.fetchBuildInfo()
      done()
    },
    logsContent (pid) {
      return this.logsCache[pid] || []
    },
    handleLogsOpen (item, index) {
      this.logsOpenProc = item
      this.logsOpenIndex = index
      this.logsOpened = true
    },
    handleLogsClose () {
      this.logsOpened = false
    },
    handleLogsUp () {
      if (this.logsOpenIndex > 0) {
        const index = this.logsOpenIndex - 1
        const item = this.procsChildren[index]
        this.logsOpenProc = item
        this.logsOpenIndex = index
      }
    },
    handleLogsDown () {
      if (this.logsOpenIndex < this.procsChildren.length) {
        const index = this.logsOpenIndex + 1
        const item = this.procsChildren[index]
        this.logsOpenProc = item
        this.logsOpenIndex = index
      }
    },
    fetchBuildInfo: async function () {
      if (!this.owner || !this.repo || !this.build) {
        return
      }
      this.buildInfo = await getReposBuildInfo(this.owner, this.repo, this.build)
      for (const proc of this.procsChildren) {
        if (proc.end_time) {
          await this.fetchBuildLogs(proc.pid)
        }
      }
      const activeProcPid = _.first(this.procsChildren.map(item => item.state === 'running' && item.pid)) || _.last(this.procsChildren.map(item => item.pid))
      this.activeProcPid = activeProcPid
    },
    fetchBuildLogs: async function (pid) {
      const logsCache = this.logsCache
      const proc = this.procsChildren.find(item => item.pid === pid)
      if (!proc || ['killed'].includes(proc.state)) {
        return
      }
      let logs = null
      if (proc.end_time) {
        logs = await getReposBuildInfoLogs(this.owner, this.repo, this.build, pid)
        logs = _.chain(logs).map(item => item.out).value()
        logsCache[pid] = logs
        this.logsCache = _.cloneDeep(logsCache)
      } else {
        logs = proc ? [proc.state] : []
      }
      return logs
    }
  }
}
</script>
<style lang="less" scoped>
.logContent {
  .logContentNo {
    width: 30px;
    display: inline-block;
    color: rgba(0, 0, 0, 0.3);
  }
  .logContentOut {
    min-width: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}

.successColor {
  color: #4dc89a;
}
.errorColor {
  color: #fc4758;
}
.runningColor {
  color: #2196f3;
}
.logBlock {
  margin: 0 0 5px 0;
  margin-bottom: 5px;
  background: #eceff1;
  padding: 10px 15px;
}
.proc-logs {
  :global(.fab>a) {
    background: transparent;
    width: auto;
    height: auto;
    box-shadow: none;
    border-radius: 0;
  }
  .proc-logs-actions {
    width: 80px;
    :global(.button) {
      background: #fff;
    }
  }
}
.log {
  background: #fff;
  .status {
    display: flex;
    padding: 10px 20px;
    border-radius: 2px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    text-transform: capitalize;
    font-size: 16px;
  }
  .successStatus {
    background-color: #4dc89a;
  }
  .errorStatus {
    background-color: #fc4758;
  }
  .runningStatus {
    background-color: #2196f3;
  }
  .message {
    margin: 20px 0px;
    padding: 0px 10px;
    padding-bottom: 20px;
    line-height: 20px;
    font-size: 14px;
    border-bottom: 1px solid #eceff1;
  }
  .buildTime {
    margin: 20px 0px;
    padding: 0px 10px;
    padding-bottom: 20px;
    line-height: 20px;
    font-size: 14px;
    border-bottom: 1px solid #eceff1;
    .buildTimeRow {
      margin: 5px 0;
      display: flex;
      align-items: center;
      position: relative;
    }
  }
  .buildProcs {
    margin: 20px 0px;
    line-height: 20px;
    font-size: 14px;
    .buildProc {
      display: flex;
      align-items: center;
      padding: 0px 10px;
      .buildProcName {
        margin: 0px;
        padding: 0px;
        font-weight: normal;
        font-size: 14px;
        line-height: 36px;
        vertical-align: middle;
        flex: 1 1 auto;
      }
      .buildProcTime {
        color: #bdbdbd;
        font-size: 13px;
        line-height: 32px;
        display: flex;
        align-items: center;
        vertical-align: middle;
      }
    }
    .buildProcSelected {
      background: #eceff1;
    }
  }
  .buildTimeRowIcon {
    margin-right: 10px;
  }
}
.popover-buildTime {
  width: auto;
  padding: 2px 5px;
  text-align: center;
}
</style>

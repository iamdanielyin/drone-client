
<template>
  <f7-page class="log">
    <f7-navbar
      :title="`${$f7route.query.repo} #${$f7route.query.build}` || 'Logs'"
      back-link="Back"
    >
    </f7-navbar>
    <div class="timeline" style="display: none">
      <div v-for="item in procsChildren" :key="item.pid" class="timeline-item">
        <div class="timeline-item-date">{{item.start_time | formatUnixDate('HH:mm:ss')}}</div>
        <div class="timeline-item-divider"></div>
        <div class="timeline-item-content">
          <div class="timeline-item-inner" style="overflow: auto; max-height: 100px;">
            <div
              v-for="(log, index) in logsContent(item.pid)"
              :key="index + 1"
              class="logContent"
            >
              <span class="logContentNo">{{index + 1}}</span>
              <span class="logContentOut">{{log}}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <f7-popover class="popover-buildTime">{{buildInfo.started_at | unixDateTime}}</f7-popover>
    <div class="buildProcs">
      <div v-for="item in procsChildren" :key="item.pid" class="buildProc">
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
  methods: {
    logsContent (pid) {
      return this.logsCache[pid] || []
    },
    fetchBuildInfo: async function () {
      this.owner = this.$f7route.query.owner
      this.repo = this.$f7route.query.repo
      this.build = this.$f7route.query.build
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
      if (!proc) {
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
  },
  mounted () {
    this.fetchBuildInfo()
  }
}
</script>
<style lang="less" scoped>
.log {
  background: #fff;
  .logContent {
    white-space: nowrap;
    .logContentNo {
      width: 30px;
      color: rgba(0, 0, 0, 0.3);
      display: inline-block;
    }
    .logContentOut {
      min-width: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      white-space: nowrap;
    }
  }
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
    }
  }
  .buildProcs {
    margin: 20px 0px;
    padding: 0px 10px;
    line-height: 20px;
    font-size: 14px;
    .buildProc {
      display: flex;
      align-items: center;
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
        margin-right: 15px;
        vertical-align: middle;
      }
    }
  }
  .buildTimeRowIcon {
    margin-right: 10px;
  }
  .buildTimeRowVal {
  }
}
.popover-buildTime {
  width: auto;
  padding: 2px 5px;
  text-align: center;
}
</style>

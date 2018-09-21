
<template>
  <div class="bind">
    <van-nav-bar
      :title="this.repo + ':' + this.build  || 'Build Logs'"
      left-arrow
      fixed
      @click-left='$router.back()'
    >
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
              <van-tag plain type="danger" v-else-if="proc.state === 'failure'">{{proc.state}}</van-tag>
              <van-tag plain v-else-if="proc.state === 'skipped'">{{proc.state}}</van-tag>
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
  </div>
</template>
<script>
import Vue from 'vue'
import moment from 'moment'
import _ from 'lodash'
import { NavBar, Icon, Collapse, CollapseItem, Cell, Tag, CellGroup, PullRefresh, Loading } from 'vant'
import { getReposBuildInfo, getReposBuildInfoLogs } from '@/api/build'
Vue.use(NavBar).use(Icon).use(Collapse).use(CollapseItem).use(Cell).use(Tag).use(CellGroup).use(PullRefresh).use(Loading)

export default {
  name: 'home',
  data () {
    return {
      isLoading: false,
      buildLogsNames: ['1'],
      buildInfo: {},
      buildLogs: []
    }
  },
  computed: {
    procs: function () {
      const children = _.get(this.buildInfo, 'procs[0].children', [])
      console.log(children)
      return children
    },
    noData: function () {
      return this.procs.length === 0
    }
  },
  methods: {
    calcTime: function (startedAt, finishedAt) {
      const time = moment.unix(finishedAt).diff(moment.unix(startedAt), 's')
      return `${time}s`
    },
    fetchBuildInfo: async function () {
      this.owner = this.$route.query.owner
      this.repo = this.$route.query.repo
      this.build = this.$route.query.build
      if (!this.owner || !this.repo || !this.build) {
        return
      }
      this.isLoading = true
      this.buildInfo = await getReposBuildInfo(this.owner, this.repo, this.build)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
      }, 500)()
    },
    handleLogChange: async function (activeName) {
      activeName = Array.isArray(activeName) ? _.get(activeName, '[0]') : activeName
      const proc = this.procs.find(item => item.pid === activeName)
      if (_.get(proc, 'state') === 'success') {
        let logs = await getReposBuildInfoLogs(this.owner, this.repo, this.build, activeName)
        logs = _.chain(logs).map(item => item.out).value()
        this.buildLogs = logs
      } else {
        this.buildLogs = proc ? [proc.state, `exit_code=${proc.exit_code}`] : []
      }
    }
  },
  created: function () {
    this.fetchBuildInfo()
  },
  watch: {
    '$route': 'fetchBuildInfo'
  }
}
</script>
<style scoped lang="less">
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

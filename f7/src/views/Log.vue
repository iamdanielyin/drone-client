
<template>
  <f7-page >
    <f7-navbar
      :title="`${$f7route.query.repo}:${$f7route.query.build}` || 'Logs'"
      back-link="Back"
    ></f7-navbar>
  </f7-page>
</template>
<script>
export default {
  name: 'log',
  data () {
    return {
      isLoading: false,
      fetchLoading: false,
      buildInfo: {},
      buildLogs: [],
      procs: [],
      fetchInterval: null
    }
  },
  methods: {
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
    }
  },
  created: function () {
    this.fetchBuildInfo()
  }
}
</script>

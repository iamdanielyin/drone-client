<template>
  <f7-app :params="f7params">
    <f7-statusbar></f7-statusbar>
    <f7-view main url="/" :push-state="true"></f7-view>
  </f7-app>
</template>

<script>
import { f7App, f7View, f7Statusbar } from 'framework7-vue'
import routes from './routes'
import { app } from '@/utils/utility'
export default {
  name: 'App',
  components: { f7App, f7View, f7Statusbar },
  data () {
    return {
      f7params: {
        id: 'me.wosoft.drone-client',
        name: 'Drone',
        routes,
        theme: 'ios'
      }
    }
  },
  mounted () {
    app(this)
  }
}
</script>

<style lang="less">
</style>

<template>
  <f7-app :params="f7params">
    <f7-statusbar></f7-statusbar>
    <f7-view main url="/" :push-state="true"></f7-view>
  </f7-app>
</template>

<script>
import routes from './routes'
export default {
  name: 'App',
  data () {
    return {
      f7params: {
        id: 'me.wosoft.drone-client',
        name: 'Drone',
        routes
      }
    }
  },
  mounted () {
    this.$f7ready((f7) => {
      f7.dialog.alert('Component mounted')
    })
  }
}
</script>

<style lang="less">
</style>

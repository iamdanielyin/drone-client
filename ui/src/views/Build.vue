<template>
  <div class="build">
    <van-nav-bar
      :title="this.repo || 'Build List'"
      left-arrow
      @click-left='handleGoback'
      @click-right='fetchBuilds'
    >
      <van-icon name="home" slot="right" />
    </van-nav-bar>
    <van-list>
      <van-card
        v-for="build in builds" :key="build.id"
        :thumb="build.author_avatar"
        currency=""
      >
        <div slot="title" class="van-card__title" style="display: flex;align-items: center;">
          <span style="margin-right: 8px; display: flex; align-items: center;">
            <van-icon name="passed" v-if="build.status === 'success'" style="color: #4dc89a" />
            <van-icon name="close" v-else-if="build.status === 'failure'" style="color: #fc4758" />
            <van-icon name="logistics" v-else-if="build.status === 'running'" style="color: #38f" />
            <van-icon name="clock" v-else style="color: #fdb835" />
          </span>
          {{build.author}}: {{build.branch}}
        </div>
        <p slot="desc" style="color: #666; font-size: 12px;">
          {{build.message}}
        </p>
        <template slot="footer">
          <van-button type="primary" size="small" plain @click="handleRetry(build.number)" v-if="build.status !== 'running'" :loading="loadingState(build.number)">重试</van-button>
          <van-button type="danger" size="small" plain @click="handleStop(build.number)" v-if="build.status === 'running'" :loading="loadingState(build.number)">停止</van-button>
        </template>
        <template slot="tags">
          <van-tag type="primary" mark>{{build.number}}</van-tag>
          <van-tag mark>{{build.created_at | unixDateTime}}</van-tag>
        </template>
      </van-card>
    </van-list>
  </div>
</template>

<script>
import Vue from 'vue'
import _ from 'lodash'
import { NavBar, Toast, List, Panel, Card, Icon, Button, Tag } from 'vant'
import { getReposBuilds, postReposBuilds, deleteReposBuilds } from '@/api/build'
Vue.use(NavBar).use(List).use(Panel).use(Card).use(Icon).use(Button).use(Tag)

export default {
  name: 'home',
  data () {
    return {
      loading: {},
      activeNames: ['1'],
      builds: []
    }
  },
  methods: {
    loadingState: function (buildId) {
      const state = !!this.loading[buildId]
      console.log(state)
      return state
    },
    fetchBuilds: async function () {
      Toast.loading({
        mask: true,
        duration: 0,
        forbidClick: true
      })
      this.owner = this.$route.query.owner
      this.repo = this.$route.query.repo
      if (!this.owner || !this.repo) {
        return
      }
      const builds = await getReposBuilds(this.owner, this.repo)
      this.builds = builds
      Toast.clear()
    },
    handleGoback: function () {
      this.$router.back()
    },
    handleRetry: async function (buildId) {
      this.loading[buildId] = true
      await postReposBuilds(this.owner, this.repo, buildId)
      await _.debounce(this.fetchBuilds, 1000)()
      this.loading[buildId] = false
    },
    handleStop: async function (buildId) {
      this.loading[buildId] = true
      await deleteReposBuilds(this.owner, this.repo, buildId)
      await _.debounce(this.fetchBuilds, 1000)()
      this.loading[buildId] = false
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

<template>
  <div class='home'>
    <van-nav-bar
      title="Repo List"
      fixed
    >
    </van-nav-bar>
    <van-pull-refresh v-model="isLoading" @refresh="fetchRepos" style="padding-top: 46px;">
      <van-collapse v-model='activeNames'>
        <van-collapse-item v-for="(list, owner) in repos" :name='owner' :key='owner'>
          <div slot="title" style="color: #212121; font-size: 14px;">
            {{owner}}
            <van-tag plain type="primary">{{list.length}}</van-tag>
          </div>
          <router-link v-for="repo in list" :to="{ name: 'build', query: { owner, repo: repo.name } }" :key='repo.id'>
            <van-cell :title="repo.name" is-link/>
          </router-link>
        </van-collapse-item>
      </van-collapse>
    </van-pull-refresh>
  </div>
</template>

<script>
import Vue from 'vue'
import _ from 'lodash'
import { NavBar, Loading, Icon, Collapse, CollapseItem, Cell, Tag, CellGroup, PullRefresh } from 'vant'
import { getUserRepos } from '@/api/repo'
Vue.use(NavBar).use(Loading).use(Icon).use(Collapse).use(CollapseItem).use(Cell).use(Tag).use(CellGroup).use(PullRefresh)

export default {
  name: 'home',
  data () {
    return {
      isLoading: false,
      activeNames: ['1'],
      repos: {}
    }
  },
  methods: {
    fetchRepos: async function () {
      this.isLoading = true
      const repos = await getUserRepos()
      this.repos = _.groupBy(repos, 'owner')
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
      }, 500)()
    }
  },
  created: function () {
    this.fetchRepos()
  }
}
</script>

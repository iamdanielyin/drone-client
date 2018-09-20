<template>
  <div class='home'>
    <van-collapse v-model='activeNames'>
      <van-collapse-item v-for="(list, owner) in repos" :title='owner' :name='owner' :key='owner'>
        <router-link v-for="repo in list" :to="{ name: 'build', query: { owner, repo: repo.name } }" :key='repo.id'>
          <van-cell :title="repo.name" is-link/>
        </router-link>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script>
import Vue from 'vue'
import _ from 'lodash'
import { Collapse, CollapseItem, Cell, CellGroup } from 'vant'
import { getUserRepos } from '@/api/repo'
Vue.use(Collapse).use(CollapseItem).use(Cell).use(CellGroup)

export default {
  name: 'home',
  data () {
    return {
      activeNames: ['1'],
      repos: {}
    }
  },
  methods: {
    fetchRepos: async function () {
      const repos = await getUserRepos()
      this.repos = _.groupBy(repos, 'owner')
      console.log(this.repos)
    }
  },
  created: function () {
    this.fetchRepos()
  }
}
</script>

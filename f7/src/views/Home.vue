
<template>
  <f7-page class="home" ptr @ptr:refresh="handleLoadMore">
    <f7-navbar>
      <f7-nav-left>
        <f7-link panel-open="left" icon-ios="f7:menu" icon-md="material:menu"></f7-link>
      </f7-nav-left>
      <f7-nav-title>Repo List ({{reposTotal}})</f7-nav-title>
      <f7-nav-right>
        <f7-link class="searchbar-enable" data-searchbar=".searchbar-components" icon-ios="f7:search_strong" icon-md="material:search"></f7-link>
      </f7-nav-right>
      <f7-searchbar
        class="searchbar-components"
        search-container=".components-list"
        expandable
        @searchbar:search="handleSearch"
      ></f7-searchbar>
    </f7-navbar>

    <f7-list class="searchbar-hide-on-search" v-if="runningFeed.length">
      <f7-list-item
        v-for="item in runningFeed"
        :title="item.full_name"
        :link="`/log?${stringify({ owner: item.owner, repo: item.name, build: item.number })}`"
        :key="item.full_name + ':' + item.number"
      >
        <f7-icon slot="media" icon="icon-f7"></f7-icon>
      </f7-list-item>
    </f7-list>

    <f7-block-title class="searchbar-found" v-show="reposTotal">Repositories</f7-block-title>
    <f7-list class="components-list searchbar-found" accordion-list>
      <f7-list-item
        v-for="(list, owner) in filteredRepos"
        :key='owner'
        v-if="list.length"
        :title="owner"
        :badge="list.length"
        accordion-item
        :accordion-item-opened="!!searchValue"
      >
        <f7-accordion-content>
          <f7-list>
            <f7-list-item
              v-for="repo in list"
              :key='repo.id'
              :link="`/build?${stringify({ owner, repo: repo.name })}`"
              :title="repo.name"
            >
              <f7-icon slot="media" icon="icon-f7"></f7-icon>
            </f7-list-item>
          </f7-list>
        </f7-accordion-content>
      </f7-list-item>
    </f7-list>

    <f7-list class="searchbar-not-found">
      <f7-list-item title="Nothing found"></f7-list-item>
    </f7-list>
    <p v-show="!reposTotal" class="noData">No data.</p>
    <p class="version">{{version}}</p>
  </f7-page>
</template>
<script>
import _ from 'lodash'
import qs from 'qs'
import { getUserRepos } from '@/api/repo'
import { getUserFeed } from '@/api/user'

export default {
  name: 'home',
  data () {
    return {
      searchValue: null,
      feed: [],
      isLoading: false,
      fetchInterval: null,
      activeNames: ['build-queue'],
      rawRepos: [],
      repos: {},
      reposTotal: 0,
      version: process.env.VUE_APP_VERSION
    }
  },
  computed: {
    runningFeed: function () {
      return _.sortBy(this.feed.filter(item => {
        if (['pending', 'running'].includes(item.status)) {
          return true
        } else {
          return false
        }
      }), 'started_at')
    },
    filteredRepos () {
      return _.mapValues(this.repos, list => list)
    }
  },
  methods: {
    stringify: qs.stringify,
    handleSearch (searchbar, query) {
      this.searchValue = query
    },
    combineFeed (repos, feed) {
      for (const owner in repos) {
        const ownerRepos = repos[owner]
        const ownerFeed = feed.filter(item => item.owner === owner)
        for (const feed of ownerFeed) {
          for (const repo of ownerRepos) {
            if (repo.name === feed.name) {
              repo.latest_status = feed.status
              repo.latest_finished = feed.finished_at
              repo.latest_started = feed.started_at
              break
            }
          }
        }
        this.repos = _.cloneDeep(repos)
      }
    },
    fetchRepos: async function (query = { all: true }, needLoading = true) {
      if (needLoading === true) {
        this.isLoading = true
      }
      this.rawRepos = await getUserRepos(query)
      const repos = this.rawRepos.filter(item => item.active === true)
      this.reposTotal = repos.length
      this.repos = _.groupBy(repos, 'owner')
      this.feed = await this.fetchUserFeed()
      this.combineFeed(this.repos, this.feed)
      const $this = this
      _.debounce(() => {
        $this.isLoading = false
      }, 500)()
    },
    fetchUserFeed: async function () {
      const feed = await getUserFeed()
      return feed
    },
    async handleLoadMore (e, done) {
      await this.fetchRepos()
      done()
    }
  },
  mounted: function () {
    _.debounce(this.fetchRepos, 500)()
  }
}
</script>
<style lang="less" scoped>
.home {
  .version {
    text-align: center;
    color: #BDC6D2;
    font-size: 14px;
    position: fixed;
    bottom: 0;
    width: 100%;
    z-index: -1;
  }
}
</style>
